from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from .. import models
from ..ml.explainability import explain_xgboost_forecast

router = APIRouter(
    prefix="/explainability",
    tags=["Explainability"],
)


@router.get("/xgboost")
def get_xgboost_explanation(
    periods: int = 30,
    db: Session = Depends(get_db),
):
    """
    Generate SHAP explanations for the XGBoost forecasting model.
    """

    expenses = (
        db.query(models.Expense)
        .order_by(models.Expense.date)
        .all()
    )

    if not expenses:
        raise HTTPException(
            status_code=404,
            detail="No expense data found.",
        )

    expense_data = [
        {
            "date": expense.date,
            "amount": expense.amount,
        }
        for expense in expenses
    ]

    result = explain_xgboost_forecast(
        expenses=expense_data,
        periods=periods,
    )

    if result.get("status") == "error":
        raise HTTPException(
            status_code=500,
            detail=result.get(
                "error",
                "Unable to generate SHAP explanation.",
            ),
        )

    if result.get("error"):
        raise HTTPException(
            status_code=400,
            detail=result["error"],
        )

    return result