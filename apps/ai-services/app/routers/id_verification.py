import json
import time
from fastapi import APIRouter, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
import cv2
import numpy as np

from app.metrics import (
    face_validation_total,
    frame_processing_seconds,
    id_frames_total,
    id_lock_events_total,
    id_valid_detections_total,
    ws_active_connections,
    ws_messages_total,
)
from app.state import VerificationState
from app.tools.id_detector import process_frame

router = APIRouter(prefix="/id", tags=["id-verification"])


@router.post("/validate")
async def validate_id(image: UploadFile = File(...)):
    contents = await image.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty image upload")

    # Placeholder: acknowledge that the file was received.
    return {
        "status": "received",
        "filename": image.filename,
        "bytes": len(contents),
    }


@router.websocket("/ws")
async def id_verification_ws(websocket: WebSocket):
    await websocket.accept()
    state = VerificationState()
    ws_active_connections.inc()
    face_match_reported = False

    try:
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break
            if "text" in message and message["text"]:
                ws_messages_total.labels("control").inc()
                text = message["text"].strip().lower()
                if text == "reset":
                    state.reset()
                elif text == "retry_face":
                    state.reset_face_validation()
                continue

            frame_bytes = message.get("bytes")
            if not frame_bytes:
                continue
            ws_messages_total.labels("frame").inc()

            frame = cv2.imdecode(np.frombuffer(frame_bytes, np.uint8), cv2.IMREAD_COLOR)
            if frame is None:
                continue

            if state.state == "LOCKED" and state.face_validation_done and state.face_payload:
                await websocket.send_text(json.dumps(_payload_to_dict(state.face_payload)))
                continue

            if state.state == "LOCKED" and state.locked_payload:
                start_time = time.perf_counter()
                payload = state.update_face(frame)
                frame_processing_seconds.labels("face").observe(time.perf_counter() - start_time)
                if payload.validation_done and payload.matched and not face_match_reported:
                    face_validation_total.labels("matched").inc()
                    face_match_reported = True
                if payload.validation_failed:
                    face_validation_total.labels("failed").inc()
                if payload.validation_done:
                    state.face_payload = payload
                await websocket.send_text(json.dumps(_payload_to_dict(payload)))
                continue

            start_time = time.perf_counter()
            detection, resized_frame = process_frame(frame)
            frame_processing_seconds.labels("id").observe(time.perf_counter() - start_time)
            id_frames_total.inc()
            if detection.valid_boxes:
                id_valid_detections_total.inc()
            prev_state = state.state
            payload = state.update(detection, resized_frame)
            if prev_state != "LOCKED" and payload.state == "LOCKED":
                id_lock_events_total.inc()
            await websocket.send_text(json.dumps(_payload_to_dict(payload)))
    except WebSocketDisconnect:
        return
    except RuntimeError:
        return
    finally:
        ws_active_connections.dec()


def _payload_to_dict(payload):
    response = {
        "state": payload.state,
        "bbox": payload.bbox,
        "confidence": payload.confidence,
        "area_ratio": payload.area_ratio,
        "frame": {
            "width": payload.frame_width,
            "height": payload.frame_height,
        },
        "too_small": payload.too_small,
        "face_detected": payload.face_detected,
        "matched": payload.matched,
        "validation_done": payload.validation_done,
        "validation_failed": payload.validation_failed,
    }
    if payload.crop:
        response["crop"] = payload.crop
    if payload.face_crop:
        response["face_crop"] = payload.face_crop
    if payload.face_bbox:
        response["face_bbox"] = payload.face_bbox
    if payload.face_similarity is not None:
        response["face_similarity"] = payload.face_similarity
    if payload.best_similarity is not None:
        response["best_similarity"] = payload.best_similarity
    return response
