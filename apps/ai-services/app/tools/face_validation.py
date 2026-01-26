from __future__ import annotations

import math
import os
from functools import lru_cache
from pathlib import Path
from typing import Optional, Tuple

import cv2
import numpy as np
import onnxruntime as ort
import torch
from insightface.app import FaceAnalysis
from ultralytics import YOLO

LIVE_FACE_CONF_THRES = 0.5
STILLNESS_SEC = 3.0
STILLNESS_PIXELS = 12
FACE_MATCH_THRESHOLD = 0.35

PADDING_RATIO = 0.15
MIN_FACE_SIZE = 60
FACE_CONF_THRESHOLD = 0.3
FACE_MIN_AREA_RATIO = 0.005
FACE_MAX_AREA_RATIO = 0.25
FACE_ROTATION_STEP_DEG = 45
FACE_ORIENTATION_STEP_DEG = 45
FACE_ANCHORS_PORTRAIT = ((0.33, 0.33),)
FACE_ANCHORS_LANDSCAPE = ((0.22, 0.5), (0.3, 0.5))
FACE_TOP_SCORE_MIN = 0.35
FACE_SCORE_GATE = 0.9
MAX_FRAME_WIDTH = 1280


def _resolve_face_model_path() -> Path:
    env_path = os.getenv("FACE_MODEL_PATH")
    if env_path:
        return Path(env_path).expanduser().resolve()

    base_dir = Path(__file__).resolve().parents[2]
    candidates = [
        base_dir / "models" / "face.pt",
        base_dir / "face.pt",
        base_dir.parent.parent / "models" / "face.pt",
    ]
    for path in candidates:
        if path.exists():
            return path
    return candidates[0]


def _resolve_device() -> str:
    env_device = os.getenv("FACE_DEVICE") or os.getenv("AI_DEVICE")
    if env_device:
        return env_device
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def _select_providers() -> list[str]:
    available = ort.get_available_providers()
    preferred = ["CUDAExecutionProvider", "CoreMLExecutionProvider", "CPUExecutionProvider"]
    providers = [provider for provider in preferred if provider in available]
    return providers or available


def _load_face_model() -> YOLO:
    model_path = _resolve_face_model_path()
    if not model_path.exists():
        raise FileNotFoundError(
            f"Face model not found at {model_path}. Set FACE_MODEL_PATH to your weights."
        )
    device = _resolve_device()
    return YOLO(str(model_path)).to(device)


def _load_insightface() -> FaceAnalysis:
    providers = _select_providers()
    use_cuda = "CUDAExecutionProvider" in providers
    app = FaceAnalysis(name="buffalo_l", providers=providers)
    app.prepare(ctx_id=0 if use_cuda else -1, det_size=(640, 640), det_thresh=0.2)
    return app


@lru_cache(maxsize=1)
def get_face_model() -> YOLO:
    return _load_face_model()


@lru_cache(maxsize=1)
def get_insightface_app() -> FaceAnalysis:
    return _load_insightface()


def resize_frame(frame: np.ndarray) -> np.ndarray:
    height, width = frame.shape[:2]
    if width <= MAX_FRAME_WIDTH:
        return frame
    scale = MAX_FRAME_WIDTH / width
    resized_height = int(height * scale)
    return cv2.resize(frame, (MAX_FRAME_WIDTH, resized_height))


def crop_face_from_bbox(image: np.ndarray, bbox: np.ndarray, padding_ratio: float) -> Optional[np.ndarray]:
    x1, y1, x2, y2 = bbox
    width = x2 - x1
    height = y2 - y1
    if width <= 1 or height <= 1:
        return None

    pad_w = width * padding_ratio
    pad_h = height * padding_ratio
    pad_top = pad_h * 1.25
    pad_bottom = pad_h * 0.85

    x1c = max(0, int(round(x1 - pad_w)))
    y1c = max(0, int(round(y1 - pad_top)))
    x2c = min(image.shape[1], int(round(x2 + pad_w)))
    y2c = min(image.shape[0], int(round(y2 + pad_bottom)))

    if x2c <= x1c or y2c <= y1c:
        return None
    crop = image[y1c:y2c, x1c:x2c]
    return crop if crop.size > 0 else None


def rotate_image(image: np.ndarray, angle: float) -> np.ndarray:
    height, width = image.shape[:2]
    center = (width / 2, height / 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    cos = abs(matrix[0, 0])
    sin = abs(matrix[0, 1])
    new_width = int(height * sin + width * cos)
    new_height = int(height * cos + width * sin)
    matrix[0, 2] += (new_width / 2) - center[0]
    matrix[1, 2] += (new_height / 2) - center[1]
    return cv2.warpAffine(
        image,
        matrix,
        (new_width, new_height),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0),
    )


def rotate_image_quadrant(image: np.ndarray, angle: float) -> np.ndarray:
    angle = angle % 360
    if angle == 0:
        return image
    if angle == 90:
        return cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
    if angle == 180:
        return cv2.rotate(image, cv2.ROTATE_180)
    if angle == 270:
        return cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return rotate_image(image, angle)


def content_bbox(image: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
    if image is None or image.size == 0:
        return None
    mask = (image > 10).any(axis=2)
    if not mask.any():
        return None
    ys, xs = np.where(mask)
    x1 = int(xs.min())
    y1 = int(ys.min())
    x2 = int(xs.max()) + 1
    y2 = int(ys.max()) + 1
    return x1, y1, x2, y2


def _anchors_for_content(width: int, height: int) -> tuple[tuple[float, float], ...]:
    if width <= 0 or height <= 0:
        return FACE_ANCHORS_PORTRAIT
    if width >= height:
        return FACE_ANCHORS_LANDSCAPE
    return FACE_ANCHORS_PORTRAIT


def detect_faces_yolo(
    image: np.ndarray,
    face_model: YOLO,
    conf_threshold: float = FACE_CONF_THRESHOLD,
) -> list[dict]:
    results = face_model(image, conf=conf_threshold, verbose=False)
    if not results:
        return []
    boxes = results[0].boxes if results else None
    if boxes is None:
        return []

    height, width = image.shape[:2]
    faces: list[dict] = []
    for box in boxes:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        score = float(box.conf[0]) if box.conf is not None else 0.0
        area = max(0.0, (x2 - x1) * (y2 - y1))
        area_ratio = area / float(max(width * height, 1))
        if area_ratio < FACE_MIN_AREA_RATIO or area_ratio > FACE_MAX_AREA_RATIO:
            continue
        faces.append(
            {
                "bbox": np.array([x1, y1, x2, y2], dtype=np.float32),
                "score": score,
                "area_ratio": area_ratio,
            }
        )
    return faces


def face_upright_metrics(bbox: np.ndarray) -> tuple[float, bool]:
    x1, y1, x2, y2 = bbox
    width = max(float(x2 - x1), 1.0)
    height = max(float(y2 - y1), 1.0)
    aspect = height / width
    upright = aspect >= 1.05
    return aspect, upright


def normalize_face_orientation(face_image: np.ndarray, face_model: YOLO) -> tuple[np.ndarray, dict]:
    best = None
    best_key = None
    for angle in range(0, 360, FACE_ORIENTATION_STEP_DEG):
        rotated = rotate_image_quadrant(face_image, angle)
        faces = detect_faces_yolo(rotated, face_model)
        if not faces:
            continue
        face = max(faces, key=lambda f: (f["score"], f["area_ratio"]))
        aspect, upright = face_upright_metrics(face["bbox"])
        height, width = rotated.shape[:2]
        x1, y1, x2, y2 = face["bbox"]
        cy = (y1 + y2) / 2.0
        center_y_norm = cy / max(float(height), 1.0)
        upper_score = 1.0 - center_y_norm
        key = (upright, upper_score, aspect, face["score"], face["area_ratio"])
        if best_key is None or key > best_key:
            best_key = key
            best = {
                "angle": angle,
                "image": rotated,
                "face": face,
                "aspect": aspect,
                "upright": upright,
                "upper_score": upper_score,
            }
    if best is None:
        return face_image, {"angle": 0, "upright": False, "aspect": 0.0}
    return best["image"], {
        "angle": best["angle"],
        "upright": best["upright"],
        "aspect": best["aspect"],
        "score": float(best["face"]["score"]),
    }


def find_best_rotation_yolo(image: np.ndarray, face_model: YOLO) -> tuple[dict | None, str | None]:
    best = None
    errors: dict[str, int] = {}
    best_key = None

    candidates: list[dict] = []
    for angle in range(0, 360, FACE_ROTATION_STEP_DEG):
        rotated = rotate_image(image, angle)
        content = content_bbox(rotated)
        if content is None:
            errors["no content"] = errors.get("no content", 0) + 1
            continue
        cx1, cy1, cx2, cy2 = content
        content_w = max(cx2 - cx1, 1)
        content_h = max(cy2 - cy1, 1)
        anchors = _anchors_for_content(content_w, content_h)

        faces = detect_faces_yolo(rotated, face_model)
        if not faces:
            errors["no faces"] = errors.get("no faces", 0) + 1
            continue
        face = max(faces, key=lambda f: (f["score"], f["area_ratio"]))
        x1, y1, x2, y2 = face["bbox"]
        face_w = max(float(x2 - x1), 1.0)
        face_h = max(float(y2 - y1), 1.0)
        aspect = face_h / face_w
        upright = aspect >= 1.05
        cx = ((x1 + x2) / 2.0 - cx1) / float(content_w)
        cy = ((y1 + y2) / 2.0 - cy1) / float(content_h)
        anchor_scores = [1.0 - math.hypot(cx - ax, cy - ay) for ax, ay in anchors]
        anchor_score = max(anchor_scores) if anchor_scores else 0.0
        top_score = 1.0 - cy
        angle_off = angle % 90
        angle_off = min(angle_off, 90 - angle_off)
        angle_bonus = 1.0 - (angle_off / 45.0)
        candidates.append(
            {
                "angle": angle,
                "image": rotated,
                "face": face,
                "anchor_score": anchor_score,
                "top_score": top_score,
                "angle_bonus": angle_bonus,
                "aspect": aspect,
                "upright": upright,
            }
        )

    if not candidates:
        summary = ", ".join(f"{key}:{count}" for key, count in sorted(errors.items()))
        detail = f" ({summary})" if summary else ""
        return None, f"no valid face across rotations{detail}"

    max_score = max(c["face"]["score"] for c in candidates)
    score_gate = max_score * FACE_SCORE_GATE
    filtered = [c for c in candidates if c["face"]["score"] >= score_gate]
    if not filtered:
        filtered = candidates

    top_filtered = [c for c in filtered if c["top_score"] >= FACE_TOP_SCORE_MIN]
    if top_filtered:
        filtered = top_filtered

    upright_filtered = [c for c in filtered if c["upright"]]
    if upright_filtered:
        filtered = upright_filtered

    for candidate in filtered:
        angle = candidate["angle"]
        rotated = candidate["image"]
        face = candidate["face"]
        anchor_score = candidate["anchor_score"]
        top_score = candidate["top_score"]
        angle_bonus = candidate["angle_bonus"]
        key = (
            anchor_score,
            face["score"],
            face["area_ratio"],
            top_score,
            angle_bonus,
        )
        if best_key is None or key > best_key:
            best_key = key
            best = {
                "angle": angle,
                "image": rotated,
                "face": face,
                "anchor_score": anchor_score,
                "top_score": top_score,
                "angle_bonus": angle_bonus,
                "aspect": candidate["aspect"],
                "upright": candidate["upright"],
            }
    return best, None


def extract_upright_face(card_image: np.ndarray, face_model: YOLO):
    if card_image is None or card_image.size == 0:
        return None, None, "empty card image"

    best, error = find_best_rotation_yolo(card_image, face_model)
    if error or best is None:
        return None, None, error or "no valid face"

    rotation_angle = float(best["angle"])
    face = best["face"]
    rotated = best["image"]

    crop = crop_face_from_bbox(rotated, face["bbox"], PADDING_RATIO)
    if crop is None or crop.size == 0:
        return None, None, "face crop is empty"
    if crop.shape[0] < MIN_FACE_SIZE or crop.shape[1] < MIN_FACE_SIZE:
        return None, None, f"face crop too small ({crop.shape[1]}x{crop.shape[0]})"

    meta = {
        "rotation": rotation_angle,
        "confidence": float(face["score"]),
        "area_ratio": float(face["area_ratio"]),
        "bbox": [float(value) for value in face["bbox"]],
        "anchor_score": float(best.get("anchor_score", 0.0)),
        "top_score": float(best.get("top_score", 0.0)),
        "angle_bonus": float(best.get("angle_bonus", 0.0)),
        "aspect": float(best.get("aspect", 0.0)),
        "upright": bool(best.get("upright", False)),
    }
    return crop, meta, None


def normalize_embedding(embedding: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(embedding)
    return embedding if norm == 0 else embedding / norm


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b))


def pad_image(image: np.ndarray, ratio: float) -> np.ndarray:
    if ratio <= 0:
        return image
    pad_y = int(image.shape[0] * ratio)
    pad_x = int(image.shape[1] * ratio)
    return cv2.copyMakeBorder(
        image,
        pad_y,
        pad_y,
        pad_x,
        pad_x,
        cv2.BORDER_CONSTANT,
        value=(0, 0, 0),
    )


def get_best_face(app: FaceAnalysis, image: np.ndarray):
    if image is None or image.size == 0:
        return None
    min_side = min(image.shape[:2])
    resized = image
    if min_side < 256:
        scale = 256 / max(min_side, 1)
        resized = cv2.resize(image, (int(image.shape[1] * scale), int(image.shape[0] * scale)))

    for pad_ratio in (0.0, 0.25, 0.5):
        candidate = pad_image(resized, pad_ratio)
        faces = app.get(candidate)
        if faces:
            return max(
                faces,
                key=lambda f: (f.det_score, (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])),
            )
    return None


def extract_card_face(
    card_image: np.ndarray,
    extract_embedding: bool = True,
) -> tuple[Optional[np.ndarray], Optional[tuple[int, int, int, int]], Optional[np.ndarray]]:
    """Extract face from card image with rotation correction.

    Uses extract_upright_face to find the best rotation and return
    a properly oriented face crop along with the face embedding.

    Returns:
        tuple of (face_crop, bbox, embedding) where embedding is the normalized
        face embedding from InsightFace (if extract_embedding=True), or None if extraction failed.
    """
    if card_image is None or card_image.size == 0:
        return None, None, None

    face_model = get_face_model()
    face_crop = None
    bbox = None

    # Use extract_upright_face for rotation correction
    crop_result, meta, error = extract_upright_face(card_image, face_model)
    if error or crop_result is None:
        # Fallback: try direct detection without rotation
        faces = detect_faces_yolo(card_image, face_model)
        if not faces:
            return None, None, None

        best_face = max(faces, key=lambda f: (f["score"], f["area_ratio"]))
        bbox = tuple(int(round(value)) for value in best_face["bbox"])[:4]
        bbox = (bbox[0], bbox[1], bbox[2], bbox[3])
        face_crop = crop_face_from_bbox(card_image, best_face["bbox"], PADDING_RATIO)
        if face_crop is None or face_crop.size == 0:
            x1, y1, x2, y2 = bbox
            face_crop = card_image[
                max(0, y1) : min(card_image.shape[0], y2),
                max(0, x1) : min(card_image.shape[1], x2),
            ]
    else:
        face_crop = crop_result
        # Extract bbox from meta (this is in the rotated image coordinates)
        if meta and "bbox" in meta:
            bbox_list = meta["bbox"]
            bbox = (int(bbox_list[0]), int(bbox_list[1]), int(bbox_list[2]), int(bbox_list[3]))

    # Extract embedding from the face crop using InsightFace
    embedding = None
    if extract_embedding and face_crop is not None and face_crop.size > 0:
        try:
            app = get_insightface_app()
            insight_face = get_best_face(app, face_crop)
            if insight_face is not None:
                embedding = normalize_embedding(insight_face.embedding)
        except Exception as e:
            print(f"[extract_card_face] Failed to extract embedding: {e}")

    return face_crop, bbox, embedding
