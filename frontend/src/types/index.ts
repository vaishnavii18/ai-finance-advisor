export type AnomalySeverity = "Normal" | "Low" | "Medium" | "High";

export interface Recommendation {
  priority: "high" | "medium" | "low";

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

  recommendations: Recommendation[];

  data_quality_note?: string | null;
}

/* --------------------------------
   Expenses
-------------------------------- */

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
  created_at?: string;
}

/* --------------------------------
   Budgets
-------------------------------- */

export interface Budget {
  id: number;
  category: string;
  monthly_limit: number;
  created_at?: string;
}

/* --------------------------------
   Forecast
-------------------------------- */

export interface ForecastPoint {
  date: string;

  predicted_amount: number;
}

export interface ForecastModelResult {
  model: string;
  forecasts: ForecastPoint[];
  mae?: number;
  rmse?: number;
  error?: string;
}

export interface ForecastResponse {
  /*
   * Individual model results
   */
  ARIMA?: ForecastModelResult;

  Prophet?: ForecastModelResult;

  XGBoost?: ForecastModelResult;

  Ensemble?: ForecastModelResult;

  /*
   * General forecast error
   */
  error?: string | null;

  /*
   * Some backend responses may return forecasts
   * directly at the top level.
   */
  forecasts?: ForecastPoint[];
}