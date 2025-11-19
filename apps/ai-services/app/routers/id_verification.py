from fastapi import APIRouter, File, HTTPException, UploadFile
import numpy as np
import cv2

from app.services.id_detection import detect_id_card, serialize_detection

router = APIRouter(prefix="/id", tags=["id-verification"])


@router.post("/validate")
async def validate_id(image: UploadFile = File(...)):
    try:
        contents = await image.read()
        np_img = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Unable to decode image")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}") from exc

    detection = detect_id_card(frame)
    if not detection:
        raise HTTPException(status_code=422, detail="Could not detect an ID card in the image")

    return serialize_detection(detection)
