from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .api import expenses, budget, forecast, anomaly, explainability
from app.api import advisor
from .api import auth


# Create all tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="AI Personal Finance Advisor",
    description=(
        "Hybrid AI Framework for Financial Forecasting, "
        "Anomaly Detection & Explainable Budget Optimization"
    ),
    version="1.0.0",
)


# ----------------- CORS SETUP -----------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------- INCLUDE ROUTERS -----------------

app.include_router(expenses.router)
app.include_router(budget.router)
app.include_router(forecast.router)
app.include_router(anomaly.router)
app.include_router(advisor.router)
app.include_router(explainability.router)
app.include_router(auth.router)

# ----------------- ROOT -----------------

@app.get("/")
def root():
    return {
        "message": "AI Personal Finance Advisor API is running",
        "docs": "Visit /docs for Swagger UI",
    }


# ----------------- HEALTH CHECK -----------------

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }