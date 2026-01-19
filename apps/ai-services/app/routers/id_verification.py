import json
from fastapi import APIRouter, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
import cv2
import numpy as np

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

    try:
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break
            if "text" in message and message["text"]:
                text = message["text"].strip().lower()
                if text == "reset":
                    state.reset()
                continue

            frame_bytes = message.get("bytes")
            if not frame_bytes:
                continue

            frame = cv2.imdecode(np.frombuffer(frame_bytes, np.uint8), cv2.IMREAD_COLOR)
            if frame is None:
                continue

            if state.state == "LOCKED" and state.locked_payload and state.locked_payload.matched:
                await websocket.send_text(json.dumps(_payload_to_dict(state.locked_payload)))
                continue

            if state.state == "LOCKED" and state.locked_payload:
                payload = state.update_face(frame)
                if payload.matched:
                    state.locked_payload = payload
                await websocket.send_text(json.dumps(_payload_to_dict(payload)))
                continue

            detection, resized_frame = process_frame(frame)
            payload = state.update(detection, resized_frame)
            await websocket.send_text(json.dumps(_payload_to_dict(payload)))
    except WebSocketDisconnect:
        return
    except RuntimeError:
        return


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
    }
    if payload.crop:
        response["crop"] = payload.crop
    if payload.face_crop:
        response["face_crop"] = payload.face_crop
    if payload.face_bbox:
        response["face_bbox"] = payload.face_bbox
    if payload.face_similarity is not None:
        response["face_similarity"] = payload.face_similarity
    return response
