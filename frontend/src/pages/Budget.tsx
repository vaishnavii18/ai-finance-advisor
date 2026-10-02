
import { useEffect, useState } from "react";
import {
  getBudgets,
  optimizeBudget,
} from "../services/api";
import type { Budget } from "../types";
import type {
  BudgetOptimizationResponse,
} from "../services/api";
import {
  Wallet,
  PiggyBank,
  Calculator,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertCircle,
  ShieldCheck,
  Info,
} from "lucide-react";

export default function Budget() {
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const [totalBudget, setTotalBudget] = useState("");
  const [savingsGoal, setSavingsGoal] = useState("");

  const [result, setResult] =
    useState<BudgetOptimizationResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState("");

  // ==========================================================
  // LOAD EXISTING BUDGETS
  // ==========================================================

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const data = await getBudgets();

        setBudgets(data);

        // Calculate the current total of all category budgets.
        // This value is used as the initial monthly budget.
        // The user can change it before optimization.
        const currentTotal = data.reduce(
          (sum, budget) =>
            sum + Number(budget.monthly_limit || 0),
          0
        );

        if (currentTotal > 0) {
          setTotalBudget(String(currentTotal));
        }
      } catch (err) {
        console.error(err);

        setError(
          "Failed to load budgets. Make sure the backend is running."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBudgets();
  }, []);

  // ==========================================================
  // FORMAT CURRENCY
  // ==========================================================

  const formatCurrency = (value: number) => {
    return `₹${Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;
  };

  // ==========================================================
  // OPTIMIZE BUDGET
  // ==========================================================

  const handleOptimize = async () => {
    setError("");
    setResult(null);

    const budgetValue = Number(totalBudget);
    const savingsValue = Number(savingsGoal || 0);

    // Validate monthly budget.
    if (
      !totalBudget ||
      !Number.isFinite(budgetValue) ||
      budgetValue <= 0
    ) {
      setError("Please enter a valid monthly budget.");
      return;
    }

    // Validate savings goal.
    if (
      !Number.isFinite(savingsValue) ||
      savingsValue < 0
    ) {
      setError("Savings goal cannot be negative.");
      return;
    }

    // Savings must be less than the total budget.
    if (savingsValue >= budgetValue) {
      setError(
        "Savings goal must be less than the monthly budget."
      );
      return;
    }

    try {
      setOptimizing(true);

      const data = await optimizeBudget({
        total_budget: budgetValue,
        savings_goal: savingsValue,
      });

      setResult(data);
    } catch (err: any) {
      console.error(err);

      const backendMessage =
        err?.response?.data?.detail;

      setError(
        backendMessage ||
          "Budget optimization failed. Please try again."
      );
    } finally {
      setOptimizing(false);
    }
  };

  // ==========================================================
  // ACTION BADGE
  // ==========================================================

  const ActionBadge = ({
    action,
  }: {
    action: "Reduce" | "Maintain" | "Increase";
  }) => {
    if (action === "Reduce") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/10">
          <TrendingDown className="h-3.5 w-3.5" />
          Reduce
        </span>
      );
    }

    if (action === "Increase") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
          <TrendingUp className="h-3.5 w-3.5" />
          Increase
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
        <Minus className="h-3.5 w-3.5" />
        Maintain
      </span>
    );
  };

  // ==========================================================
  // LOADING STATE
  // ==========================================================

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
            Budget Optimization
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Optimize your monthly budget using your spending history
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">
            Loading budgets…
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="space-y-6">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
          Budget Optimization
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Set your monthly budget and savings goal to generate
          personalized category allocations
        </p>
      </div>

      {/* ======================================================
          ERROR MESSAGE
      ====================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

          <span>{error}</span>
        </div>
      )}

      {/* ======================================================
          USER INPUT CARD
      ====================================================== */}

      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
            <Calculator className="h-5 w-5 text-indigo-600" />
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Monthly Budget Settings
            </h2>

            <p className="text-xs text-slate-500">
              Enter the amount you want to manage each month
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">

          {/* ==================================================
              MONTHLY BUDGET
          ================================================== */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Monthly Budget
            </label>

            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                ₹
              </span>

              <input
                type="number"
                min="1"
                step="100"
                value={totalBudget}
                onChange={(e) => {
                  setTotalBudget(e.target.value);
                  setResult(null);
                  setError("");
                }}
                placeholder="e.g. 30000"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-14 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <p className="mt-1.5 text-xs text-slate-400">
              Your total monthly spending budget
            </p>
          </div>

          {/* ==================================================
              SAVINGS GOAL
          ================================================== */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Monthly Savings Goal
            </label>

            <div className="relative">
              <PiggyBank className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                ₹
              </span>

              <input
                type="number"
                min="0"
                step="100"
                value={savingsGoal}
                onChange={(e) => {
                  setSavingsGoal(e.target.value);
                  setResult(null);
                  setError("");
                }}
                placeholder="e.g. 5000"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-14 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <p className="mt-1.5 text-xs text-slate-400">
              Amount reserved for savings before spending
            </p>
          </div>
        </div>

        {/* ==================================================
            BUDGET CALCULATION PREVIEW
        ================================================== */}

        {totalBudget &&
          Number(totalBudget) > 0 &&
          savingsGoal !== "" &&
          Number(savingsGoal) >= 0 &&
          Number(savingsGoal) < Number(totalBudget) && (
            <div className="mt-5 rounded-lg border border-indigo-100 bg-indigo-50/60 px-4 py-3">
              <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-indigo-800">
                  Estimated available spending
                </span>

                <span className="font-semibold text-indigo-900">
                  {formatCurrency(
                    Number(totalBudget) - Number(savingsGoal)
                  )}
                </span>
              </div>

              <p className="mt-1 text-xs leading-5 text-indigo-700">
                This amount is calculated by subtracting your
                savings goal from your monthly budget.
              </p>
            </div>
          )}

        {/* ==================================================
            OPTIMIZE BUTTON
        ================================================== */}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleOptimize}
            disabled={optimizing}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Calculator className="h-4 w-4" />

            {optimizing
              ? "Optimizing…"
              : "Optimize Budget"}
          </button>
        </div>
      </div>

      {/* ======================================================
          CURRENT CATEGORY BUDGETS
      ====================================================== */}

      {!result && budgets.length > 0 && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">

          <div className="mb-5">
            <h2 className="text-base font-semibold text-slate-900">
              Current Category Budgets
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              These budgets are used as the starting point for
              optimization.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            {budgets.map((budget) => (
              <div
                key={budget.id}
                className="rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3"
              >
                <div className="text-xs text-slate-500">
                  {budget.category}
                </div>

                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {formatCurrency(
                    Number(budget.monthly_limit)
                  )}
                </div>
              </div>
            ))}

          </div>
        </div>
      )}

      {/* ======================================================
          OPTIMIZATION RESULTS
      ====================================================== */}

      {result && (
        <>
          {/* ==================================================
              SUMMARY CARDS
          ================================================== */}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">

            {/* ==================================================
                TOTAL MONTHLY BUDGET
            ================================================== */}

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <p className="text-xs font-medium text-slate-500">
                Monthly Budget
              </p>

              <p className="mt-2 text-xl font-semibold text-slate-900">
                {formatCurrency(result.total_budget)}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Total amount entered
              </p>
            </div>

            {/* ==================================================
                SAVINGS GOAL
            ================================================== */}

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <p className="text-xs font-medium text-slate-500">
                Savings Goal
              </p>

              <p className="mt-2 text-xl font-semibold text-emerald-600">
                {formatCurrency(result.savings_goal)}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Target amount reserved
              </p>
            </div>

            {/* ==================================================
                AVAILABLE SPENDING
            ================================================== */}

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <p className="text-xs font-medium text-slate-500">
                Available Spending
              </p>

              <p className="mt-2 text-xl font-semibold text-indigo-600">
                {formatCurrency(result.available_budget)}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Budget after savings goal
              </p>
            </div>

            {/* ==================================================
                OPTIMIZED ALLOCATION
            ================================================== */}

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <p className="text-xs font-medium text-slate-500">
                Optimized Allocation
              </p>

              <p className="mt-2 text-xl font-semibold text-slate-900">
                {formatCurrency(result.optimized_total)}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Recommended category total
              </p>
            </div>

            {/* ==================================================
                UNALLOCATED RESERVE
            ================================================== */}

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <p className="text-xs font-medium text-slate-500">
                Unallocated Reserve
              </p>

              <p className="mt-2 text-xl font-semibold text-amber-600">
                {formatCurrency(result.remaining_amount)}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Remaining after recommended allocations
              </p>
            </div>

          </div>

          {/* ==================================================
              OPTIMIZATION STATUS
          ================================================== */}

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-5 py-4">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

              <div className="flex items-start gap-3">

                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Budget optimization completed
                  </p>

                  <p className="mt-1 text-xs text-emerald-700">
                    Linear Programming status:{" "}
                    {result.optimization_status}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-emerald-700">
                    The optimizer recommends category allocations
                    based on your historical spending patterns.
                    Any remaining amount is shown as an unallocated
                    reserve and is not automatically treated as
                    additional savings.
                  </p>
                </div>

              </div>

              <div className="shrink-0 text-sm font-semibold text-emerald-800">
                Reserve:{" "}
                {formatCurrency(result.remaining_amount)}
              </div>

            </div>
          </div>

          {/* ==================================================
              OPTIMIZATION EXPLANATION
          ================================================== */}

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-5 py-4">

            <div className="flex items-start gap-3">

              <Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

              <div>
                <h3 className="text-sm font-semibold text-indigo-900">
                  How to interpret these results
                </h3>

                <ul className="mt-2 space-y-1.5 text-xs leading-5 text-indigo-800">
                  <li>
                    • Your savings goal is deducted from the total
                    monthly budget to calculate the available
                    spending budget.
                  </li>

                  <li>
                    • Recommended category allocations are
                    influenced by historical average spending.
                  </li>

                  <li>
                    • The optimizer can recommend less than the
                    available spending budget when historical
                    spending is lower.
                  </li>

                  <li>
                    • The remaining reserve can be used for
                    emergencies, additional savings, or expenses
                    not represented in the current categories.
                  </li>
                </ul>
              </div>

            </div>
          </div>

          {/* ==================================================
              RECOMMENDATIONS TABLE
          ================================================== */}

          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">

            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                Optimized Category Allocation
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Recommendations are based on historical spending
                patterns. The optimizer respects your available
                spending budget and may leave part of it unallocated
                as a reserve.
              </p>
            </div>

            <div className="overflow-x-auto">

              <table className="w-full text-left">

                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-medium uppercase tracking-wider text-slate-400">

                    <th className="px-5 py-3">
                      Category
                    </th>

                    <th className="px-5 py-3 text-right">
                      Current
                    </th>

                    <th className="px-5 py-3 text-right">
                      Historical Avg.
                    </th>

                    <th className="px-5 py-3 text-right">
                      Recommended
                    </th>

                    <th className="px-5 py-3 text-right">
                      Change
                    </th>

                    <th className="px-5 py-3 text-right">
                      Action
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {result.recommendations.length > 0 ? (
                    result.recommendations.map(
                      (recommendation) => (
                        <tr
                          key={recommendation.category}
                          className="transition-colors hover:bg-slate-50/70"
                        >

                          {/* CATEGORY */}

                          <td className="px-5 py-4">
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {recommendation.category}
                            </span>
                          </td>

                          {/* CURRENT BUDGET */}

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-600">
                            {formatCurrency(
                              recommendation.current_budget
                            )}
                          </td>

                          {/* HISTORICAL AVERAGE */}

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-600">
                            {formatCurrency(
                              recommendation.average_monthly_spending
                            )}
                          </td>

                          {/* RECOMMENDED BUDGET */}

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                            {formatCurrency(
                              recommendation.recommended_budget
                            )}
                          </td>

                          {/* BUDGET DIFFERENCE */}

                          <td
                            className={`whitespace-nowrap px-5 py-4 text-right text-sm font-medium ${
                              recommendation.difference < 0
                                ? "text-amber-600"
                                : recommendation.difference > 0
                                ? "text-emerald-600"
                                : "text-slate-500"
                            }`}
                          >
                            {recommendation.difference > 0
                              ? "+"
                              : ""}

                            {formatCurrency(
                              recommendation.difference
                            )}

                            <span className="ml-1 text-xs font-normal">
                              (
                              {recommendation.percentage_change > 0
                                ? "+"
                                : ""}

                              {recommendation.percentage_change.toFixed(
                                1
                              )}

                              %)
                            </span>
                          </td>

                          {/* ACTION */}

                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <ActionBadge
                              action={recommendation.action}
                            />
                          </td>

                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-8 text-center text-sm text-slate-500"
                      >
                        No category recommendations were generated.
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>
            </div>
          </div>

          {/* ==================================================
              RESULT FOOTNOTE
          ================================================== */}

          <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">

            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

            <p className="text-xs leading-5 text-slate-600">
              The recommended allocation is based on the optimization
              model and available historical data. Actual future
              expenses may differ from these recommendations.
            </p>

          </div>
        </>
      )}
    </div>
  );
}