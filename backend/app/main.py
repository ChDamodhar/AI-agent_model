from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import data
from .routes.pipeline import router as pipeline_router
from .database import init_db
app = FastAPI(
    title="DataMind AI API",
    description="Multi-Agent Autonomous Data Science Platform API",
    version="1.0.0"
)

# Set up CORS middleware to allow communication with frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production/deployment later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(data.router, prefix="/api/v1")
app.include_router(pipeline_router, prefix="/api/v1")

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/")
async def root():
    return {
        "message": "Welcome to the DataMind AI API. Visit /docs for documentation.",
        "status": "healthy"
    }
