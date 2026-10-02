from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.ml.advisor import generate_recommendations
from app.schemas import AdvisorResponse

router = APIRouter(prefix="/advisor", tags=["AI Advisor"])


@router.get("/recommendations", response_model=AdvisorResponse)
def get_ai_recommendations(
    forecast_days: int = Query(30, ge=7, le=90, description="Number of days to forecast ahead"),
    lookback_days: int = Query(60, ge=14, le=180, description="Number of past days to analyze"),
    db: Session = Depends(get_db),
):
    """
    AI-powered personal finance advisor.
    Combines hybrid forecasting, anomaly detection, budgets and SHAP explainability.
    """
    return generate_recommendations(
        db=db,
        forecast_days=forecast_days,
        lookback_days=lookback_days,
    )