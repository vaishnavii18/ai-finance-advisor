
import { useState } from "react";
import {
  getAdvisorRecommendations,
  type AdvisorResponse,
  type AdvisorRecommendation,
} from "../services/api";

const priorityStyles = {
  high: {
    border: "border-red-200",
    background: "bg-red-50",
    badge: "bg-red-100 text-red-700",
    label: "High Priority",
  },
  medium: {
    border: "border-orange-200",
    background: "bg-orange-50",
    badge: "bg-orange-100 text-orange-700",
    label: "Medium Priority",
  },
  low: {
    border: "border-green-200",
    background: "bg-green-50",
    badge: "bg-green-100 text-green-700",
    label: "Low Priority",
  },
};

function RecommendationCard({
  recommendation,
}: {
  recommendation: AdvisorRecommendation;
}) {
  const style =
    priorityStyles[recommendation.priority] || priorityStyles.low;

  return (
    <div
      className={`rounded-xl border ${style.border} bg-white p-5 shadow-sm`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${style.badge}`}
        >
          {style.label}
        </span>

        {recommendation.category && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
            {recommendation.category}
          </span>
        )}
      </div>

      <h3 className="mb-2 text-lg font-semibold text-gray-900">
        {recommendation.title}
      </h3>

      <p className="mb-3 text-sm leading-6 text-gray-600">
        {recommendation.message}
      </p>

      {recommendation.impact && (
        <div className={`mb-4 rounded-lg p-3 ${style.background}`}>
          <p className="text-sm font-medium text-gray-700">
            Impact: {recommendation.impact}
          </p>
        </div>
      )}

      {recommendation.suggested_actions &&
        recommendation.suggested_actions.length > 0 && (
          <div className="mb-4">
            <h4 className="mb-2 text-sm font-semibold text-gray-800">
              Suggested Actions
            </h4>

            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
              {recommendation.suggested_actions.map((action, index) => (
                <li key={`${action}-${index}`}>{action}</li>
              ))}
            </ul>
          </div>
        )}

      {recommendation.explanation && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs leading-5 text-gray-500">
            <span className="font-semibold">Explanation:</span>{" "}
            {recommendation.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Advisor() {
  const [advisorData, setAdvisorData] = useState<AdvisorResponse | null>(
    null
  );

  const [forecastDays, setForecastDays] = useState(30);
  const [lookbackDays, setLookbackDays] = useState(60);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAdvisorRecommendations(
        forecastDays,
        lookbackDays
      );

      setAdvisorData(data);
    } catch (err) {
      console.error("Advisor request failed:", err);

      setError(
        "Unable to generate recommendations. Please check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const highCount =
    advisorData?.recommendations.filter(
      (recommendation) => recommendation.priority === "high"
    ).length ?? 0;

  const mediumCount =
    advisorData?.recommendations.filter(
      (recommendation) => recommendation.priority === "medium"
    ).length ?? 0;

  const lowCount =
    advisorData?.recommendations.filter(
      (recommendation) => recommendation.priority === "low"
    ).length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-xl bg-purple-100 p-3 text-2xl">
                🤖
              </div>

              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  AI Financial Advisor
                </h1>

                <p className="mt-1 text-gray-500">
                  Personalized insights based on your financial data.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={loadRecommendations}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Generating..." : "Generate Insights"}
          </button>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Analysis Settings
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Forecast Period
              <select
                value={forecastDays}
                onChange={(event) =>
                  setForecastDays(Number(event.target.value))
                }
                className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Historical Lookback Period
              <select
                value={lookbackDays}
                onChange={(event) =>
                  setLookbackDays(Number(event.target.value))
                }
                className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
              </select>
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!advisorData && !loading && !error && (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <div className="mb-3 text-4xl">💡</div>

            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Get Your Personalized Financial Insights
            </h2>

            <p className="mx-auto max-w-xl text-sm leading-6 text-gray-500">
              Generate recommendations using forecasting, anomaly detection,
              and budget analysis.
            </p>

            <button
              onClick={loadRecommendations}
              className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Start Analysis
            </button>
          </div>
        )}

        {loading && (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <div className="mb-3 text-3xl">⏳</div>

            <p className="text-gray-600">
              Analyzing your expenses and generating recommendations...
            </p>
          </div>
        )}

        {advisorData && !loading && (
          <>
            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
              <h2 className="mb-2 text-lg font-semibold text-blue-900">
                Financial Summary
              </h2>

              <p className="text-sm leading-6 text-blue-800">
                {advisorData.summary}
              </p>

              <p className="mt-3 text-xs text-blue-600">
                Forecast period: {advisorData.period_days} days
              </p>
            </div>

            {advisorData.data_quality_note && (
              <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                <span className="font-semibold">Data Quality Notice: </span>
                {advisorData.data_quality_note}
              </div>
            )}

            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">High Priority</p>
                <p className="mt-2 text-3xl font-bold text-red-600">
                  {highCount}
                </p>
              </div>

              <div className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Medium Priority</p>
                <p className="mt-2 text-3xl font-bold text-orange-600">
                  {mediumCount}
                </p>
              </div>

              <div className="rounded-xl border border-green-100 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Low Priority</p>
                <p className="mt-2 text-3xl font-bold text-green-600">
                  {lowCount}
                </p>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Recommendations
              </h2>

              <span className="text-sm text-gray-500">
                {advisorData.recommendations.length} insights
              </span>
            </div>

            {advisorData.recommendations.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                No recommendations were generated for this period.
              </div>
            ) : (
              <div className="space-y-4">
                {advisorData.recommendations.map((recommendation, index) => (
                  <RecommendationCard
                    key={`${recommendation.title}-${index}`}
                    recommendation={recommendation}
                  />
                ))}
              </div>
            )}

            <p className="mt-8 text-center text-xs leading-5 text-gray-400">
              Recommendations are generated from your stored financial data
              and should be reviewed before making financial decisions.
            </p>
          </>
        )}
      </div>
    </div>
  );
}