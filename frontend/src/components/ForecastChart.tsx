import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";

import type {
    Expense,
    Budget,
    ForecastResponse,
    ForecastPoint,
} from "../services/api";

type Model =
    | "arima"
    | "prophet"
    | "xgboost"
    | "ensemble";

type ForecastModelKey =
    | "ARIMA"
    | "Prophet"
    | "XGBoost"
    | "Ensemble";

interface ForecastChartProps {
    forecast: ForecastResponse | null;
    expenses: Expense[];
    budgets: Budget[];
    selectedModel: Model;
}

interface ChartData {
    month: string;
    actual?: number;
    forecast?: number;
    budget?: number;
}

const modelKeyMap: Record<Model, ForecastModelKey> = {
    arima: "ARIMA",
    prophet: "Prophet",
    xgboost: "XGBoost",
    ensemble: "Ensemble",
};

export default function ForecastChart({
    forecast,
    expenses,
    budgets,
    selectedModel,
}: ForecastChartProps) {
    /* --------------------------------
       Selected model
    -------------------------------- */

    const modelKey = modelKeyMap[selectedModel];

    const selectedForecast: ForecastPoint[] =
        forecast?.[modelKey]?.forecasts ?? [];

    /* --------------------------------
       Actual spending by month
    -------------------------------- */

    const actualByMonth: Record<string, number> = {};

    expenses.forEach((expense) => {
        if (!expense.date) return;

        const month = expense.date.slice(0, 7);

        actualByMonth[month] =
            (actualByMonth[month] ?? 0) + Number(expense.amount || 0);
    });

    /* --------------------------------
       Forecast spending by month
    -------------------------------- */

    const forecastByMonth: Record<string, number> = {};

    selectedForecast.forEach((point) => {
        if (!point.date) return;

        const month = point.date.slice(0, 7);

        forecastByMonth[month] =
            (forecastByMonth[month] ?? 0) +
            Number(point.predicted_amount || 0);
    });

    /* --------------------------------
       Total monthly budget
    -------------------------------- */

    const totalBudget = budgets.reduce(
        (sum, budget) =>
            sum + Number(budget.monthly_limit || 0),
        0
    );

    /* --------------------------------
       Combine all months
    -------------------------------- */

    const months = Array.from(
        new Set([
            ...Object.keys(actualByMonth),
            ...Object.keys(forecastByMonth),
        ])
    ).sort();

    /* --------------------------------
       Format month label
    -------------------------------- */

    const formatMonth = (month: string) => {
        const date = new Date(`${month}-01T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            return month;
        }

        return date.toLocaleDateString("en-IN", {
            month: "short",
            year: "numeric",
        });
    };

    /* --------------------------------
       Chart data
    -------------------------------- */

    const chartData: ChartData[] = months.map(
        (month) => ({
            month: formatMonth(month),

            actual:
                actualByMonth[month] !== undefined
                    ? actualByMonth[month]
                    : undefined,

            forecast:
                forecastByMonth[month] !== undefined
                    ? forecastByMonth[month]
                    : undefined,

            budget:
                totalBudget > 0
                    ? totalBudget
                    : undefined,
        })
    );

    /* --------------------------------
       No data
    -------------------------------- */

    const hasChartData =
        chartData.length > 0 &&
        (Object.keys(actualByMonth).length > 0 ||
            Object.keys(forecastByMonth).length > 0);

    return (
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">

            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">

                <div>
                    <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                        Spending Forecast
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                        Actual vs {modelKey} forecast vs budget
                    </p>
                </div>

                <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600">
                    {modelKey}
                </span>

            </div>

            {/* Chart */}
            <div className="px-2 pb-4 pt-4 sm:px-4">

                <div className="h-[320px] w-full">

                    {!hasChartData ? (
                        <div className="flex h-full items-center justify-center text-sm text-slate-500">
                            No forecast data available.
                        </div>
                    ) : (
                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >
                            <LineChart
                                data={chartData}
                                margin={{
                                    top: 8,
                                    right: 16,
                                    left: 0,
                                    bottom: 0,
                                }}
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#e2e8f0"
                                    vertical={false}
                                />

                                <XAxis
                                    dataKey="month"
                                    tick={{
                                        fill: "#64748b",
                                        fontSize: 12,
                                    }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={8}
                                />

                                <YAxis
                                    tick={{
                                        fill: "#64748b",
                                        fontSize: 12,
                                    }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value: number) =>
                                        `₹${(Number(value) / 1000).toFixed(0)}k`
                                    }
                                    width={55}
                                />

                                <Tooltip
                                    formatter={(value) => [
                                        `₹${Number(value ?? 0).toLocaleString("en-IN", {
                                            maximumFractionDigits: 0,
                                        })}`,
                                    ]}
                                    labelStyle={{
                                        color: "#334155",
                                        fontWeight: 600,
                                    }}
                                    contentStyle={{
                                        borderRadius: "8px",
                                        border: "1px solid #e2e8f0",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                                        fontSize: "13px",
                                    }}
                                />

                                <Legend
                                    verticalAlign="top"
                                    height={36}
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{
                                        fontSize: "12px",
                                        color: "#64748b",
                                    }}
                                />

                                {/* Actual Spending */}
                                <Line
                                    type="monotone"
                                    dataKey="actual"
                                    name="Actual"
                                    stroke="#4f46e5"
                                    strokeWidth={2.5}
                                    dot={{
                                        r: 3,
                                        strokeWidth: 0,
                                        fill: "#4f46e5",
                                    }}
                                    activeDot={{ r: 5 }}
                                    connectNulls={false}
                                />

                                {/* Forecast */}
                                <Line
                                    type="monotone"
                                    dataKey="forecast"
                                    name={`${modelKey} Forecast`}
                                    stroke="#f59e0b"
                                    strokeWidth={2.5}
                                    strokeDasharray="5 4"
                                    dot={{
                                        r: 3,
                                        strokeWidth: 0,
                                        fill: "#f59e0b",
                                    }}
                                    activeDot={{ r: 5 }}
                                    connectNulls={false}
                                />

                                {/* Budget */}
                                {totalBudget > 0 && (
                                    <Line
                                        type="monotone"
                                        dataKey="budget"
                                        name="Budget"
                                        stroke="#10b981"
                                        strokeWidth={1.5}
                                        strokeDasharray="3 3"
                                        dot={false}
                                        connectNulls
                                    />
                                )}

                            </LineChart>
                        </ResponsiveContainer>
                    )}

                </div>
            </div>
        </div>
    );
}