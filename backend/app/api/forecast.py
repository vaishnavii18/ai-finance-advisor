from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas
from ..ml.forecasting import run_hybrid_forecast

router = APIRouter(
    prefix="/forecast",
    tags=["Forecasting"]
)


@router.post("/", response_model=dict)
def generate_forecast(
    request: schemas.ForecastRequest,
    db: Session = Depends(get_db)
):
    # Get all expenses from database
    expenses = db.query(models.Expense).all()

    if not expenses:
        raise HTTPException(
            status_code=400,
            detail="No expenses found. Please add some expenses first."
        )

    expense_list = [
        {
            "date": e.date.strftime("%Y-%m-%d"),
            "amount": e.amount,
            "category": e.category
        }
        for e in expenses
    ]

    result = run_hybrid_forecast(
        expenses=expense_list,
        periods=request.months_ahead * 30,   # approximate days
        model=request.model
    )

    return result