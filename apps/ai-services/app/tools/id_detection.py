"""Realtime ID card detector for local webcam.

Usage:
    python app/tools/id_detection.py

Press `q` to exit the preview window.
"""
from __future__ import annotations

import cv2
import numpy as np
from dataclasses import dataclass
from typing import List, Optional, Tuple

TARGET_RATIO = 1.75  # width andd height for ID cards
READY_COVERAGE = 0.7
MAX_TILT_PIXELS = 15
MIN_BRIGHTNESS = 65
MIN_SHARPNESS = 80
WINDOW_NAME = "Eatable ID Detection"


@dataclass
class DetectionResult:
    quad: np.ndarray
    coverage: float
    brightness: float
    sharpness: float
    slope: float
    ready: bool
    feedback: List[str]


def order_points(pts: np.ndarray) -> np.ndarray:
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # top-left
    rect[2] = pts[np.argmax(s)]  # bottom-right

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right
    rect[3] = pts[np.argmax(diff)]  # bottom-left
    return rect


def four_point_transform(image: np.ndarray, pts: np.ndarray, width: int = 700) -> np.ndarray:
    rect = order_points(pts)
    height = int(width / TARGET_RATIO)

    dst = np.array(
        [
            [0, 0],
            [width - 1, 0],
            [width - 1, height - 1],
            [0, height - 1],
        ],
        dtype="float32",
    )

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (width, height))
    return warped


def evaluate_card(gray: np.ndarray, quad: np.ndarray) -> Tuple[float, float]:
    warped = four_point_transform(gray, quad)
    brightness = float(np.mean(warped))
    sharpness = float(cv2.Laplacian(warped, cv2.CV_64F).var())
    return brightness, sharpness


def analyze_orientation(rect: np.ndarray) -> Tuple[float, Optional[str]]:
    tl, tr, br, bl = rect
    slope = tr[1] - tl[1]

    direction = None
    if slope > MAX_TILT_PIXELS:
        direction = "Lower left edge"
    elif slope < -MAX_TILT_PIXELS:
        direction = "Lower right edge"
    else:
        # check vertical skew (card leaning away/toward)
        left_height = np.linalg.norm(bl - tl)
        right_height = np.linalg.norm(br - tr)
        height_diff = right_height - left_height
        if height_diff > 15:
            direction = "Tilt card back"
        elif height_diff < -15:
            direction = "Tilt card forward"
    return slope, direction


def detect_card(frame: np.ndarray) -> Optional[DetectionResult]:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 50, 150)
    edges = cv2.dilate(edges, None, iterations=1)
    edges = cv2.erode(edges, None, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    frame_area = frame.shape[0] * frame.shape[1]
    best = None
    best_score = 0.0

    for cnt in contours:
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
        if len(approx) != 4:
            continue

        area = cv2.contourArea(approx)
        if area < 0.1 * frame_area:
            continue

        rect = order_points(approx.reshape(4, 2))
        width = np.linalg.norm(rect[1] - rect[0])
        height = np.linalg.norm(rect[3] - rect[0])
        if height == 0:
            continue
        ratio = width / height
        inv_ratio = height / width

        if not (1.3 <= ratio <= 2.2 or 1.3 <= inv_ratio <= 2.2):
            continue

        coverage = area / frame_area
        brightness, sharpness = evaluate_card(gray, approx.reshape(4, 2))
        slope, direction = analyze_orientation(rect)

        feedback = []
        ready = True

        if coverage < READY_COVERAGE:
            ready = False
            feedback.append("Move card closer to fill the frame")
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
            best = DetectionResult(
                quad=approx.reshape(4, 2),
                coverage=coverage,
                brightness=brightness,
                sharpness=sharpness,
                slope=slope,
                ready=ready,
                feedback=feedback,
            )

    return best


def draw_feedback(frame: np.ndarray, detection: DetectionResult) -> None:
    overlay = frame.copy()
    pts = detection.quad.astype(int)
    cv2.polylines(overlay, [pts], True, (0, 255, 0) if detection.ready else (0, 165, 255), 2)
    alpha = 0.6
    cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)

    status_color = (0, 200, 0) if detection.ready else (0, 200, 255)
    status_text = "READY" if detection.ready else "Adjust card"
    cv2.putText(
        frame,
        status_text,
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.0,
        status_color,
        2,
        cv2.LINE_AA,
    )

    y = frame.shape[0] - 20 * len(detection.feedback) - 20
    for line in detection.feedback:
        cv2.putText(
            frame,
            line,
            (20, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )
        y += 22


def main() -> None:
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Unable to access webcam. Ensure a camera is connected.")

    cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            display = frame.copy()
            detection = detect_card(display)

            if detection:
                draw_feedback(display, detection)
            else:
                cv2.putText(
                    display,
                    "Align your ID card within the box",
                    (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (0, 215, 255),
                    2,
                    cv2.LINE_AA,
                )

            cv2.imshow(WINDOW_NAME, display)
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
