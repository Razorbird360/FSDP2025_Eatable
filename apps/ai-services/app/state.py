from __future__ import annotations

import base64
import os
import time
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple

import cv2
import numpy as np

# Debug: save images to disk for inspection
DEBUG_SAVE_IMAGES = os.getenv("DEBUG_SAVE_IMAGES", "1") == "1"
# Default to apps/ai-services/debug_output/ within the repo
_DEFAULT_DEBUG_DIR = Path(__file__).resolve().parents[1] / "debug_output"
DEBUG_OUTPUT_DIR = Path(os.getenv("DEBUG_OUTPUT_DIR", str(_DEFAULT_DEBUG_DIR)))

from app.tools.face_validation import (
    FACE_MATCH_THRESHOLD,
    LIVE_FACE_CONF_THRES,
    cosine_similarity,
    crop_face_from_bbox,
    detect_faces_yolo,
    extract_card_face,
    get_best_face,
    get_face_model,
    get_insightface_app,
    normalize_embedding,
    resize_frame,
)
from app.tools.id_detector import FrameDetection, MIN_AREA_RATIO


def _debug_save_image(name: str, image: Optional[np.ndarray]) -> None:
    """Save image to debug directory for inspection."""
    if not DEBUG_SAVE_IMAGES or image is None or image.size == 0:
        return
    try:
        DEBUG_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = int(time.time() * 1000)
        path = DEBUG_OUTPUT_DIR / f"{name}_{timestamp}.jpg"
        cv2.imwrite(str(path), image)
        print(f"[DEBUG] Saved {name} to {path}")
    except Exception as e:
        print(f"[DEBUG] Failed to save {name}: {e}")


@dataclass
class VerificationPayload:
    state: str
    bbox: Optional[Tuple[int, int, int, int]]
    confidence: float
    area_ratio: float
    frame_width: int
    frame_height: int
    too_small: bool
    crop: Optional[str] = None
    face_crop: Optional[str] = None
    face_bbox: Optional[Tuple[float, float, float, float]] = None
    face_similarity: Optional[float] = None
    face_detected: bool = False
    matched: bool = False


class VerificationState:
    def __init__(
        self,
        window_size: int = 4,
        min_hits: int = 2,
        lock_delay: float = 0.6,
        pad_ratio: float = 0.12,
        face_window_size: int = 6,
        face_min_hits: int = 1,
        face_stillness_sec: float = 3.0,
        face_grace_sec: float = 3.0,
        face_stillness_pixels: float = 12.0,
    ) -> None:
        self.window_size = window_size
        self.min_hits = min_hits
        self.lock_delay = lock_delay
        self.pad_ratio = pad_ratio
        self.face_window_size = face_window_size
        self.face_min_hits = face_min_hits
        self.face_stillness_sec = face_stillness_sec
        self.face_stillness_pixels = face_stillness_pixels
        self.face_grace_sec = face_grace_sec
        try:
            get_face_model()
            get_insightface_app()
        except Exception:
            pass
        self.reset()

    def update_face(self, frame: np.ndarray) -> VerificationPayload:
        frame = resize_frame(frame)
        height, width = frame.shape[:2]
        face_model = get_face_model()
        faces = detect_faces_yolo(frame, face_model, conf_threshold=LIVE_FACE_CONF_THRES)
        face_detected = bool(faces)

        now = time.time()
        matched = False
        similarity = None
        confidence = 0.0
        bbox = None
        area_ratio = 0.0

        # Normalized face bbox for frontend overlay (0-1 range)
        normalized_face_bbox: Optional[Tuple[float, float, float, float]] = None

        if faces:
            best_face = max(faces, key=lambda f: (f["score"], f["area_ratio"]))
            confidence = float(best_face["score"])
            area_ratio = float(best_face["area_ratio"])
            x1, y1, x2, y2 = best_face["bbox"]
            bbox = (int(round(x1)), int(round(y1)), int(round(x2)), int(round(y2)))
            center = ((x1 + x2) / 2.0, (y1 + y2) / 2.0)

            # Compute normalized face bbox for frontend overlay
            normalized_face_bbox = (
                float(x1) / float(width),
                float(y1) / float(height),
                float(x2) / float(width),
                float(y2) / float(height),
            )

            if self.face_validation_start is None:
                self.face_validation_start = now

            if now - self.face_validation_start < self.face_grace_sec:
                return VerificationPayload(
                    state="FACE_VALIDATION",
                    bbox=bbox,
                    confidence=confidence,
                    area_ratio=area_ratio,
                    frame_width=width,
                    frame_height=height,
                    too_small=False,
                    face_similarity=None,
                    face_detected=face_detected,
                    matched=False,
                    face_bbox=normalized_face_bbox,
                    face_crop=None,
                )

            if self.ref_embedding is None and not self.ref_embedding_attempted and self.card_face_crop is not None:
                self.ref_embedding_attempted = True
                app = get_insightface_app()
                ref_face = get_best_face(app, self.card_face_crop)
                if ref_face is not None:
                    self.ref_embedding = normalize_embedding(ref_face.embedding)
                    print(f"[DEBUG] Extracted ref embedding from card face crop")

            # Track face stillness for match confirmation
            if self.face_last_center is None:
                self.face_last_center = center
                self.face_still_start = now
            else:
                dist = np.hypot(center[0] - self.face_last_center[0], center[1] - self.face_last_center[1])
                if dist <= self.face_stillness_pixels:
                    if self.face_still_start is None:
                        self.face_still_start = now
                else:
                    self.face_still_start = now
                self.face_last_center = center

            still_enough = False
            if self.face_still_start is not None and now - self.face_still_start >= self.face_stillness_sec:
                still_enough = True

            self.face_hits.append(still_enough)
            stable = sum(self.face_hits) >= self.face_min_hits

            # Compute similarity on every frame (for real-time display)
            if self.ref_embedding is not None:
                crop = crop_face_from_bbox(frame, np.array([x1, y1, x2, y2], dtype=np.float32), 0.15)
                if crop is None or crop.size == 0:
                    crop = frame[max(0, int(y1)) : min(height, int(y2)), max(0, int(x1)) : min(width, int(x2))]
                app = get_insightface_app()
                face = get_best_face(app, crop) if crop is not None else None
                if face is not None:
                    emb = normalize_embedding(face.embedding)
                    similarity = cosine_similarity(emb, self.ref_embedding)
                    # Only confirm match when face has been stable for required duration
                    if stable and similarity >= FACE_MATCH_THRESHOLD:
                        matched = True
                        self.state = "LOCKED"
                        print(f"[DEBUG] Face matched! Similarity: {similarity:.3f}")
        else:
            self.face_hits.clear()
            self.face_last_center = None
            self.face_still_start = None
            self.face_validation_start = None
            self.ref_embedding_attempted = False

        return VerificationPayload(
            state="FACE_VALIDATION",
            bbox=bbox,
            confidence=confidence,
            area_ratio=area_ratio,
            frame_width=width,
            frame_height=height,
            too_small=False,
            face_similarity=similarity,
            face_detected=face_detected,
            matched=matched,
            face_bbox=normalized_face_bbox,
            face_crop=None,
        )

    def reset(self) -> None:
        self.state = "SEARCHING"
        self.recent_hits = deque(maxlen=self.window_size)
        self.lock_start_time: Optional[float] = None
        self.locked_payload: Optional[VerificationPayload] = None
        self.card_crop: Optional[np.ndarray] = None
        self.card_face_crop: Optional[np.ndarray] = None
        self.card_face_bbox: Optional[Tuple[float, float, float, float]] = None
        self.ref_embedding: Optional[np.ndarray] = None
        self.face_hits = deque(maxlen=self.face_window_size)
        self.face_still_start: Optional[float] = None
        self.face_last_center: Optional[Tuple[float, float]] = None
        self.face_validation_start: Optional[float] = None
        self.ref_embedding_attempted = False

    def update(self, detection: FrameDetection, frame: np.ndarray) -> VerificationPayload:
        if self.state == "LOCKED" and self.locked_payload:
            return self.locked_payload

        has_valid = bool(detection.valid_boxes)
        self.recent_hits.append(has_valid)
        stable = sum(self.recent_hits) >= self.min_hits
        now = time.time()

        if self.state == "SEARCHING":
            if stable and has_valid:
                self.state = "LOCKING"
                self.lock_start_time = now
        elif self.state == "LOCKING":
            if stable and has_valid:
                if self.lock_start_time and now - self.lock_start_time >= self.lock_delay:
                    best_valid = max(
                        detection.valid_boxes,
                        key=lambda b: (b[2] - b[0]) * (b[3] - b[1]),
                    )
                    bbox = best_valid[:4]
                    confidence = best_valid[4]
                    area_ratio = best_valid[5]
                    card_crop = self._crop_frame(frame, bbox)
                    crop = self._encode_image(card_crop)
                    self.card_crop = card_crop

                    # Debug: save card crop to disk
                    _debug_save_image("card_crop", card_crop)

                    face_crop, face_bbox, ref_embedding = extract_card_face(card_crop)
                    self.card_face_crop = face_crop
                    self.card_face_bbox = face_bbox

                    # Debug: save face crop to disk
                    _debug_save_image("face_crop", face_crop)
                    if ref_embedding is not None:
                        self.ref_embedding = ref_embedding
                        print(f"[DEBUG] Card face embedding extracted successfully")
                    else:
                        print(f"[DEBUG] No embedding from card face extraction")
                    self.ref_embedding_attempted = False

                    normalized_face_bbox = None
                    if face_bbox and card_crop is not None and card_crop.size > 0:
                        crop_height, crop_width = card_crop.shape[:2]
                        normalized_face_bbox = (
                            float(face_bbox[0]) / float(crop_width),
                            float(face_bbox[1]) / float(crop_height),
                            float(face_bbox[2]) / float(crop_width),
                            float(face_bbox[3]) / float(crop_height),
                        )

                    self.state = "LOCKED"
                    self.locked_payload = VerificationPayload(
                        state=self.state,
                        bbox=bbox,
                        confidence=confidence,
                        area_ratio=area_ratio,
                        frame_width=detection.frame_width,
                        frame_height=detection.frame_height,
                        too_small=area_ratio < MIN_AREA_RATIO,
                        crop=crop,
                        face_crop=self._encode_image(face_crop),
                        face_bbox=normalized_face_bbox,
                    )
                    return self.locked_payload
            else:
                self.state = "SEARCHING"
                self.lock_start_time = None

        return VerificationPayload(
            state=self.state,
            bbox=detection.bbox,
            confidence=detection.confidence,
            area_ratio=detection.area_ratio,
            frame_width=detection.frame_width,
            frame_height=detection.frame_height,
            too_small=detection.too_small,
        )

    def _encode_crop(self, frame: np.ndarray, bbox: Tuple[int, int, int, int]) -> str:
        crop = self._crop_frame(frame, bbox)
        return self._encode_image(crop)

    def _crop_frame(self, frame: np.ndarray, bbox: Tuple[int, int, int, int]) -> np.ndarray:
        x1, y1, x2, y2 = bbox
        height, width = frame.shape[:2]
        box_width = max(x2 - x1, 1)
        box_height = max(y2 - y1, 1)

        pad_w = int(box_width * self.pad_ratio)
        pad_h = int(box_height * self.pad_ratio)

        cx1 = max(0, x1 - pad_w)
        cy1 = max(0, y1 - pad_h)
        cx2 = min(width, x2 + pad_w)
        cy2 = min(height, y2 + pad_h)

        return frame[cy1:cy2, cx1:cx2]

    def _encode_image(self, frame: Optional[np.ndarray]) -> str:
        if frame is None or frame.size == 0:
            return ""
        success, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
        if not success:
            return ""
        encoded_bytes = base64.b64encode(encoded.tobytes()).decode("ascii")
        return f"data:image/jpeg;base64,{encoded_bytes}"
