
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from collections import defaultdict

from pydantic import BaseModel, Field

from pulp import (
    LpProblem,
    LpVariable,
    LpMinimize,
    LpStatus,
    lpSum,
    value,
)

from ..database import get_db
from .. import models, schemas


router = APIRouter(
    prefix="/budgets",
    tags=["Budgets"],
)


# ============================================================
# REQUEST MODEL
# ============================================================

class BudgetOptimizationRequest(BaseModel):
    """
    User-provided monthly budget information.
    """

    total_budget: Optional[float] = Field(
        default=None,
        gt=0,
        description="User's total monthly budget",
    )

    savings_goal: float = Field(
        default=0,
        ge=0,
        description="Monthly savings amount to reserve",
    )


# ============================================================
# CREATE BUDGET
# ============================================================

@router.post(
    "/",
    response_model=schemas.BudgetResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_budget(
    budget: schemas.BudgetCreate,
    db: Session = Depends(get_db),
):
    existing = (
        db.query(models.Budget)
        .filter(models.Budget.category == budget.category)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Budget for category '{budget.category}' already exists",
        )

    db_budget = models.Budget(**budget.model_dump())

    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)

    return db_budget


# ============================================================
# GET ALL BUDGETS
# ============================================================

@router.get(
    "/",
    response_model=List[schemas.BudgetResponse],
)
def get_all_budgets(
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Budget)
        .order_by(models.Budget.category)
        .all()
    )


# ============================================================
# BUDGET OPTIMIZATION
# ============================================================

@router.post("/optimize")
def optimize_budget(
    request: BudgetOptimizationRequest,
    db: Session = Depends(get_db),
):
    """
    Optimize monthly category budgets using historical spending.

    Optimization approach:

    1. Read existing category budgets.
    2. Calculate historical average monthly spending.
    3. Deduct the savings goal from the total budget.
    4. Use historical spending as the target allocation.
    5. Treat available budget as an upper constraint.
    6. Use Linear Programming to minimize deviation
       from historical spending.
    7. Report any unused amount as an unallocated reserve.
    """

    # --------------------------------------------------------
    # STEP 1: Get existing category budgets
    # --------------------------------------------------------

    budgets = (
        db.query(models.Budget)
        .order_by(models.Budget.category)
        .all()
    )

    if not budgets:
        raise HTTPException(
            status_code=404,
            detail="No budgets found. Create category budgets first.",
        )

    # --------------------------------------------------------
    # STEP 2: Determine total monthly budget
    # --------------------------------------------------------

    existing_total_budget = sum(
        float(budget.monthly_limit or 0)
        for budget in budgets
    )

    if request.total_budget is not None:
        total_budget = float(request.total_budget)
    else:
        total_budget = existing_total_budget

    savings_goal = float(request.savings_goal)

    if savings_goal >= total_budget:
        raise HTTPException(
            status_code=400,
            detail="Savings goal must be less than the total monthly budget.",
        )

    available_budget = total_budget - savings_goal

    # --------------------------------------------------------
    # STEP 3: Get expense history
    # --------------------------------------------------------

    expenses = (
        db.query(models.Expense)
        .order_by(models.Expense.date)
        .all()
    )

    if not expenses:
        raise HTTPException(
            status_code=404,
            detail="No expense data found for optimization.",
        )

    # --------------------------------------------------------
    # STEP 4: Calculate monthly category spending
    # --------------------------------------------------------

    monthly_category_spending = defaultdict(float)

    for expense in expenses:
        if expense.date is None:
            continue

        month_key = expense.date.strftime("%Y-%m")

        monthly_category_spending[
            (month_key, expense.category)
        ] += float(expense.amount or 0)

    # --------------------------------------------------------
    # STEP 5: Calculate historical average per category
    # --------------------------------------------------------

    category_totals = defaultdict(float)
    category_months = defaultdict(set)

    for (month, category), amount in monthly_category_spending.items():
        category_totals[category] += amount
        category_months[category].add(month)

    historical_average = {}

    for budget in budgets:
        category = budget.category

        total_spending = category_totals.get(category, 0)

        month_count = len(
            category_months.get(category, set())
        )

        if month_count > 0:
            historical_average[category] = (
                total_spending / month_count
            )
        else:
            # If no expense history exists, use the current
            # category budget as the fallback baseline.
            historical_average[category] = float(
                budget.monthly_limit or 0
            )

    # --------------------------------------------------------
    # STEP 6: Calculate historical spending total
    # --------------------------------------------------------

    historical_total = sum(
        historical_average.values()
    )

    if historical_total <= 0:
        raise HTTPException(
            status_code=400,
            detail="Unable to calculate a meaningful spending baseline.",
        )

    # --------------------------------------------------------
    # STEP 7: Set historical spending as the target
    # --------------------------------------------------------

    # Important:
    #
    # We do not scale historical spending to consume the
    # complete available budget.
    #
    # Example:
    #
    # Historical spending = ₹5,900
    # Available budget = ₹14,000
    #
    # Target allocation remains ₹5,900.
    # The remaining ₹8,100 is reported as reserve.
    #
    # If available budget is lower than historical spending,
    # Linear Programming reduces allocations to remain
    # within the available budget.

    target_allocation = {}

    for budget in budgets:
        category = budget.category

        target_allocation[category] = max(
            0.0,
            float(historical_average.get(category, 0)),
        )

    # --------------------------------------------------------
    # STEP 8: Create Linear Programming model
    # --------------------------------------------------------

    problem = LpProblem(
        "Personal_Finance_Budget_Optimization",
        LpMinimize,
    )

    allocation = {}
    deviation = {}

    for budget in budgets:
        category = budget.category

        safe_name = (
            category
            .replace(" ", "_")
            .replace("-", "_")
            .replace("/", "_")
        )

        allocation[category] = LpVariable(
            f"budget_{safe_name}",
            lowBound=0,
        )

        deviation[category] = LpVariable(
            f"deviation_{safe_name}",
            lowBound=0,
        )

    # --------------------------------------------------------
    # STEP 9: Available budget is an upper constraint
    # --------------------------------------------------------

    # The optimizer must not allocate more than the available
    # spending budget after savings are reserved.

    problem += (
        lpSum(
            allocation[category]
            for category in allocation
        )
        <= available_budget
    )

    # --------------------------------------------------------
    # STEP 10: Category constraints
    # --------------------------------------------------------

    for budget in budgets:
        category = budget.category

        current_budget = float(
            budget.monthly_limit or 0
        )

        historical_target = float(
            target_allocation[category]
        )

        # A category cannot receive more than the larger of:
        # - Its current budget
        # - Its historical monthly spending
        #
        # This prevents unnecessary budget inflation.

        upper_bound = max(
            current_budget,
            historical_target,
            0.0,
        )

        problem += (
            allocation[category] >= 0
        )

        problem += (
            allocation[category] <= upper_bound
        )

        # Absolute deviation from historical target.

        problem += (
            allocation[category]
            - historical_target
            <= deviation[category]
        )

        problem += (
            historical_target
            - allocation[category]
            <= deviation[category]
        )

    # --------------------------------------------------------
    # STEP 11: Objective function
    # --------------------------------------------------------

    # Minimize the difference between recommended allocation
    # and historical monthly spending.

    problem += lpSum(
        deviation[category]
        for category in deviation
    )

    # --------------------------------------------------------
    # STEP 12: Solve the optimization problem
    # --------------------------------------------------------

    problem.solve()

    optimization_status = LpStatus[
        problem.status
    ]

    if optimization_status != "Optimal":
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to find an optimal budget allocation. "
                f"Solver status: {optimization_status}"
            ),
        )

    # --------------------------------------------------------
    # STEP 13: Build recommendations
    # --------------------------------------------------------

    recommendations = []

    optimized_total = 0.0

    for budget in budgets:
        category = budget.category

        current_budget = float(
            budget.monthly_limit or 0
        )

        historical = float(
            historical_average.get(
                category,
                current_budget,
            )
        )

        target = float(
            target_allocation.get(
                category,
                historical,
            )
        )

        recommended_value = value(
            allocation[category]
        )

        recommended = float(
            recommended_value
            if recommended_value is not None
            else 0
        )

        recommended = max(0.0, recommended)

        optimized_total += recommended

        difference = (
            recommended - current_budget
        )

        # ----------------------------------------------------
        # Recommendation action
        # ----------------------------------------------------

        if difference < -0.01:
            action = "Reduce"
        elif difference > 0.01:
            action = "Increase"
        else:
            action = "Maintain"

        # ----------------------------------------------------
        # Percentage change
        # ----------------------------------------------------

        if current_budget > 0:
            percentage_change = (
                difference / current_budget
            ) * 100
        else:
            percentage_change = (
                100.0
                if recommended > 0
                else 0.0
            )

        recommendations.append(
            {
                "category": category,
                "current_budget": round(
                    current_budget,
                    2,
                ),
                "average_monthly_spending": round(
                    historical,
                    2,
                ),
                "target_allocation": round(
                    target,
                    2,
                ),
                "recommended_budget": round(
                    recommended,
                    2,
                ),
                "difference": round(
                    difference,
                    2,
                ),
                "percentage_change": round(
                    percentage_change,
                    2,
                ),
                "action": action,
            }
        )

    # --------------------------------------------------------
    # STEP 14: Calculate reserve
    # --------------------------------------------------------

    remaining_amount = max(
        0.0,
        available_budget - optimized_total,
    )

    # --------------------------------------------------------
    # STEP 15: Return response
    # --------------------------------------------------------

    return {
        "status": "success",
        "optimization_status": optimization_status,
        "total_budget": round(
            total_budget,
            2,
        ),
        "savings_goal": round(
            savings_goal,
            2,
        ),
        "available_budget": round(
            available_budget,
            2,
        ),
        "optimized_total": round(
            optimized_total,
            2,
        ),
        "remaining_amount": round(
            remaining_amount,
            2,
        ),
        "recommendations": recommendations,
    }


# ============================================================
# GET SINGLE BUDGET
# ============================================================

@router.get(
    "/{budget_id}",
    response_model=schemas.BudgetResponse,
)
def get_budget(
    budget_id: int,
    db: Session = Depends(get_db),
):
    budget = (
        db.query(models.Budget)
        .filter(models.Budget.id == budget_id)
        .first()
    )

    if not budget:
        raise HTTPException(
            status_code=404,
            detail="Budget not found",
        )

    return budget


# ============================================================
# UPDATE BUDGET
# ============================================================

@router.put(
    "/{budget_id}",
    response_model=schemas.BudgetResponse,
)
def update_budget(
    budget_id: int,
    updated_budget: schemas.BudgetCreate,
    db: Session = Depends(get_db),
):
    budget = (
        db.query(models.Budget)
        .filter(models.Budget.id == budget_id)
        .first()
    )

    if not budget:
        raise HTTPException(
            status_code=404,
            detail="Budget not found",
        )

    budget.category = updated_budget.category
    budget.monthly_limit = updated_budget.monthly_limit

    db.commit()
    db.refresh(budget)

    return budget


# ============================================================
# DELETE BUDGET
# ============================================================

@router.delete(
    "/{budget_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
):
    budget = (
        db.query(models.Budget)
        .filter(models.Budget.id == budget_id)
        .first()
    )

    if not budget:
        raise HTTPException(
            status_code=404,
            detail="Budget not found",
        )

    db.delete(budget)
    db.commit()

    return None