# AI Service - Image Validation

FastAPI microservice for validating food images using machine learning.

## Features

- Image validation (is it food?)
- Food classification (what dish is it?)
- Menu item matching

## Setup

1. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run development server**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

## API Endpoints

- `GET /health` - Health check
- `POST /validate-image` - Validate food image

## TODO

- [ ] Implement image validation model
- [ ] Train/load food classification model
- [ ] Add image preprocessing
- [ ] Implement caching for performance
