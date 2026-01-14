from __future__ import annotations

import base64
import time
from collections import deque
from dataclasses import dataclass
from typing import Optional, Tuple

import cv2
import numpy as np

from app.tools.id_detector import FrameDetection, MIN_AREA_RATIO


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


class VerificationState:
    def __init__(
        self,
        window_size: int = 4,
        min_hits: int = 2,
        lock_delay: float = 0.6,
        pad_ratio: float = 0.12,
    ) -> None:
        self.window_size = window_size
        self.min_hits = min_hits
        self.lock_delay = lock_delay
        self.pad_ratio = pad_ratio
        self.reset()

    def reset(self) -> None:
        self.state = "SEARCHING"
        self.recent_hits = deque(maxlen=self.window_size)
        self.lock_start_time: Optional[float] = None
        self.locked_payload: Optional[VerificationPayload] = None

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
                    crop = self._encode_crop(frame, bbox)
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

        crop = frame[cy1:cy2, cx1:cx2]
        if crop.size == 0:
            return ""
        success, encoded = cv2.imencode(".jpg", crop, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
        if not success:
            return ""
        encoded_bytes = base64.b64encode(encoded.tobytes()).decode("ascii")
        return f"data:image/jpeg;base64,{encoded_bytes}"
