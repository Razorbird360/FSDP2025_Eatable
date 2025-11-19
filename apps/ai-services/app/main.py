from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.routers import health
from app.routers import id_verification

app = FastAPI(
    title="Eatable AI Service",
    description="Identity verification and computer vision services",
    version="1.1.0",
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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
