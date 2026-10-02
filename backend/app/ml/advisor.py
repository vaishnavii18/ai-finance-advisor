from datetime import datetime, timedelta
from typing import List, Dict, Any
from collections import defaultdict
from sqlalchemy.orm import Session

from app.schemas import Recommendation, AdvisorResponse
from app.models import Expense, Budget

from app.ml.forecasting import run_hybrid_forecast
from app.ml.anomaly_detection import detect_anomalies, get_anomaly_summary


def _expenses_to_dict(expenses: List[Expense]) -> List[dict]:
    return [
        {
            "date": exp.date.isoformat() if hasattr(exp.date, "isoformat") else str(exp.date),
            "amount": float(exp.amount),
            "category": exp.category,
            "description": getattr(exp, "description", None),
            "payment_method": getattr(exp, "payment_method", None),
        }
        for exp in expenses
    ]


def _get_recent_expenses(db: Session, days: int = 60) -> List[Expense]:
    cutoff = datetime.utcnow().date() - timedelta(days=days)
    return (
        db.query(Expense)
        .filter(Expense.date >= cutoff)
        .order_by(Expense.date.asc())
        .all()
    )


def _get_budgets(db: Session) -> List[Budget]:
    return db.query(Budget).all()


def _calculate_category_spending(expenses: List[dict], days: int = 30) -> Dict[str, float]:
    """Calculate total spending per category in the last N days"""
    cutoff = (datetime.utcnow() - timedelta(days=days)).date()
    category_totals = defaultdict(float)

    for exp in expenses:
        exp_date = datetime.fromisoformat(exp["date"]).date() if isinstance(exp["date"], str) else exp["date"]
        if exp_date >= cutoff:
            category_totals[exp["category"]] += exp["amount"]

    return dict(category_totals)


def generate_recommendations(
    db: Session,
    forecast_days: int = 30,
    lookback_days: int = 60,
) -> AdvisorResponse:

    expenses = _get_recent_expenses(db, lookback_days)
    budgets = _get_budgets(db)
    expense_dicts = _expenses_to_dict(expenses)

    recommendations: List[Recommendation] = []
    data_quality_note = None
    total_predicted = 0.0

    # ---------- Data quality ----------
    if len(expenses) < 14:
        data_quality_note = (
            f"Only {len(expenses)} expenses found in the last {lookback_days} days. "
            "Add at least 14 days of data for better accuracy."
        )

    # ---------- 1. Hybrid Forecast (Overall) ----------
    forecast_data = None
    try:
        forecast_result = run_hybrid_forecast(
            expenses=expense_dicts,
            periods=forecast_days,
            model="ensemble"
        )

        for key in ["Ensemble", "XGBoost", "Prophet", "ARIMA"]:
            if key in forecast_result and forecast_result[key].get("forecasts"):
                forecast_data = forecast_result[key]
                break

        if forecast_data and forecast_data.get("forecasts"):
            total_predicted = sum(f["predicted_amount"] for f in forecast_data["forecasts"])
        else:
            raise ValueError(forecast_result.get("error", "No valid forecast generated"))

    except Exception as e:
        recommendations.append(
            Recommendation(
                priority="high",
                title="Forecast unavailable",
                message=str(e),
                suggested_actions=[
                    "Add more expense records (minimum 14 days recommended)",
                    "Check the forecasting service"
                ],
            )
        )

    # ---------- 2. Overall Budget vs Forecast ----------
    if not budgets:
        recommendations.append(
            Recommendation(
                priority="high",
                title="No budgets set",
                message="You haven't created any budgets yet. Setting budgets unlocks powerful personalized insights.",
                suggested_actions=[
                    "Create budgets for major categories (Food, Shopping, Transport, etc.)",
                    "Use realistic monthly limits based on your past spending"
                ],
                explanation="Budgets are essential for meaningful financial advice."
            )
        )
    else:
        total_monthly_budget = sum(b.monthly_limit for b in budgets)
        proportional_budget = total_monthly_budget * (forecast_days / 30)

        if total_predicted > 0:
            if total_predicted > proportional_budget * 1.05:
                overspend = total_predicted - proportional_budget
                recommendations.append(
                    Recommendation(
                        priority="high",
                        title="Projected Overall Overspend",
                        message=(
                            f"Forecast predicts ₹{total_predicted:,.0f} spending in the next {forecast_days} days "
                            f"vs proportional budget of ₹{proportional_budget:,.0f}."
                        ),
                        impact=f"Potential overspend of ₹{overspend:,.0f}",
                        suggested_actions=[
                            "Review high-spending categories below",
                            "Reduce non-essential expenses",
                            "Adjust budgets if needed"
                        ],
                        explanation="Based on Ensemble forecast model"
                    )
                )
            else:
                remaining = proportional_budget - total_predicted
                recommendations.append(
                    Recommendation(
                        priority="low",
                        title="You are on track overall",
                        message=(
                            f"Forecasted spending is ₹{total_predicted:,.0f} against "
                            f"a proportional budget of ₹{proportional_budget:,.0f}."
                        ),
                        impact=f"Approximately ₹{remaining:,.0f} remaining",
                        suggested_actions=[
                            "Keep up the good work",
                            "Consider moving surplus to savings"
                        ],
                    )
                )

    # ---------- 3. Category-Level Analysis (New & Important) ----------
    if budgets:
        category_spending = _calculate_category_spending(expense_dicts, days=30)
        budget_map = {b.category: b.monthly_limit for b in budgets}

        for category, spent in category_spending.items():
            budget_limit = budget_map.get(category)

            if budget_limit is None:
                # Spending in a category that has no budget
                recommendations.append(
                    Recommendation(
                        priority="medium",
                        category=category,
                        title=f"No budget set for {category}",
                        message=f"You spent ₹{spent:,.0f} on {category} in the last 30 days, but no budget exists for this category.",
                        impact=f"Unbudgeted spending: ₹{spent:,.0f}",
                        suggested_actions=[
                            f"Create a monthly budget for {category}",
                            "Review if this spending is necessary"
                        ],
                    )
                )
            else:
                # Compare against budget
                usage_pct = (spent / budget_limit) * 100

                if usage_pct > 100:
                    over = spent - budget_limit
                    recommendations.append(
                        Recommendation(
                            priority="high",
                            category=category,
                            title=f"Over budget in {category}",
                            message=f"You have already spent ₹{spent:,.0f} on {category} against a monthly budget of ₹{budget_limit:,.0f}.",
                            impact=f"Over by ₹{over:,.0f} ({usage_pct:.0f}% of budget used)",
                            suggested_actions=[
                                f"Reduce spending on {category} immediately",
                                "Review recent transactions in this category",
                                "Consider adjusting the budget if this is expected"
                            ],
                        )
                    )
                elif usage_pct > 85:
                    recommendations.append(
                        Recommendation(
                            priority="medium",
                            category=category,
                            title=f"Approaching limit in {category}",
                            message=f"You have used {usage_pct:.0f}% of your {category} budget (₹{spent:,.0f} of ₹{budget_limit:,.0f}).",
                            impact="Close to monthly limit",
                            suggested_actions=[
                                f"Be careful with further {category} spending this month",
                                "Plan remaining expenses carefully"
                            ],
                        )
                    )
                elif usage_pct < 50 and spent > 0:
                    recommendations.append(
                        Recommendation(
                            priority="low",
                            category=category,
                            title=f"Healthy spending in {category}",
                            message=f"Only {usage_pct:.0f}% of your {category} budget used (₹{spent:,.0f} of ₹{budget_limit:,.0f}).",
                            impact="Well under budget",
                            suggested_actions=[
                                "Good control — keep it up"
                            ],
                        )
                    )

    # ---------- 4. Forecast Summary ----------
    if total_predicted > 0:
        recommendations.append(
            Recommendation(
                priority="low",
                title="Spending Forecast Summary",
                message=f"Total predicted spending for the next {forecast_days} days is ₹{total_predicted:,.0f}.",
                impact=f"Daily average: ₹{total_predicted / forecast_days:,.0f}",
                suggested_actions=[
                    "Review detailed forecast via POST /forecast/",
                    "Compare with actual spending later"
                ],
                explanation="Generated using hybrid ensemble model"
            )
        )

    # ---------- 5. Anomaly Detection ----------
    try:
        expenses_with_anomaly = detect_anomalies(expense_dicts, contamination=0.1)
        anomaly_summary = get_anomaly_summary(expenses_with_anomaly)

        if anomaly_summary["anomaly_count"] > 0:
            top_anomalies = sorted(
                anomaly_summary["anomalies"],
                key=lambda x: x["amount"],
                reverse=True
            )[:3]

            for anom in top_anomalies:
                recommendations.append(
                    Recommendation(
                        priority="medium",
                        category=anom.get("category"),
                        title="Unusual Expense Detected",
                        message=(
                            f"₹{anom['amount']:,.0f} spent on {anom.get('date')} "
                            f"in '{anom.get('category', 'Unknown')}' was flagged as unusual."
                        ),
                        impact=f"Anomaly amount: ₹{anom['amount']:,.0f}",
                        suggested_actions=[
                            "Confirm if this expense was expected",
                            "Add a note for future reference",
                            "Monitor this category"
                        ],
                        explanation="Detected by Isolation Forest"
                    )
                )
    except Exception:
        pass

    # ---------- Final sorting & summary ----------
    priority_order = {"high": 0, "medium": 1, "low": 2}
    recommendations.sort(key=lambda r: priority_order.get(r.priority, 3))

    high_count = sum(1 for r in recommendations if r.priority == "high")
    medium_count = sum(1 for r in recommendations if r.priority == "medium")

    if high_count > 0:
        summary = f"You have {high_count} high-priority recommendation(s) that need attention."
    elif medium_count > 0:
        summary = f"No critical issues. You have {medium_count} insight(s) worth reviewing."
    else:
        summary = "Everything looks healthy. Keep tracking your expenses!"

    return AdvisorResponse(
        generated_at=datetime.utcnow().isoformat(),
        period_days=forecast_days,
        summary=summary,
        recommendations=recommendations,
        data_quality_note=data_quality_note,
    )