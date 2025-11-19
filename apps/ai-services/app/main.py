from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(
    title="Eatable AI Service",
    description="Image validation service for food photos",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ImageValidationRequest(BaseModel):
    imageUrl: str
    expectedDish: str


class ImageValidationResponse(BaseModel):
    isValid: bool
    confidence: float
    predictedDish: str | None = None
    message: str


@app.get("/")
def root():
    return {
        "name": "Eatable AI Service",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ai-validation"}


@app.post("/validate-image", response_model=ImageValidationResponse)
async def validate_image(request: ImageValidationRequest):
    """
    Validate if uploaded image is food and matches expected dish

    TODO: Implement actual ML model inference
    """
    # Placeholder response
    # In production, this would:
    # 1. Download image from URL
    # 2. Preprocess image
    # 3. Run through ML model
    # 4. Return validation result

    return ImageValidationResponse(
        isValid=True,
        confidence=0.85,
        predictedDish=request.expectedDish,
        message="Image validation successful (placeholder)",
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
