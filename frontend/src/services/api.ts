
import axios from "axios";
const TOKEN_KEY = "finance_advisor_token";

// ============================================================
// AXIOS INSTANCE
// ============================================================

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});


// ============================================================
// AUTHENTICATION INTERCEPTOR
// ============================================================

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
// ============================================================
// COMMON TYPES
// ============================================================

export type AnomalySeverity = "Normal" | "Low" | "Medium" | "High";

export interface Expense {
  id: number;
  date: string | null;
  amount: number;
  category: string;
  description: string | null;
  payment_method: string | null;
  is_anomaly?: boolean;
  anomaly_score?: number;
  severity?: AnomalySeverity;
}

export interface ExpenseCreate {
  date: string;
  amount: number;
  category: string;
  description?: string;
  payment_method?: string;
}

export interface Budget {
  id: number;
  category: string;
  monthly_limit: number;
}

export interface BudgetCreate {
  category: string;
  monthly_limit: number;
}

// ============================================================
// EXPENSE API
// ============================================================

export const getExpenses = async (): Promise<Expense[]> => {
  const response = await api.get("/expenses/");

  return response.data;
};

export const createExpense = async (
  expense: ExpenseCreate
): Promise<Expense> => {
  const response = await api.post("/expenses/", expense);

  return response.data;
};

export const deleteExpense = async (
  expenseId: number
): Promise<void> => {
  await api.delete(`/expenses/${expenseId}`);
};

// ============================================================
// BUDGET API
// ============================================================

export const getBudgets = async (): Promise<Budget[]> => {
  const response = await api.get("/budgets/");

  return response.data;
};

export const createBudget = async (
  budget: BudgetCreate
): Promise<Budget> => {
  const response = await api.post("/budgets/", budget);

  return response.data;
};

// ============================================================
// BUDGET OPTIMIZATION
// ============================================================

export interface BudgetOptimizationRequest {
  total_budget?: number;
  savings_goal: number;
}

export interface BudgetOptimizationRecommendation {
  category: string;
  current_budget: number;
  average_monthly_spending: number;
  target_allocation: number;
  recommended_budget: number;
  difference: number;
  percentage_change: number;
  action: "Reduce" | "Maintain" | "Increase";
}

export interface BudgetOptimizationResponse {
  status: string;
  optimization_status: string;
  total_budget: number;
  savings_goal: number;
  available_budget: number;
  optimized_total: number;
  remaining_amount: number;
  recommendations: BudgetOptimizationRecommendation[];
}

export const optimizeBudget = async (
  request: BudgetOptimizationRequest
): Promise<BudgetOptimizationResponse> => {
  const response = await api.post("/budgets/optimize", request);

  return response.data;
};

// ============================================================
// FORECAST API
// ============================================================

export interface ForecastRequest {
  periods?: number;
  model?: string;
}

export interface ForecastPoint {
  date: string;
  predicted_amount: number;
  amount?: number;
}

export interface ForecastModelResult {
  model: string;
  forecasts?: ForecastPoint[];
  predictions?: ForecastPoint[];
  forecast?: ForecastPoint[];
  mae?: number;
  rmse?: number;
  error?: string;
}

export interface ForecastResponse {
  status?: string;
  model?: string;

  ARIMA?: ForecastModelResult;
  Prophet?: ForecastModelResult;
  XGBoost?: ForecastModelResult;
  Ensemble?: ForecastModelResult;

  forecast?: ForecastPoint[];
  predictions?: ForecastPoint[];
  models?: Record<string, ForecastModelResult>;
  ensemble?: ForecastPoint[];
  insights?: string[];

  error?: string | null;

  [key: string]: unknown;
}

export const getForecast = async (
  periods: number = 30,
  model: string = "ensemble"
): Promise<ForecastResponse> => {
  const response = await api.post("/forecast/", {
    periods,
    model,
  });

  return response.data;
};
// ============================================================
// ANOMALY DETECTION API
// ============================================================

export interface AnomalyExpense {
  id: number;
  date: string | null;
  amount: number;
  category: string;
  description: string | null;
  payment_method: string | null;
  is_anomaly: boolean;
  anomaly_score?: number;
  severity?: AnomalySeverity;
}

export interface AnomalySeverityCounts {
  High: number;
  Medium: number;
  Low: number;
}

export interface AnomalyDetectionResponse {
  status: string;
  total_expenses: number;
  anomaly_count: number;
  anomaly_percentage: number;
  total_anomaly_amount: number;
  severity_counts: AnomalySeverityCounts;
  anomalies: AnomalyExpense[];
}

export interface AnomalyListResponse {
  status: string;
  anomaly_count: number;
  anomalies: AnomalyExpense[];
}

/**
 * Run the machine-learning anomaly detection process.
 *
 * Backend endpoint:
 * GET /anomaly/detect
 */

export const getAnomalyDetection = async (): Promise<AnomalyDetectionResponse> => {
  const response = await api.get("/anomaly/detect");

  return response.data;
};

/**
 * Retrieve previously detected anomaly records.
 *
 * Backend endpoint:
 * GET /anomaly/list
 */

export const getAnomalyList = async (): Promise<AnomalyListResponse> => {
  const response = await api.get("/anomaly/list");

  return response.data;
};

// ============================================================
// AI FINANCIAL ADVISOR API
// ============================================================

export type RecommendationPriority = "high" | "medium" | "low";

export interface AdvisorRecommendation {
  priority: RecommendationPriority;
  category?: string | null;
  title: string;
  message: string;
  impact?: string | null;
  suggested_actions: string[];
  explanation?: string | null;
}

export interface AdvisorResponse {
  generated_at: string;
  period_days: number;
  summary: string;
  recommendations: AdvisorRecommendation[];
  data_quality_note?: string | null;
}

/**
 * Generate personalized financial recommendations.
 *
 * Backend endpoint:
 * GET /advisor/recommendations
 *
 * @param forecastDays - Number of future days to forecast.
 * @param lookbackDays - Number of historical days to analyze.
 */

export const getAdvisorRecommendations = async (
  forecastDays: number = 30,
  lookbackDays: number = 60
): Promise<AdvisorResponse> => {
  const response = await api.get("/advisor/recommendations", {
    params: {
      forecast_days: forecastDays,
      lookback_days: lookbackDays,
    },
  });

  return response.data;
};

// ============================================================
// EXPLAINABILITY API
// ============================================================

export interface ExplainabilityFeature {
  feature: string;
  importance: number;
  mean_abs_shap?: number;
  direction?: string;
}

export interface ExplainabilityResponse {
  status: string;
  model: string;
  explainer: string;
  periods: number;
  feature_importance?: ExplainabilityFeature[];
  shap_values?: Record<string, unknown>[];
  explanations?: Record<string, unknown>[];
  [key: string]: unknown;
}

export const getExplainability = async (
  periods: number = 30
): Promise<ExplainabilityResponse> => {
  const response = await api.get("/explainability/xgboost", {
    params: {
      periods,
    },
  });

  return response.data;
};

// ============================================================
// API ERROR HELPER
// ============================================================

export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.detail) {
      return String(error.response.data.detail);
    }

    if (error.message) {
      return error.message;
    }

    return "An API request failed.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
};

// ============================================================
// EXPORT AXIOS INSTANCE
// ============================================================

export default api;