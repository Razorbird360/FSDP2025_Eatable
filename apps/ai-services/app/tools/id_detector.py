from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import numpy as np
import torch
from ultralytics import YOLO

CONF_THRES = 0.8
ASPECT_MIN = 1.25
ASPECT_MAX = 2.1
MIN_AREA_RATIO = 0.13
MAX_FRAME_WIDTH = 1280


@dataclass
class FrameDetection:
    bbox: Optional[Tuple[int, int, int, int]]
    confidence: float
    area_ratio: float
    valid_boxes: List[Tuple[int, int, int, int, float, float]]
    too_small: bool
    frame_width: int
    frame_height: int


def _resolve_model_path() -> Path:
    env_path = os.getenv("AI_MODEL_PATH")
    if env_path:
        return Path(env_path).expanduser().resolve()

    base_dir = Path(__file__).resolve().parents[2]  # apps/ai-services
    candidates = [
        base_dir / "models" / "card.pt",
        base_dir / "card.pt",
        base_dir / "yolov8_small.pt",
        base_dir.parent.parent / "models" / "card.pt",
        base_dir.parent.parent / "card.pt",
    ]
    for path in candidates:
        if path.exists():
            return path

    return candidates[0]


def _resolve_device() -> str:
    env_device = os.getenv("AI_DEVICE")
    if env_device:
        return env_device
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


MODEL_PATH = _resolve_model_path()
if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"YOLO model not found at {MODEL_PATH}. Set AI_MODEL_PATH to your weights."
    )

DEVICE = _resolve_device()
MODEL = YOLO(str(MODEL_PATH)).to(DEVICE)


def _resize_frame(frame: np.ndarray) -> np.ndarray:
    height, width = frame.shape[:2]
    if width <= MAX_FRAME_WIDTH:
        return frame
    scale = MAX_FRAME_WIDTH / width
    resized_height = int(height * scale)
    return cv2.resize(frame, (MAX_FRAME_WIDTH, resized_height))


def process_frame(frame: np.ndarray) -> tuple[FrameDetection, np.ndarray]:
    frame = _resize_frame(frame)
    height, width = frame.shape[:2]
    frame_area = max(width * height, 1)

    valid_boxes: List[Tuple[int, int, int, int, float, float]] = []
    too_small = False
    best_conf = 0.0
    best_area_ratio = 0.0
    best_box: Optional[Tuple[int, int, int, int]] = None

    results = MODEL(frame, conf=CONF_THRES, verbose=False)
    if results and results[0].boxes is not None:
        for box in results[0].boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0])

            box_width = x2 - x1
            box_height = y2 - y1
            if box_width <= 0 or box_height <= 0:
                continue

            area_ratio = (box_width * box_height) / frame_area
            if conf > best_conf:
                best_conf = conf
                best_area_ratio = area_ratio
                best_box = (x1, y1, x2, y2)

            aspect_ratio = box_width / box_height
            if not (ASPECT_MIN <= aspect_ratio <= ASPECT_MAX):
                continue
            if area_ratio < MIN_AREA_RATIO:
                too_small = True
                continue

            valid_boxes.append((x1, y1, x2, y2, conf, area_ratio))

    if valid_boxes:
        best_valid = max(valid_boxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
        bbox = best_valid[:4]
        confidence = best_valid[4]
        area_ratio = best_valid[5]
    else:
        bbox = best_box
        confidence = best_conf
        area_ratio = best_area_ratio

    return FrameDetection(
        bbox=bbox,
        confidence=confidence,
        area_ratio=area_ratio,
        valid_boxes=valid_boxes,
        too_small=too_small,
        frame_width=width,
        frame_height=height,
    ), frame
