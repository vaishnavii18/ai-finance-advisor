import pandas as pd
from datetime import timedelta
from typing import List, Dict

import shap

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False


# =========================================================
# XGBOOST SHAP EXPLAINABILITY
# =========================================================

FEATURES = [
    "day",
    "month",
    "dayofweek",
    "lag1",
    "lag7",
]


def explain_xgboost_forecast(
    expenses: List[dict],
    periods: int = 30,
) -> Dict:
    """
    Explain the existing XGBoost forecasting model using SHAP.

    The feature engineering and XGBoost configuration are kept
    consistent with forecasting.py.

    Features:
        - day
        - month
        - dayofweek
        - lag1
        - lag7

    Returns:
        SHAP explanations for the forecast horizon and
        aggregated feature importance.
    """

    if not XGBOOST_AVAILABLE:
        return {
            "error": "XGBoost is not installed."
        }

    if not expenses:
        return {
            "error": "No expense data available."
        }

    try:
        # =====================================================
        # PREPARE DATA
        # =====================================================

        df = pd.DataFrame(expenses)

        if "date" not in df.columns or "amount" not in df.columns:
            return {
                "error": "Expense data must contain date and amount."
            }

        df["date"] = pd.to_datetime(df["date"])

        # Aggregate expenses occurring on the same day.
        df = (
            df.groupby("date")["amount"]
            .sum()
            .reset_index()
        )

        df = df.sort_values("date")

        # Fill missing dates with zero spending.
        full_range = pd.date_range(
            start=df["date"].min(),
            end=df["date"].max(),
            freq="D",
        )

        df = (
            df.set_index("date")
            .reindex(
                full_range,
                fill_value=0,
            )
            .rename_axis("date")
            .reset_index()
        )

        df.columns = [
            "ds",
            "y",
        ]

        if len(df) < 14:
            return {
                "error": (
                    "Not enough data. Please add at least "
                    "14 days of expenses."
                )
            }

        # =====================================================
        # CREATE SAME FEATURES AS forecasting.py
        # =====================================================

        data = df.copy()

        data["day"] = data["ds"].dt.day
        data["month"] = data["ds"].dt.month
        data["dayofweek"] = data["ds"].dt.dayofweek

        data["lag1"] = data["y"].shift(1)
        data["lag7"] = data["y"].shift(7)

        data = data.dropna()

        if len(data) < 7:
            return {
                "error": (
                    "Not enough historical observations "
                    "for SHAP explanation."
                )
            }

        X = data[FEATURES]
        y = data["y"]

        # =====================================================
        # TRAIN SAME XGBOOST MODEL
        # =====================================================

        model = xgb.XGBRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=4,
            objective="reg:squarederror",
        )

        model.fit(
            X,
            y,
        )

        # =====================================================
        # SHAP EXPLAINER
        # =====================================================

        explainer = shap.TreeExplainer(model)

        # =====================================================
        # RECURSIVE FUTURE FORECAST
        # =====================================================

        last_row = data.iloc[-1]

        current_date = data["ds"].max()

        lag1 = float(
            last_row["y"]
        )

        lag7_values = list(
            data["y"].tail(7)
        )

        explanations = []

        feature_abs_contributions = {
            feature: []
            for feature in FEATURES
        }

        # Limit to a reasonable horizon.
        periods = max(
            1,
            min(int(periods), 90),
        )

        for _ in range(periods):

            current_date += timedelta(
                days=1
            )

            # ---------------------------------------------
            # Same future features as forecasting.py
            # ---------------------------------------------

            day = current_date.day
            month = current_date.month
            dayofweek = current_date.dayofweek

            lag7 = float(
                lag7_values[0]
            )

            X_pred = pd.DataFrame(
                [
                    {
                        "day": day,
                        "month": month,
                        "dayofweek": dayofweek,
                        "lag1": lag1,
                        "lag7": lag7,
                    }
                ]
            )

            # ---------------------------------------------
            # Prediction
            # ---------------------------------------------

            prediction = max(
                0,
                float(
                    model.predict(
                        X_pred
                    )[0]
                ),
            )

            # ---------------------------------------------
            # SHAP values
            # ---------------------------------------------

            shap_values = explainer.shap_values(
                X_pred
            )

            # SHAP may return a numpy array.
            shap_row = shap_values[0]

            # Expected/base value.
            expected_value = explainer.expected_value

            if hasattr(
                expected_value,
                "item",
            ):
                base_value = float(
                    expected_value.item()
                )
            elif isinstance(
                expected_value,
                (list, tuple),
            ):
                base_value = float(
                    expected_value[0]
                )
            else:
                try:
                    base_value = float(
                        expected_value
                    )
                except (TypeError, ValueError):
                    base_value = 0.0

            feature_contributions = []

            for index, feature in enumerate(FEATURES):

                shap_value = float(
                    shap_row[index]
                )

                feature_value = float(
                    X_pred.iloc[0][feature]
                )

                feature_abs_contributions[
                    feature
                ].append(
                    abs(shap_value)
                )

                if shap_value > 0:
                    direction = "increases_prediction"
                elif shap_value < 0:
                    direction = "decreases_prediction"
                else:
                    direction = "neutral"

                feature_contributions.append(
                    {
                        "feature": feature,
                        "value": round(
                            feature_value,
                            4,
                        ),
                        "shap_value": round(
                            shap_value,
                            4,
                        ),
                        "direction": direction,
                    }
                )

            explanations.append(
                {
                    "date": current_date.strftime(
                        "%Y-%m-%d"
                    ),
                    "predicted_amount": round(
                        prediction,
                        2,
                    ),
                    "base_value": round(
                        base_value,
                        4,
                    ),
                    "feature_contributions":
                        feature_contributions,
                }
            )

            # ---------------------------------------------
            # Update recursive lag values
            # ---------------------------------------------

            lag7_values.pop(0)

            lag7_values.append(
                prediction
            )

            lag1 = prediction

        # =====================================================
        # AGGREGATED SHAP IMPORTANCE
        # =====================================================

        feature_importance = []

        for feature in FEATURES:

            values = (
                feature_abs_contributions[
                    feature
                ]
            )

            mean_abs_shap = (
                sum(values) / len(values)
                if values
                else 0
            )

            feature_importance.append(
                {
                    "feature": feature,
                    "mean_absolute_shap":
                        round(
                            float(
                                mean_abs_shap
                            ),
                            4,
                        ),
                }
            )

        # Highest contribution first.
        feature_importance.sort(
            key=lambda item:
                item["mean_absolute_shap"],
            reverse=True,
        )

        # =====================================================
        # RETURN
        # =====================================================

        return {
            "status": "success",
            "model": "XGBoost",
            "explainer": "SHAP TreeExplainer",
            "features": FEATURES,
            "forecast_horizon": periods,
            "feature_importance": feature_importance,
            "explanations": explanations,
        }

    except Exception as e:

        return {
            "status": "error",
            "error": str(e),
        }