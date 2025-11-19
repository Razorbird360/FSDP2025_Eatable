import base64
from dataclasses import dataclass
from typing import List, Optional, Tuple

import cv2
import numpy as np

TARGET_RATIO = 1.75
READY_COVERAGE = 0.7
MIN_BRIGHTNESS = 65
MIN_SHARPNESS = 80
MAX_TILT_PIXELS = 15


@dataclass
class Detection:
    quad: np.ndarray
    coverage: float
    brightness: float
    sharpness: float
    feedback: List[str]
    ready: bool
    card_crop: Optional[np.ndarray] = None


def order_points(pts: np.ndarray) -> np.ndarray:
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def perspective_crop(image: np.ndarray, quad: np.ndarray, width: int = 700) -> np.ndarray:
    rect = order_points(quad)
    height = int(width / TARGET_RATIO)
    dst = np.array(
        [[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]],
        dtype="float32",
    )
    M = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(image, M, (width, height))


def analyze_orientation(rect: np.ndarray) -> Optional[str]:
    tl, tr, br, bl = rect
    slope = tr[1] - tl[1]
    if slope > MAX_TILT_PIXELS:
        return "Lower the right edge"
    if slope < -MAX_TILT_PIXELS:
        return "Lower the left edge"
    left_height = np.linalg.norm(bl - tl)
    right_height = np.linalg.norm(br - tr)
    diff = right_height - left_height
    if diff > 20:
        return "Tilt card back"
    if diff < -20:
        return "Tilt card forward"
    return None


def detect_id_card(image: np.ndarray) -> Optional[Detection]:
    frame = image.copy()
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 50, 150)
    kernel = np.ones((3, 3), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=1)
    edges = cv2.erode(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    frame_area = frame.shape[0] * frame.shape[1]
    best_detection = None
    best_score = 0.0

    for cnt in contours:
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
        if len(approx) != 4:
            continue
        area = cv2.contourArea(approx)
        if area < 0.12 * frame_area:
            continue
        quad = approx.reshape(4, 2)
        rect = order_points(quad)
        width = np.linalg.norm(rect[1] - rect[0])
        height = np.linalg.norm(rect[3] - rect[0])
        if height == 0:
            continue
        ratio = width / height
        inv_ratio = height / width
        if not (1.3 <= ratio <= 2.2 or 1.3 <= inv_ratio <= 2.2):
            continue

        coverage = area / frame_area
        crop = perspective_crop(gray, quad)
        brightness = float(np.mean(crop))
        sharpness = float(cv2.Laplacian(crop, cv2.CV_64F).var())
        feedback: List[str] = []
        ready = True
        if coverage < READY_COVERAGE:
            ready = False
            feedback.append("Move card closer to the camera")
        direction = analyze_orientation(rect)
        if direction:
            ready = False
            feedback.append(direction)
        if brightness < MIN_BRIGHTNESS:
            ready = False
            feedback.append("Increase lighting")
        if sharpness < MIN_SHARPNESS:
            ready = False
            feedback.append("Hold steady - image is blurry")
        if not feedback:
            feedback.append("Card detected and aligned")

        score = coverage if ready else coverage * 0.8
        if score > best_score:
            best_score = score
            best_detection = Detection(
                quad=quad,
                coverage=coverage,
                brightness=brightness,
                sharpness=sharpness,
                feedback=feedback,
                ready=ready,
                card_crop=crop,
            )

    return best_detection


def serialize_detection(detection: Detection) -> dict:
    card_image = None
    if detection.card_crop is not None:
        _, buffer = cv2.imencode('.jpg', detection.card_crop)
        card_image = base64.b64encode(buffer).decode('utf-8')

    return {
        "ready": detection.ready,
        "feedback": detection.feedback,
        "coverage": detection.coverage,
        "brightness": detection.brightness,
        "sharpness": detection.sharpness,
        "cardImage": card_image,
    }
