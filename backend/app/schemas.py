from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List


class ExpenseBase(BaseModel):
    date: date
    amount: float = Field(..., gt=0)
    category: str
    description: Optional[str] = None
    payment_method: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    date: Optional[date] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    payment_method: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    id: int
    is_anomaly: bool
    created_at: datetime

    class Config:
        from_attributes = True


class BudgetBase(BaseModel):
    category: str
    monthly_limit: float = Field(..., gt=0)


class BudgetCreate(BudgetBase):
    pass


class BudgetResponse(BudgetBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ForecastRequest(BaseModel):
    months_ahead: int = Field(3, ge=1, le=12)
    model: str = Field("xgboost", pattern="^(arima|prophet|xgboost|ensemble)$")


class ForecastPoint(BaseModel):
    date: date
    predicted_amount: float


class ForecastResponse(BaseModel):
    model_name: str
    forecasts: List[ForecastPoint]
    mae: Optional[float] = None
    rmse: Optional[float] = None


# ======================
# AI Advisor Schemas
# ======================

class Recommendation(BaseModel):
    priority: str = Field(..., description="high | medium | low")
    category: Optional[str] = None
    title: str
    message: str
    impact: Optional[str] = None
    suggested_actions: List[str] = []
    explanation: Optional[str] = None


class AdvisorResponse(BaseModel):
    generated_at: str
    period_days: int
    summary: str
    recommendations: List[Recommendation]
    data_quality_note: Optional[str] = None