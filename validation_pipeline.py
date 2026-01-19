from __future__ import annotations

from collections import deque
import math
from pathlib import Path
import time

import cv2
import numpy as np
import onnxruntime as ort
from insightface.app import FaceAnalysis
from ultralytics import YOLO

# =======================
# CARD DETECTION CONFIG
# =======================
CARD_CONF_THRES = 0.8
ASPECT_MIN = 1.25
ASPECT_MAX = 2.1
MIN_AREA_RATIO = 0.12

TARGET_WIDTH = 1280
TARGET_HEIGHT = 720

WINDOW_SIZE = 4
MIN_HITS = 2

LOCK_DELAY = 0.6
PAD_RATIO = 0.05

OUTPUT_NAME = "locked_card.jpg"
FINAL_FACE_NAME = "final_face.jpg"

# =======================
# FACE VALIDATION CONFIG
# =======================
FACE_CONF_THRES = 0.5
STILLNESS_SEC = 0.6
STILLNESS_PIXELS = 12

# =======================
# FACE CROP CONFIG (INLINE)
# =======================
PADDING_RATIO = 0.15
LANDMARK_PADDING_RATIO = 0.12
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


# =======================
# HELPERS
# =======================

def crop_with_padding(frame: np.ndarray, box: tuple[int, int, int, int], pad_ratio: float) -> np.ndarray:
    x1, y1, x2, y2 = box
    h, w, _ = frame.shape

    bw = x2 - x1
    bh = y2 - y1

    pad_w = int(bw * pad_ratio)
    pad_h = int(bh * pad_ratio)

    cx1 = max(0, x1 - pad_w)
    cy1 = max(0, y1 - pad_h)
    cx2 = min(w, x2 + pad_w)
    cy2 = min(h, y2 + pad_h)

    return frame[cy1:cy2, cx1:cx2]


def crop_face_from_bbox(image: np.ndarray, bbox: np.ndarray, padding_ratio: float) -> np.ndarray | None:
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


def content_bbox(image: np.ndarray) -> tuple[int, int, int, int] | None:
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


def detect_faces_yolo(image: np.ndarray, face_model: YOLO) -> list[dict]:
    results = face_model(image, conf=FACE_CONF_THRESHOLD, verbose=False)
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


def init_insightface() -> FaceAnalysis:

    providers = ort.get_available_providers()
    use_cuda = "CUDAExecutionProvider" in providers
    app = FaceAnalysis(
        name="buffalo_l",
        providers=["CUDAExecutionProvider", "CPUExecutionProvider"] if use_cuda else ["CPUExecutionProvider"],
    )
    app.prepare(ctx_id=0 if use_cuda else -1, det_size=(640, 640), det_thresh=0.2)
    return app


def lock_card_and_extract_face(card_model: YOLO, face_model: YOLO) -> Path:
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise SystemExit("Cannot open webcam")

    recent_hits: deque[bool] = deque(maxlen=WINDOW_SIZE)
    prev_time = time.time()
    state = "SEARCHING"
    lock_start_time = None

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.resize(frame, (TARGET_WIDTH, TARGET_HEIGHT))
            h_frame, w_frame, _ = frame.shape
            frame_area = w_frame * h_frame

            valid_boxes: list[tuple[int, int, int, int, float]] = []
            too_small_detected = False

            best_conf = 0.0
            best_area_ratio = 0.0

            results = card_model(frame, conf=CARD_CONF_THRES, verbose=False)
            result = results[0] if results else None

            if result is not None and result.boxes is not None:
                for box in result.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])

                    w = x2 - x1
                    h = y2 - y1
                    if w <= 0 or h <= 0:
                        continue

                    aspect = w / h
                    area_ratio = (w * h) / frame_area

                    if conf > best_conf:
                        best_conf = conf
                        best_area_ratio = area_ratio

                    if not (ASPECT_MIN <= aspect <= ASPECT_MAX):
                        continue

                    if area_ratio < MIN_AREA_RATIO:
                        too_small_detected = True
                        continue

                    valid_boxes.append((x1, y1, x2, y2, conf))

            recent_hits.append(len(valid_boxes) > 0)
            stable_card = sum(recent_hits) >= MIN_HITS
            now = time.time()

            if state == "SEARCHING":
                if stable_card and valid_boxes:
                    state = "LOCKING"
                    lock_start_time = now

            elif state == "LOCKING":
                if stable_card and valid_boxes:
                    if lock_start_time is None:
                        lock_start_time = now
                    if now - lock_start_time >= LOCK_DELAY:
                        best_box = max(
                            valid_boxes,
                            key=lambda b: (b[2] - b[0]) * (b[3] - b[1]),
                        )[:4]

                        crop = crop_with_padding(frame, best_box, PAD_RATIO)
                        out_path = Path.cwd() / OUTPUT_NAME
                        cv2.imwrite(str(out_path), crop)

                        print(f"[✓] Card locked and saved to {out_path}")

                        card_image = cv2.imread(str(out_path))
                        if card_image is None:
                            raise RuntimeError("Failed to read locked card image.")

                        face_image, meta, error = extract_upright_face(card_image, face_model)
                        if error or face_image is None:
                            raise RuntimeError(f"Face extraction failed: {error}")

                        face_path = Path.cwd() / FINAL_FACE_NAME
                        cv2.imwrite(str(face_path), face_image)
                        print(f"[✓] Face extracted to {face_path}")

                        conf = meta.get("confidence", meta.get("final_confidence", 0.0)) if meta else 0.0
                        rotation = meta.get("rotation") if meta else None
                        if rotation is None and meta and "roll_angle" in meta:
                            rotation = meta["roll_angle"]
                        if rotation is None:
                            print(f"[i] Face meta: conf={conf:.2f}")
                        else:
                            print(f"[i] Face meta: conf={conf:.2f}, rotation={rotation:.1f}°")

                        cv2.rectangle(frame, (best_box[0], best_box[1]), (best_box[2], best_box[3]), (255, 0, 0), 3)
                        cv2.putText(
                            frame,
                            "Card captured",
                            (best_box[0], best_box[1] - 12),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.8,
                            (255, 0, 0),
                            2,
                        )

                        cv2.imshow("Card Detection", frame)
                        cv2.waitKey(1200)
                        return face_path
                else:
                    state = "SEARCHING"
                    lock_start_time = None

            if state == "LOCKING":
                status = "Hold still..."
                status_color = (0, 255, 255)
            elif too_small_detected:
                status = "Move card closer"
                status_color = (0, 0, 255)
            else:
                status = "Show card"
                status_color = (255, 255, 255)

            cv2.putText(
                frame,
                status,
                (w_frame // 2 - 140, h_frame - 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                status_color,
                2,
            )

            curr_time = time.time()
            fps = 1.0 / max(curr_time - prev_time, 1e-6)
            prev_time = curr_time

            hud_x = 10
            hud_y = h_frame - 90
            line_h = 26

            cv2.rectangle(frame, (hud_x - 6, hud_y - 26), (hud_x + 380, hud_y + 6), (0, 0, 0), -1)

            cv2.putText(frame, f"State: {state}", (hud_x, hud_y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(
                frame,
                f"Conf: {best_conf:.2f} (>= {CARD_CONF_THRES})",
                (hud_x, hud_y + line_h),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 220, 220),
                2,
            )
            cv2.putText(
                frame,
                f"Size: {best_area_ratio * 100:.1f}% (>= {MIN_AREA_RATIO * 100:.0f}%)",
                (hud_x, hud_y + 2 * line_h),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (220, 255, 220),
                2,
            )
            cv2.putText(
                frame,
                f"FPS: {fps:.1f}",
                (hud_x, hud_y + 3 * line_h),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (200, 200, 255),
                2,
            )

            cv2.imshow("Card Detection", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                raise SystemExit("Interrupted by user")
    finally:
        cap.release()
        cv2.destroyAllWindows()

    raise RuntimeError("Failed to lock card.")


def run_validation_loop(face_model: YOLO, app: FaceAnalysis, ref_embedding: np.ndarray) -> None:
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise SystemExit("Cannot open webcam")

    prev_time = time.time()
    still_start = None
    last_center = None
    last_match_time = 0.0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.resize(frame, (TARGET_WIDTH, TARGET_HEIGHT))
            h_frame, w_frame, _ = frame.shape

            best_conf = 0.0
            best_similarity = None

            results = face_model(frame, conf=FACE_CONF_THRES, verbose=False)
            result = results[0] if results else None

            now = time.time()
            is_still = False

            if result is not None and result.boxes is not None:
                boxes = list(result.boxes)
                boxes.sort(key=lambda b: float(b.conf[0]) if b.conf is not None else 0.0, reverse=True)
                for idx, box in enumerate(boxes):
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])

                    if conf > best_conf:
                        best_conf = conf

                    center = ((x1 + x2) / 2.0, (y1 + y2) / 2.0)
                    if last_center is None:
                        last_center = center
                        still_start = now
                    else:
                        dist = np.hypot(center[0] - last_center[0], center[1] - last_center[1])
                        if dist <= STILLNESS_PIXELS:
                            if still_start is None:
                                still_start = now
                            if now - still_start >= STILLNESS_SEC:
                                is_still = True
                        else:
                            still_start = now
                        last_center = center

                    similarity = None
                    if idx == 0 and is_still:
                        bbox = np.array([x1, y1, x2, y2], dtype=np.float32)
                        crop = crop_face_from_bbox(frame, bbox, PADDING_RATIO)
                        if crop is None:
                            x1c = max(0, x1)
                            y1c = max(0, y1)
                            x2c = min(w_frame, x2)
                            y2c = min(h_frame, y2)
                            crop = frame[y1c:y2c, x1c:x2c]

                        if crop is not None and crop.size > 0:
                            face = get_best_face(app, crop)
                            if face is not None:
                                emb = normalize_embedding(face.embedding)
                                similarity = cosine_similarity(emb, ref_embedding)
                                if similarity >= 0.4 and now - last_match_time > 1.0:
                                    print(f"[match] similarity={similarity:.3f}")
                                    last_match_time = now

                    label = f"Face {conf:.2f}"
                    if similarity is not None:
                        label += f" | Sim {similarity:.3f}"
                        if best_similarity is None or similarity > best_similarity:
                            best_similarity = similarity

                    if idx == 0 and is_still:
                        box_color = (0, 255, 0)
                    else:
                        box_color = (0, 200, 255)

                    cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
                    cv2.putText(
                        frame,
                        label,
                        (x1, max(y1 - 8, 10)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        box_color,
                        2,
                    )

            curr_time = time.time()
            fps = 1.0 / max(curr_time - prev_time, 1e-6)
            prev_time = curr_time

            hud_x = 10
            hud_y = 30
            line_h = 26

            cv2.rectangle(frame, (hud_x - 6, hud_y - 24), (hud_x + 340, hud_y + 104), (0, 0, 0), -1)

            cv2.putText(
                frame,
                f"Best conf: {best_conf:.2f}",
                (hud_x, hud_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 255),
                2,
            )
            sim_text = "N/A" if best_similarity is None else f"{best_similarity:.3f}"
            cv2.putText(
                frame,
                f"Best sim: {sim_text}",
                (hud_x, hud_y + line_h),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (200, 255, 200),
                2,
            )
            status = "Still" if is_still else "Hold still"
            status_color = (200, 255, 200) if is_still else (0, 200, 255)
            cv2.putText(
                frame,
                f"Status: {status}",
                (hud_x, hud_y + 2 * line_h),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                status_color,
                2,
            )
            cv2.putText(
                frame,
                f"FPS: {fps:.1f}",
                (hud_x, hud_y + 3 * line_h),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (200, 200, 255),
                2,
            )

            cv2.imshow("Face Validation", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()


def main() -> None:
    card_model = YOLO("card.pt").to("mps")
    face_model = YOLO("face_medium.pt").to("mps")

    app = init_insightface()

    face_path = lock_card_and_extract_face(card_model, face_model)
    ref_image = cv2.imread(str(face_path))
    if ref_image is None:
        raise ValueError(f"Unable to read reference image: {face_path}")

    ref_face = get_best_face(app, ref_image)
    if ref_face is None:
        raise ValueError(f"No face detected by InsightFace in reference image: {face_path}")

    ref_embedding = normalize_embedding(ref_face.embedding)

    run_validation_loop(face_model, app, ref_embedding)


if __name__ == "__main__":
    main()
