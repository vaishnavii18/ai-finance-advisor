
import { useEffect, useState } from "react";

import SummaryCards from "../components/SummaryCards";
import ForecastChart from "../components/ForecastChart";
import Recommendations from "../components/Recommendations";
import RecentExpenses from "../components/RecentExpenses";

import {
  getAdvisorRecommendations,
  getExpenses,
  getBudgets,
  getForecast,
} from "../services/api";

import type {
  Expense,
  Budget,
  ForecastResponse,
  AdvisorResponse,
} from "../services/api";

function extractPredictedSpending(
  advisor: AdvisorResponse
): number {
  const forecastRecommendation =
    advisor.recommendations.find((recommendation) =>
      recommendation.title.toLowerCase().includes("forecast")
    );

  const recommendationsToCheck = forecastRecommendation
    ? [forecastRecommendation, ...advisor.recommendations]
    : advisor.recommendations;

  for (const recommendation of recommendationsToCheck) {
    const message = recommendation.message;

    const match = message.match(
      /(?:predicted spending|forecasted spending|forecast)[^₹]*₹\s*([\d,]+(?:\.\d+)?)/i
    );

    if (match) {
      return Number(match[1].replace(/,/g, ""));
    }
  }

  return 0;
}

export default function Dashboard() {
  const [advisor, setAdvisor] =
    useState<AdvisorResponse | null>(null);

  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  const [budgets, setBudgets] =
    useState<Budget[]>([]);

  const [forecast, setForecast] =
    useState<ForecastResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          advisorData,
          expensesData,
          budgetsData,
          forecastData,
        ] = await Promise.all([
          getAdvisorRecommendations(),
          getExpenses(),
          getBudgets(),
          getForecast(30, "ensemble"),
        ]);

        setAdvisor(advisorData);
        setExpenses(expensesData);
        setBudgets(budgetsData);
        setForecast(forecastData);
      } catch (err) {
        console.error("Dashboard loading error:", err);

        setError(
          "Failed to load data. Make sure the backend is running on port 8000."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // High-priority recommendations
  const highPriority =
    advisor?.recommendations.filter(
      (recommendation) =>
        recommendation.priority === "high"
    ).length || 0;

  // Anomaly count
  const anomalyCount = expenses.filter(
    (expense) => expense.is_anomaly
  ).length;

  // Predicted spending
  const totalPredicted = advisor
    ? extractPredictedSpending(advisor)
    : 0;

  // Total budget
  const totalBudget = budgets.reduce(
    (total, budget) =>
      total + Number(budget.monthly_limit || 0),
    0
  );

  // Current month spending
  const currentMonth = new Date()
    .toISOString()
    .slice(0, 7);

  const currentSpending = expenses
    .filter(
      (expense) =>
        expense.date?.slice(0, 7) === currentMonth
    )
    .reduce(
      (total, expense) =>
        total + Number(expense.amount || 0),
      0
    );

  // Budget status
  const budgetStatus =
    totalBudget > 0 && totalPredicted > totalBudget
      ? "Over Budget"
      : highPriority > 0
        ? "Attention Needed"
        : "On Track";

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
            Financial Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Overview of spending, forecasts and recommendations
          </p>
        </div>

        {advisor && (
          <p className="text-xs text-slate-400">
            Updated{" "}
            {new Date(advisor.generated_at).toLocaleString(
              "en-IN",
              {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">
            Loading financial data...
          </p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && !error && (
        <div className="space-y-7">
          {/* Summary Cards */}
          <SummaryCards
            totalPredicted={totalPredicted}
            currentSpending={currentSpending}
            totalBudget={totalBudget}
            highPriority={highPriority}
            anomalyCount={anomalyCount}
            budgetStatus={budgetStatus}
          />

          {/* Forecast */}
          <ForecastChart
            forecast={forecast}
            expenses={expenses}
            budgets={budgets}
            selectedModel="ensemble"
          />

          {/* Recommendations and Recent Expenses */}
          <div className="grid grid-cols-1 gap-7 xl:grid-cols-3">
            <div className="xl:col-span-2">
              {advisor && (
                <Recommendations
                  recommendations={advisor.recommendations}
                />
              )}
            </div>

            <div>
              <RecentExpenses expenses={expenses} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}