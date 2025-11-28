import os
from fastapi import APIRouter, HTTPException
import google.generativeai as genai
from dotenv import load_dotenv

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
