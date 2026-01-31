from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
import uvicorn

from app.routers import health
from app.routers import id_verification
from app.routers import food_validation

app = FastAPI(
    title="Eatable AI Service",
    description="Identity verification, food validation, and computer vision services",
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "name": "Eatable AI Service",
        "version": app.version,
        "status": "running",
    }


app.include_router(health.router)
app.include_router(id_verification.router)
app.include_router(food_validation.router)


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
