
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { getAnomalyDetection } from "../services/api";

import type {
  AnomalyDetectionResponse,
  AnomalyExpense,
  AnomalySeverity,
} from "../services/api";

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date: string | null): string => {
  if (!date) {
    return "N/A";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getSeverityClasses = (severity?: AnomalySeverity): string => {
  switch (severity) {
    case "High":
      return "bg-red-100 text-red-700 border border-red-200";

    case "Medium":
      return "bg-orange-100 text-orange-700 border border-orange-200";

    case "Low":
      return "bg-yellow-100 text-yellow-700 border border-yellow-200";

    default:
      return "bg-gray-100 text-gray-700 border border-gray-200";
  }
};

const getSeverityIcon = (severity?: AnomalySeverity) => {
  switch (severity) {
    case "High":
      return <ShieldAlert className="h-4 w-4" />;

    case "Medium":
      return <AlertTriangle className="h-4 w-4" />;

    case "Low":
      return <Clock className="h-4 w-4" />;

    default:
      return <CheckCircle className="h-4 w-4" />;
  }
};

const getSeverityLabel = (severity?: AnomalySeverity): string => {
  return severity || "Unknown";
};

export default function Anomalies() {
  const [detectionData, setDetectionData] =
    useState<AnomalyDetectionResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [detecting, setDetecting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("All");

  const runDetection = async () => {
    try {
      setDetecting(true);
      setError("");

      const response = await getAnomalyDetection();

      setDetectionData(response);
    } catch (err) {
      console.error("Anomaly detection failed:", err);

      setError(
        "Unable to run anomaly detection. Please check whether the backend is running."
      );
    } finally {
      setDetecting(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    runDetection();
  }, []);

  const filteredAnomalies = useMemo(() => {
    if (!detectionData?.anomalies) {
      return [];
    }

    const normalizedSearch = searchTerm.toLowerCase().trim();

    return [...detectionData.anomalies]
      .filter((anomaly: AnomalyExpense) => {
        const matchesSearch =
          anomaly.category?.toLowerCase().includes(normalizedSearch) ||
          anomaly.description?.toLowerCase().includes(normalizedSearch) ||
          anomaly.payment_method
            ?.toLowerCase()
            .includes(normalizedSearch) ||
          String(anomaly.amount).includes(normalizedSearch);

        const matchesSeverity =
          severityFilter === "All" ||
          anomaly.severity === severityFilter;

        return matchesSearch && matchesSeverity;
      })
      .sort((first, second) => {
        const firstDate = first.date
          ? new Date(first.date).getTime()
          : 0;

        const secondDate = second.date
          ? new Date(second.date).getTime()
          : 0;

        return secondDate - firstDate;
      });
  }, [detectionData, searchTerm, severityFilter]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />

          <p className="text-sm">
            Loading anomaly detection results...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-red-100 p-2">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Anomaly Detection
            </h1>
          </div>

          <p className="text-sm text-gray-600 sm:text-base">
            Identify unusual spending patterns using machine learning.
          </p>
        </div>

        <button
          type="button"
          onClick={runDetection}
          disabled={detecting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              detecting ? "animate-spin" : ""
            }`}
          />

          {detecting ? "Detecting..." : "Run Detection"}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">Detection Error</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Expenses */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Expenses Analyzed
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {detectionData?.total_expenses ?? 0}
              </p>
            </div>

            <div className="rounded-lg bg-blue-100 p-3">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Total expense records processed
          </p>
        </div>

        {/* Anomaly Count */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Anomalies Detected
              </p>

              <p className="mt-2 text-2xl font-bold text-red-600">
                {detectionData?.anomaly_count ?? 0}
              </p>
            </div>

            <div className="rounded-lg bg-red-100 p-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Unusual expense records identified
          </p>
        </div>

        {/* Anomaly Percentage */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Anomaly Percentage
              </p>

              <p className="mt-2 text-2xl font-bold text-orange-600">
                {detectionData?.anomaly_percentage?.toFixed(2) ?? "0.00"}%
              </p>
            </div>

            <div className="rounded-lg bg-orange-100 p-3">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Percentage of expenses marked as anomalies
          </p>
        </div>

        {/* Total Amount */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Anomaly Amount
              </p>

              <p className="mt-2 text-2xl font-bold text-purple-600">
                {formatCurrency(
                  detectionData?.total_anomaly_amount ?? 0
                )}
              </p>
            </div>

            <div className="rounded-lg bg-purple-100 p-3">
              <Wallet className="h-6 w-6 text-purple-600" />
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Combined amount of detected anomalies
          </p>
        </div>
      </div>

      {/* Severity Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Severity Breakdown
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Distribution of detected anomalies by severity level.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* High */}
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-red-600" />

              <div>
                <p className="text-sm font-medium text-red-700">
                  High
                </p>

                <p className="text-xs text-red-600">
                  High severity anomalies
                </p>
              </div>
            </div>

            <p className="text-xl font-bold text-red-700">
              {detectionData?.severity_counts?.High ?? 0}
            </p>
          </div>

          {/* Medium */}
          <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />

              <div>
                <p className="text-sm font-medium text-orange-700">
                  Medium
                </p>

                <p className="text-xs text-orange-600">
                  Medium severity anomalies
                </p>
              </div>
            </div>

            <p className="text-xl font-bold text-orange-700">
              {detectionData?.severity_counts?.Medium ?? 0}
            </p>
          </div>

          {/* Low */}
          <div className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-600" />

              <div>
                <p className="text-sm font-medium text-yellow-700">
                  Low
                </p>

                <p className="text-xs text-yellow-600">
                  Low severity anomalies
                </p>
              </div>
            </div>

            <p className="text-xl font-bold text-yellow-700">
              {detectionData?.severity_counts?.Low ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Anomaly Records */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Table Header */}
        <div className="border-b border-gray-200 p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Detected Anomalies
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Review unusual transactions identified by the model.
              </p>
            </div>

            <div className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-900">
                {filteredAnomalies.length}
              </span>{" "}
              records
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mt-5 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search category, description, payment method..."
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={severityFilter}
              onChange={(event) =>
                setSeverityFilter(event.target.value)
              }
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="All">All Severities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Date
                </th>

                <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Category
                </th>

                <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Description
                </th>

                <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Payment Method
                </th>

                <th className="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Amount
                </th>

                <th className="whitespace-nowrap px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Score
                </th>

                <th className="whitespace-nowrap px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Severity
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredAnomalies.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <CheckCircle className="mb-3 h-10 w-10 text-green-500" />

                      <p className="font-medium text-gray-900">
                        No anomalies found
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Try changing your search or severity filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAnomalies.map((anomaly: AnomalyExpense) => (
                  <tr
                    key={anomaly.id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                      {formatDate(anomaly.date)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="rounded-md bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-700">
                        {anomaly.category || "Uncategorized"}
                      </span>
                    </td>

                    <td className="max-w-[220px] px-5 py-4 text-sm text-gray-700">
                      <p className="truncate">
                        {anomaly.description || "No description"}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                      {anomaly.payment_method || "N/A"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(anomaly.amount)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-center text-sm text-gray-600">
                      {typeof anomaly.anomaly_score === "number"
                        ? anomaly.anomaly_score.toFixed(4)
                        : "N/A"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${getSeverityClasses(
                          anomaly.severity
                        )}`}
                      >
                        {getSeverityIcon(anomaly.severity)}

                        {getSeverityLabel(anomaly.severity)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {filteredAnomalies.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 px-5 py-4">
            <p className="text-xs text-gray-500">
              Anomaly scores represent model-generated indicators and
              are not probability values. Severity labels are based on
              configured score thresholds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}