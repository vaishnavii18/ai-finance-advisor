import { useEffect, useState } from "react";
import ForecastChart from "../components/ForecastChart";

import {
  getForecast,
  getExpenses,
  getBudgets,
} from "../services/api";

import type {
  Expense,
  Budget,
  ForecastResponse,
  ForecastModelResult,
} from "../types";

type Model =
  | "arima"
  | "prophet"
  | "xgboost"
  | "ensemble";

type ModelKey =
  | "ARIMA"
  | "Prophet"
  | "XGBoost"
  | "Ensemble";

const modelLabels: Record<Model, string> = {
  arima: "ARIMA",
  prophet: "Prophet",
  xgboost: "XGBoost",
  ensemble: "Ensemble",
};

export default function Forecast() {
  const [forecast, setForecast] =
    useState<ForecastResponse | null>(null);

  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  const [budgets, setBudgets] =
    useState<Budget[]>([]);

  const [monthsAhead, setMonthsAhead] =
    useState<number>(3);

  const [model, setModel] =
    useState<Model>("ensemble");

  const [loading, setLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string>("");

  /* --------------------------------
     Load forecast data
  -------------------------------- */

  const loadForecast = async (
    selectedMonths: number = monthsAhead,
    selectedModel: Model = model
  ) => {
    try {
      setLoading(true);
      setError("");

      const [
        forecastData,
        expenseData,
        budgetData,
      ] = await Promise.all([
        getForecast(selectedMonths, selectedModel),
        getExpenses(),
        getBudgets(),
      ]);

      setForecast(forecastData);
      setExpenses(expenseData);
      setBudgets(budgetData);
    } catch (err) {
      console.error("Forecast loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load forecast data."
      );
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------
     Initial load
  -------------------------------- */

  useEffect(() => {
    loadForecast(3, "ensemble");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------
     Generate forecast
  -------------------------------- */

  const handleGenerate = async () => {
    await loadForecast(monthsAhead, model);
  };

  /* --------------------------------
     Selected model
  -------------------------------- */

  const selectedForecast:
    | ForecastModelResult
    | undefined =
    model === "arima"
      ? forecast?.ARIMA
      : model === "prophet"
        ? forecast?.Prophet
        : model === "xgboost"
          ? forecast?.XGBoost
          : forecast?.Ensemble;

  /* --------------------------------
     Model comparison
  -------------------------------- */

  const modelResults: Array<{
    key: ModelKey;
    name: string;
    result: ForecastModelResult | undefined;
  }> = [
    {
      key: "ARIMA",
      name: "ARIMA",
      result: forecast?.ARIMA,
    },
    {
      key: "Prophet",
      name: "Prophet",
      result: forecast?.Prophet,
    },
    {
      key: "XGBoost",
      name: "XGBoost",
      result: forecast?.XGBoost,
    },
    {
      key: "Ensemble",
      name: "Ensemble",
      result: forecast?.Ensemble,
    },
  ];

  /* --------------------------------
     Find best model using MAE
  -------------------------------- */

  const modelsWithMetrics = modelResults.filter(
    (
      item
    ): item is {
      key: ModelKey;
      name: string;
      result: ForecastModelResult;
    } =>
      item.result !== undefined &&
      item.result.mae !== undefined &&
      item.result.mae !== null &&
      Number.isFinite(Number(item.result.mae))
  );

  const bestModel =
    modelsWithMetrics.length > 0
      ? modelsWithMetrics.reduce(
          (best, current) => {
            const bestMae = Number(
              best.result.mae
            );

            const currentMae = Number(
              current.result.mae
            );

            return currentMae < bestMae
              ? current
              : best;
          }
        )
      : undefined;

  /* --------------------------------
     Metrics
  -------------------------------- */

  const selectedMae =
    selectedForecast?.mae;

  const selectedRmse =
    selectedForecast?.rmse;

  /* --------------------------------
     Predicted total
  -------------------------------- */

  const predictedTotal =
    selectedForecast?.forecasts?.reduce(
      (sum, point) =>
        sum +
        Number(point.predicted_amount || 0),
      0
    ) || 0;

  /* --------------------------------
     Currency formatter
  -------------------------------- */

  const formatCurrency = (
    value: number | undefined
  ): string => {
    if (
      value === undefined ||
      value === null ||
      !Number.isFinite(Number(value))
    ) {
      return "N/A";
    }

    return `₹${Number(value).toLocaleString(
      "en-IN",
      {
        maximumFractionDigits: 2,
      }
    )}`;
  };

  const selectedModelName =
    modelLabels[model];

  /* --------------------------------
     Forecast Insights
  -------------------------------- */

  const currentMonth =
    new Date().toISOString().slice(0, 7);

  const currentMonthSpending =
    expenses
      .filter(
        (expense) =>
          expense.date?.slice(0, 7) ===
          currentMonth
      )
      .reduce(
        (sum, expense) =>
          sum +
          Number(expense.amount || 0),
        0
      );

  /*
   * Convert the selected forecast into an
   * average monthly forecast so that it can
   * be compared fairly with one month's spending.
   */

  const averageMonthlyForecast =
    monthsAhead > 0
      ? predictedTotal / monthsAhead
      : predictedTotal;

  const monthlyForecastDifference =
    averageMonthlyForecast -
    currentMonthSpending;

  const monthlyForecastDifferencePercent =
    currentMonthSpending > 0
      ? (monthlyForecastDifference /
          currentMonthSpending) *
        100
      : 0;

  /*
   * This describes the forecast relative to
   * the current month's spending.
   */

  const forecastTrend =
    monthlyForecastDifference > 0
      ? "higher"
      : monthlyForecastDifference < 0
        ? "lower"
        : "stable";

  /*
   * Budgets are monthly limits.
   * Multiply by the forecast period so the
   * comparison uses the same time range.
   */

  const monthlyBudget =
    budgets.reduce(
      (sum, budget) =>
        sum +
        Number(
          budget.monthly_limit || 0
        ),
      0
    );

  const periodBudget =
    monthlyBudget * monthsAhead;

  const forecastVsBudget =
    predictedTotal - periodBudget;

  const forecastExceedsBudget =
    periodBudget > 0 &&
    predictedTotal > periodBudget;

  const budgetUsagePercent =
    periodBudget > 0
      ? (predictedTotal /
          periodBudget) *
        100
      : 0;

  /* --------------------------------
     Render
  -------------------------------- */

  return (
    <div className="space-y-6">

      {/* --------------------------------
          Header
      -------------------------------- */}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Spending Forecast
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Predict your future spending using
          machine learning models.
        </p>
      </div>

      {/* --------------------------------
          Controls
      -------------------------------- */}

      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* Model */}

          <div>
            <label
              htmlFor="forecast-model"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Forecast Model
            </label>

            <select
              id="forecast-model"
              value={model}
              onChange={(e) =>
                setModel(
                  e.target.value as Model
                )
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="arima">
                ARIMA
              </option>

              <option value="prophet">
                Prophet
              </option>

              <option value="xgboost">
                XGBoost
              </option>

              <option value="ensemble">
                Ensemble
              </option>
            </select>
          </div>

          {/* Period */}

          <div>
            <label
              htmlFor="forecast-period"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Forecast Period
            </label>

            <select
              id="forecast-period"
              value={monthsAhead}
              onChange={(e) =>
                setMonthsAhead(
                  Number(e.target.value)
                )
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value={1}>
                1 Month
              </option>

              <option value={3}>
                3 Months
              </option>

              <option value={6}>
                6 Months
              </option>

              <option value={12}>
                12 Months
              </option>
            </select>
          </div>

          {/* Generate */}

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Generating..."
                : "Generate Forecast"}
            </button>
          </div>

        </div>
      </div>

      {/* --------------------------------
          Error
      -------------------------------- */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* --------------------------------
          Loading
      -------------------------------- */}

      {loading && !forecast ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading forecast...
        </div>
      ) : (
        <>

          {/* --------------------------------
              Summary Cards
          -------------------------------- */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            {/* Predicted Spending */}

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">

              <p className="text-sm font-medium text-slate-500">
                Predicted Spending
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                ₹
                {predictedTotal.toLocaleString(
                  "en-IN",
                  {
                    maximumFractionDigits: 0,
                  }
                )}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Next {monthsAhead}{" "}
                {monthsAhead === 1
                  ? "month"
                  : "months"}
              </p>

            </div>

            {/* MAE */}

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">

              <p className="text-sm font-medium text-slate-500">
                MAE
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {formatCurrency(
                  selectedMae
                )}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Lower is better
              </p>

            </div>

            {/* RMSE */}

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">

              <p className="text-sm font-medium text-slate-500">
                RMSE
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {formatCurrency(
                  selectedRmse
                )}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Lower is better
              </p>

            </div>

          </div>

          {/* --------------------------------
              Model Comparison
          -------------------------------- */}

          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">

            {/* Header */}

            <div className="border-b border-slate-100 px-5 py-4">

              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                Model Comparison
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Comparison of forecasting models
                based on historical test data
              </p>

            </div>

            {/* Table */}

            <div className="overflow-x-auto">

              <table className="w-full min-w-[600px]">

                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">

                    <th
                      scope="col"
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Model
                    </th>

                    <th
                      scope="col"
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      MAE
                    </th>

                    <th
                      scope="col"
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      RMSE
                    </th>

                    <th
                      scope="col"
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Status
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {modelResults.map(
                    (item) => {

                      const itemMae =
                        item.result?.mae;

                      const itemRmse =
                        item.result?.rmse;

                      const isBest =
                        bestModel?.key ===
                        item.key;

                      return (
                        <tr
                          key={item.key}
                          className={`border-b border-slate-100 last:border-b-0 ${
                            isBest
                              ? "bg-indigo-50/50"
                              : "bg-white"
                          }`}
                        >

                          {/* Model */}

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-2">

                              <span
                                className={`text-sm font-semibold ${
                                  isBest
                                    ? "text-indigo-700"
                                    : "text-slate-800"
                                }`}
                              >
                                {item.name}
                              </span>

                              {isBest && (
                                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                                  Best
                                </span>
                              )}

                            </div>

                          </td>

                          {/* MAE */}

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatCurrency(
                              itemMae
                            )}
                          </td>

                          {/* RMSE */}

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatCurrency(
                              itemRmse
                            )}
                          </td>

                          {/* Status */}

                          <td className="px-5 py-4">

                            {isBest ? (
                              <span className="inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                Best Model
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400">
                                —
                              </span>
                            )}

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

            {/* Recommendation */}

            {bestModel && (
              <div className="border-t border-slate-100 p-5">

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">

                  <div className="flex items-start gap-3">

                    {/* Icon */}

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-600">
                      ✓
                    </div>

                    {/* Text */}

                    <div className="min-w-0">

                      <p className="text-sm font-semibold text-indigo-700">
                        Recommended Model
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">

                        <span className="font-semibold text-slate-900">
                          {bestModel.name}
                        </span>{" "}
                        is currently the
                        best-performing model
                        with the lowest historical
                        MAE of{" "}

                        <span className="font-semibold text-slate-900">
                          {formatCurrency(
                            Number(
                              bestModel.result.mae
                            )
                          )}
                        </span>.

                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        Lower MAE means the model's
                        predictions were closer to the
                        actual spending values in the
                        historical test data.
                      </p>

                    </div>

                  </div>

                </div>

              </div>
            )}

          </div>

          {/* --------------------------------
              Forecast Chart
          -------------------------------- */}

          <ForecastChart
            forecast={forecast}
            expenses={expenses}
            budgets={budgets}
            selectedModel={model}
          />

          {/* --------------------------------
              Forecast Insights
          -------------------------------- */}

          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">

            <div className="mb-5">

              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                Forecast Insights
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Key insights based on your current
                spending, budget, and selected forecast.
              </p>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

              {/* Spending Trend */}

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">

                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Spending Trend
                </p>

                <p
                  className={`mt-2 text-xl font-semibold ${
                    forecastTrend === "higher"
                      ? "text-amber-600"
                      : forecastTrend === "lower"
                        ? "text-emerald-600"
                        : "text-slate-900"
                  }`}
                >
                  {forecastTrend === "higher"
                    ? "Higher Than Current"
                    : forecastTrend === "lower"
                      ? "Lower Than Current"
                      : "Same As Current"}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Average monthly forecast is{" "}
                  {formatCurrency(
                    averageMonthlyForecast
                  )}.
                </p>

              </div>

              {/* Forecast Difference */}

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">

                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Monthly Difference
                </p>

                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {monthlyForecastDifference >=
                  0
                    ? "+"
                    : ""}
                  {formatCurrency(
                    monthlyForecastDifference
                  )}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">

                  {currentMonthSpending >
                  0
                    ? `${
                        monthlyForecastDifferencePercent >=
                        0
                          ? "+"
                          : ""
                      }${monthlyForecastDifferencePercent.toFixed(
                        1
                      )}% vs current month`
                    : "Not enough current-month spending data"}

                </p>

              </div>

              {/* Budget Outlook */}

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">

                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Budget Outlook
                </p>

                <p
                  className={`mt-2 text-xl font-semibold ${
                    forecastExceedsBudget
                      ? "text-red-600"
                      : "text-emerald-600"
                  }`}
                >
                  {periodBudget > 0
                    ? forecastExceedsBudget
                      ? "Over Budget"
                      : "Within Budget"
                    : "No Budget Set"}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">

                  {periodBudget > 0
                    ? `${budgetUsagePercent.toFixed(
                        1
                      )}% of your ${monthsAhead}-month budget`
                    : "Set a budget to see the forecast outlook"}

                </p>

              </div>

            </div>

            {/* Insight explanation */}

            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">

              <p className="text-sm leading-6 text-slate-600">

                Based on the{" "}
                <span className="font-semibold text-slate-900">
                  {selectedModelName}
                </span>{" "}
                model, your predicted spending for
                the next{" "}
                <span className="font-semibold text-slate-900">
                  {monthsAhead}{" "}
                  {monthsAhead === 1
                    ? "month"
                    : "months"}
                </span>{" "}
                is{" "}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(
                    predictedTotal
                  )}
                </span>.

                {currentMonthSpending >
                  0 && (
                  <>
                    {" "}
                    Your current month's
                    spending is{" "}
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(
                        currentMonthSpending
                      )}
                    </span>
                    , giving an average monthly
                    forecast difference of{" "}
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(
                        monthlyForecastDifference
                      )}
                    </span>
                    .
                  </>
                )}

                {periodBudget > 0 && (
                  <>
                    {" "}
                    For the selected period, your
                    total budget is{" "}
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(
                        periodBudget
                      )}
                    </span>
                    .
                  </>
                )}

              </p>

            </div>

          </div>

          {/* --------------------------------
              Current Forecast
          -------------------------------- */}

          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-sm font-semibold text-slate-900">
                  Current Forecast
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Using {selectedModelName} for
                  the next {monthsAhead}{" "}
                  {monthsAhead === 1
                    ? "month"
                    : "months"}.
                </p>

              </div>

              <span className="w-fit rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600">
                {selectedModelName}
              </span>

            </div>

          </div>

        </>
      )}

    </div>
  );
}