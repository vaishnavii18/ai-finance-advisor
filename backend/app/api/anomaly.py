
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..ml.anomaly_detection import (
    detect_anomalies,
    get_anomaly_summary,
)


router = APIRouter(
    prefix="/anomaly",
    tags=["Anomaly Detection"],
)


@router.get("/detect")
def detect_expense_anomalies(
    db: Session = Depends(get_db),
):
    """
    Run anomaly detection on all expenses.

    The detected is_anomaly value is saved to the database.
    The complete anomaly summary is returned to the client.
    """

    expenses = db.query(models.Expense).all()

    if not expenses:
        raise HTTPException(
            status_code=400,
            detail="No expenses found",
        )

    expense_list = [
        {
            "id": expense.id,
            "date": (
                expense.date.strftime("%Y-%m-%d")
                if expense.date
                else None
            ),
            "amount": expense.amount,
            "category": expense.category,
            "description": expense.description,
            "payment_method": expense.payment_method,
        }
        for expense in expenses
    ]

    try:
        results = detect_anomalies(expense_list)

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    # Update anomaly flags in the database.
    # Every expense is updated so old anomaly flags are reset
    # when a transaction is classified as normal.
    for item in results:
        db_expense = (
            db.query(models.Expense)
            .filter(models.Expense.id == item["id"])
            .first()
        )

        if db_expense:
            db_expense.is_anomaly = bool(
                item.get("is_anomaly", False)
            )

    try:
        db.commit()

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to save anomaly detection results",
        )

    summary = get_anomaly_summary(results)

    return {
        "status": "success",
        **summary,
    }


@router.get("/list")
def list_anomalies(
    db: Session = Depends(get_db),
):
    """
    Return expenses that are currently marked as anomalies.

    This endpoint reads the saved database flags.
    It does not run the detection model again.
    """

    anomalies = (
        db.query(models.Expense)
        .filter(models.Expense.is_anomaly.is_(True))
        .all()
    )

    return {
        "status": "success",
        "anomaly_count": len(anomalies),
        "anomalies": [
            {
                "id": expense.id,
                "date": (
                    expense.date.strftime("%Y-%m-%d")
                    if expense.date
                    else None
                ),
                "amount": expense.amount,
                "category": expense.category,
                "description": expense.description,
                "payment_method": expense.payment_method,
                "is_anomaly": bool(expense.is_anomaly),
            }
            for expense in anomalies
        ],
    }