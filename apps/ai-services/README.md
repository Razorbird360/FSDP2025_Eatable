# AI Service - Food Validation

FastAPI microservice for AI-powered food image validation using Google Gemini.

---

## Overview

This service provides:
- **Generic Food Detection** - Validates if an image contains food
- **Specific Dish Validation** - Verifies if an image matches a specific menu item
- **Integration Ready** - RESTful API for seamless backend integration

**Technology:**
- FastAPI (Python 3.13+)
- Google Gemini AI (gemini-2.5-flash)
- Pillow & OpenCV for image processing

---

## Quick Start

**Automated Setup (Recommended):**

```bash
# From repository root
# Windows
scripts\setup-ai.bat

# Unix/Mac
bash scripts/setup-ai.sh

# Start the service
pnpm dev:ai
```

**Manual Setup:**

```bash
# Navigate to service directory
cd apps/ai-services

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate.bat
# Unix/Mac:
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# Run the service
uvicorn app.main:app --reload --port 8000
```

---

## Environment Variables

**Required:**
```env
GEMINI_API_KEY=your-gemini-api-key-here
```

Get your API key from: [ai.google.dev](https://ai.google.dev/)

---

## API Endpoints

### Base URL
```
http://localhost:8000
```

### Interactive Documentation
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Available Endpoints

#### 1. Health Check
```http
GET /
GET /api/health
```

**Response:**
```json
{
  "name": "Eatable AI Service",
  "version": "1.2.0",
  "status": "running"
}
```

#### 2. Food Validation Health Check
```http
GET /food/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "food-validation",
  "gemini_status": "connected",
  "model": "gemini-2.5-flash"
}
```

#### 3. Generic Food Detection
```http
POST /food/validate-generic
Content-Type: multipart/form-data
```

**Parameters:**
- `image` (file, required) - Image file to validate

**Response:**
```json
{
  "is_food": 1,
  "message": "Food detected in the image"
}
```

**Possible Values:**
- `is_food: 1` - Food detected
- `is_food: 0` - No food detected

#### 4. Specific Dish Validation
```http
POST /food/validate-specific
Content-Type: multipart/form-data
```

**Parameters:**
- `image` (file, required) - Image file to validate
- `dish_name` (string, required) - Name of the dish to match

**Response:**
```json
{
  "is_match": 1,
  "message": "Image matches the dish: Chicken Rice",
  "dish_name": "Chicken Rice"
}
```

**Possible Values:**
- `is_match: 1` - Image matches the dish
- `is_match: 0` - Image does not match

---

## Architecture

### Service Structure
```
apps/ai-services/
├── app/
│   ├── main.py              # FastAPI app initialization
│   ├── routers/
│   │   ├── health.py        # Health check endpoints
│   │   ├── food_validation.py  # Food validation logic
│   │   └── id_verification.py  # ID verification (future)
│   ├── services/            # Business logic
│   └── tools/               # Utility functions
├── venv/                    # Virtual environment (gitignored)
├── requirements.txt         # Python dependencies
├── .env.example            # Environment template
└── README.md               # This file
```

### Dependencies

**Core:**
- `fastapi==0.115.0` - Web framework
- `uvicorn[standard]==0.32.1` - ASGI server
- `google-generativeai==0.8.3` - Gemini AI SDK

**Image Processing:**
- `pillow==11.0.0` - Image manipulation
- `opencv-python==4.10.0.84` - Computer vision
- `numpy==2.2.0` - Numerical operations

**Utilities:**
- `python-multipart==0.0.20` - File upload handling
- `python-dotenv==1.0.1` - Environment management
- `requests==2.32.3` - HTTP client

---

## Development

### Running with Auto-Reload
```bash
# From repository root
pnpm dev:ai

# Or directly with uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Testing Endpoints

**Using cURL:**
```bash
# Generic food detection
curl -X POST http://localhost:8000/food/validate-generic \
  -F "image=@/path/to/food.jpg"

# Specific dish validation
curl -X POST http://localhost:8000/food/validate-specific \
  -F "image=@/path/to/food.jpg" \
  -F "dish_name=Chicken Rice"
```

**Using Python Requests:**
```python
import requests

# Generic food detection
with open('food.jpg', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/food/validate-generic',
        files={'image': f}
    )
    print(response.json())

# Specific dish validation
with open('food.jpg', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/food/validate-specific',
        files={'image': f},
        data={'dish_name': 'Chicken Rice'}
    )
    print(response.json())
```

### Integration with Server

The Node.js server integrates via `ai-validation.service.js`:

```javascript
import { aiValidationService } from './services/ai-validation.service.js';

// Generic validation
const result = await aiValidationService.validateFoodGeneric(imageBuffer);
// { is_food: 1, message: "Food detected in the image" }

// Specific validation
const result = await aiValidationService.validateFoodSpecific(
  imageBuffer,
  'Chicken Rice'
);
// { is_match: 1, message: "...", dish_name: "Chicken Rice" }
```

---

## AI Model Information

**Model:** Google Gemini 2.5 Flash
- **Type:** Multimodal (Vision + Text)
- **Capabilities:** Image understanding, object detection, food recognition
- **Latency:** ~1-3 seconds per request
- **Rate Limits:** Based on your Gemini API tier

**Prompt Engineering:**
- Generic: "Is there food visible in this image? Respond with only 1 for yes or 0 for no."
- Specific: "Does this image contain {dish_name}? Respond with only 1 for yes or 0 for no."

---

## Troubleshooting

**Problem: "GEMINI_API_KEY not found"**
- Ensure `.env` file exists in `apps/ai-services/`
- Add `GEMINI_API_KEY=your-key-here` to `.env`
- Restart the service

**Problem: "Module not found"**
```bash
# Activate venv and reinstall
source venv/bin/activate  # or venv\Scripts\activate.bat
pip install -r requirements.txt
```

**Problem: "Port 8000 already in use"**
```bash
# Find and kill the process
# Windows:
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# Unix/Mac:
lsof -ti:8000 | xargs kill -9
```

**Problem: "Gemini AI rate limit exceeded"**
- Check your API quota at [ai.google.dev](https://ai.google.dev/)
- Implement caching for repeated requests
- Consider upgrading your API tier

---

## Future Enhancements

- [ ] Add image caching layer (Redis)
- [ ] Implement confidence scores
- [ ] Support multiple food items in single image
- [ ] Add nutritional information extraction
- [ ] Implement ID verification endpoints
- [ ] Add request rate limiting
- [ ] Add metrics and monitoring

---

## License

MIT License - Part of the Eatable project
