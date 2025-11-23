from fastapi import APIRouter, File, HTTPException, UploadFile

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
