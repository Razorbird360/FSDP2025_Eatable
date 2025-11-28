import os
from fastapi import APIRouter, HTTPException, UploadFile, File
import google.generativeai as genai
from dotenv import load_dotenv
from PIL import Image
import io

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/food", tags=["food-validation"])

# Initialize Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not found in environment variables")
    model = None
else:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.5-flash')
        print("Gemini AI initialized successfully")
    except Exception as e:
        print(f"Error initializing Gemini AI: {str(e)}")
        model = None


@router.get("/health")
def food_validation_health():
    """
    Health check endpoint for food validation service
    """
    gemini_status = "connected" if model is not None else "not configured"

    return {
        "status": "healthy",
        "service": "food-validation",
        "gemini_status": gemini_status,
        "model": "gemini-2.5-flash" if model else None
    }


@router.post("/validate-generic")
async def validate_generic_food(image: UploadFile = File(...)):
    """
    Generic food detection endpoint.
    Validates if the uploaded image contains any food.

    Returns:
        - is_food: 1 if food is detected, 0 if not
        - message: Description of the result
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Gemini AI service is not configured. Please check GEMINI_API_KEY."
        )

    try:
        # Read the uploaded image
        image_data = await image.read()
        img = Image.open(io.BytesIO(image_data))

        # Prepare the prompt for Gemini
        prompt = "Is there food visible in this image? Respond with only 1 for yes or 0 for no."

        # Generate response from Gemini
        response = model.generate_content([prompt, img])

        # Parse the response
        result_text = response.text.strip()

        # Extract 1 or 0 from response
        if "1" in result_text:
            is_food = 1
            message = "Food detected in the image"
        elif "0" in result_text:
            is_food = 0
            message = "No food detected in the image"
        else:
            # Fallback: if response is unclear, default to 0
            is_food = 0
            message = f"Unable to determine if food is present. AI response: {result_text}"

        return {
            "is_food": is_food,
            "message": message
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        )
