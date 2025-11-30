import os
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
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

        # Parse the response strictly
        result_text = response.text.strip()

        if result_text not in {"0", "1"}:
            raise HTTPException(
                status_code=422,
                detail=f"Unexpected AI response format: '{result_text}'"
            )

        is_food = int(result_text)
        message = "Food detected in the image" if is_food == 1 else "No food detected in the image"

        return {
            "is_food": is_food,
            "message": message
        }

    except HTTPException:
        # Pass through explicit HTTP exceptions (e.g., bad AI response format)
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        )


@router.post("/validate-specific")
async def validate_specific_dish(
    image: UploadFile = File(...),
    dish_name: str = Form(...)
):
    """
    Specific dish validation endpoint.
    Validates if the uploaded image contains the specified dish.

    Args:
        image: The uploaded image file
        dish_name: The name of the dish to validate against

    Returns:
        - is_match: 1 if the dish matches, 0 if not
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
        prompt = f"Does this image contain {dish_name}? Respond with only 1 for yes or 0 for no."

        # Generate response from Gemini
        response = model.generate_content([prompt, img])

        # Parse the response strictly
        result_text = response.text.strip()

        if result_text not in {"0", "1"}:
            raise HTTPException(
                status_code=422,
                detail=f"Unexpected AI response format: '{result_text}'"
            )

        is_match = int(result_text)
        message = (
            f"Image matches the dish: {dish_name}"
            if is_match == 1
            else f"Image does not match the dish: {dish_name}"
        )

        return {
            "is_match": is_match,
            "message": message,
            "dish_name": dish_name
        }

    except HTTPException:
        # Pass through explicit HTTP exceptions (e.g., bad AI response format)
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        )
