import pandas as pd
import numpy as np
from datetime import timedelta
from typing import List, Dict

from sklearn.metrics import mean_absolute_error, mean_squared_error

import warnings

warnings.filterwarnings("ignore")


# =========================================================
# OPTIONAL LIBRARIES
# =========================================================

try:
    from prophet import Prophet

    PROPHET_AVAILABLE = True

except ImportError:
    PROPHET_AVAILABLE = False


try:
    import xgboost as xgb

    XGBOOST_AVAILABLE = True

except ImportError:
    XGBOOST_AVAILABLE = False


from statsmodels.tsa.arima.model import ARIMA


# =========================================================
# DATA PREPARATION
# =========================================================

def prepare_time_series(
    expenses: List[dict]
) -> pd.DataFrame:
    """
    Convert expense records into a daily time series.

    Missing dates are filled with zero spending.
    """

    if not expenses:
        return pd.DataFrame()

    df = pd.DataFrame(expenses)

    df["date"] = pd.to_datetime(
        df["date"]
    )

    # Aggregate expenses occurring on the same date
    df = (
        df.groupby("date")["amount"]
        .sum()
        .reset_index()
    )

    df = df.sort_values("date")

    # Fill missing dates with zero
    full_range = pd.date_range(
        start=df["date"].min(),
        end=df["date"].max(),
        freq="D"
    )

    df = (
        df.set_index("date")
        .reindex(
            full_range,
            fill_value=0
        )
        .rename_axis("date")
        .reset_index()
    )

    # Prophet-compatible column names
    df.columns = [
        "ds",
        "y"
    ]

    return df


# =========================================================
# ARIMA
# =========================================================

def forecast_arima(
    df: pd.DataFrame,
    periods: int = 30
) -> Dict:
    """
    Generate a daily ARIMA forecast.
    """

    try:

        model = ARIMA(
            df["y"],
            order=(2, 1, 2)
        )

        fitted = model.fit()

        forecast = fitted.forecast(
            steps=periods
        )

        future_dates = pd.date_range(
            start=(
                df["ds"].max()
                + timedelta(days=1)
            ),
            periods=periods,
            freq="D"
        )

        forecasts = []

        for date, value in zip(
            future_dates,
            forecast
        ):

            forecasts.append(
                {
                    "date": date.strftime(
                        "%Y-%m-%d"
                    ),
                    "predicted_amount": max(
                        0,
                        float(value)
                    )
                }
            )

        return {
            "model": "ARIMA",
            "forecasts": forecasts
        }

    except Exception as e:

        return {
            "model": "ARIMA",
            "error": str(e),
            "forecasts": []
        }


# =========================================================
# PROPHET
# =========================================================

def forecast_prophet(
    df: pd.DataFrame,
    periods: int = 30
) -> Dict:
    """
    Generate a daily Prophet forecast.
    """

    if not PROPHET_AVAILABLE:

        return {
            "model": "Prophet",
            "error": "Prophet not installed",
            "forecasts": []
        }

    try:

        model = Prophet(
            daily_seasonality=False,
            weekly_seasonality=True
        )

        model.fit(df)

        future = model.make_future_dataframe(
            periods=periods
        )

        forecast = model.predict(
            future
        )

        forecast = forecast.tail(
            periods
        )

        forecasts = []

        for _, row in forecast.iterrows():

            forecasts.append(
                {
                    "date": row["ds"].strftime(
                        "%Y-%m-%d"
                    ),
                    "predicted_amount": max(
                        0,
                        float(row["yhat"])
                    )
                }
            )

        return {
            "model": "Prophet",
            "forecasts": forecasts
        }

    except Exception as e:

        return {
            "model": "Prophet",
            "error": str(e),
            "forecasts": []
        }


# =========================================================
# XGBOOST
# =========================================================

def forecast_xgboost(
    df: pd.DataFrame,
    periods: int = 30
) -> Dict:
    """
    Generate an XGBoost forecast using
    calendar and lag-based features.
    """

    if not XGBOOST_AVAILABLE:

        return {
            "model": "XGBoost",
            "error": "XGBoost not installed",
            "forecasts": []
        }

    try:

        data = df.copy()

        # -------------------------------------------------
        # Calendar features
        # -------------------------------------------------

        data["day"] = data["ds"].dt.day

        data["month"] = (
            data["ds"].dt.month
        )

        data["dayofweek"] = (
            data["ds"].dt.dayofweek
        )

        # -------------------------------------------------
        # Lag features
        # -------------------------------------------------

        data["lag1"] = (
            data["y"].shift(1)
        )

        data["lag7"] = (
            data["y"].shift(7)
        )

        data = data.dropna()

        # -------------------------------------------------
        # Features
        # -------------------------------------------------

        features = [
            "day",
            "month",
            "dayofweek",
            "lag1",
            "lag7"
        ]

        X = data[features]

        y = data["y"]

        # -------------------------------------------------
        # XGBoost model
        # -------------------------------------------------

        model = xgb.XGBRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=4,
            objective="reg:squarederror"
        )

        model.fit(
            X,
            y
        )

        # -------------------------------------------------
        # Future prediction
        # -------------------------------------------------

        last_row = data.iloc[-1]

        predictions = []

        current_date = data["ds"].max()

        lag1 = float(
            last_row["y"]
        )

        lag7_values = list(
            data["y"].tail(7)
        )

        for _ in range(periods):

            current_date += timedelta(
                days=1
            )

            day = current_date.day

            month = current_date.month

            dayofweek = (
                current_date.dayofweek
            )

            # First value represents
            # the value from 7 days ago
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
                        "lag7": lag7
                    }
                ]
            )

            pred = max(
                0,
                float(
                    model.predict(
                        X_pred
                    )[0]
                )
            )

            predictions.append(
                {
                    "date": current_date.strftime(
                        "%Y-%m-%d"
                    ),
                    "predicted_amount": pred
                }
            )

            # Update recursive lag values
            lag7_values.pop(0)

            lag7_values.append(
                pred
            )

            lag1 = pred

        return {
            "model": "XGBoost",
            "forecasts": predictions
        }

    except Exception as e:

        return {
            "model": "XGBoost",
            "error": str(e),
            "forecasts": []
        }


# =========================================================
# MODEL EVALUATION
# =========================================================

def evaluate_forecast(
    actual: List[float],
    predicted: List[float]
) -> Dict:
    """
    Calculate MAE and RMSE.
    """

    if not actual or not predicted:
        return {}

    n = min(
        len(actual),
        len(predicted)
    )

    actual = actual[:n]

    predicted = predicted[:n]

    if n == 0:
        return {}

    mae = mean_absolute_error(
        actual,
        predicted
    )

    rmse = np.sqrt(
        mean_squared_error(
            actual,
            predicted
        )
    )

    return {
        "mae": round(
            float(mae),
            2
        ),
        "rmse": round(
            float(rmse),
            2
        )
    }


# =========================================================
# MODEL VALIDATION
# =========================================================

def validate_models(
    df: pd.DataFrame
) -> Dict:
    """
    Evaluate forecasting models using a
    chronological train/test split.

    The last 20% of observations are used
    as the test set.

    Returns MAE and RMSE for:
        - ARIMA
        - Prophet
        - XGBoost
        - Ensemble
    """

    total_points = len(df)

    # -----------------------------------------------------
    # Minimum data requirement
    # -----------------------------------------------------

    if total_points < 21:

        return {
            "error": (
                "At least 21 days of data are "
                "required for model evaluation."
            )
        }

    # -----------------------------------------------------
    # Test size
    # -----------------------------------------------------

    test_size = max(
        7,
        int(
            total_points * 0.20
        )
    )

    train_size = (
        total_points - test_size
    )

    if train_size < 14:

        return {
            "error": (
                "Not enough training data "
                "for model evaluation."
            )
        }

    # -----------------------------------------------------
    # Train / test split
    # -----------------------------------------------------

    train_df = df.iloc[
        :train_size
    ].copy()

    test_df = df.iloc[
        train_size:
    ].copy()

    actual_values = (
        test_df["y"]
        .astype(float)
        .tolist()
    )

    periods = len(test_df)

    validation_results = {}

    # =====================================================
    # ARIMA
    # =====================================================

    arima_result = forecast_arima(
        train_df,
        periods
    )

    if arima_result.get(
        "forecasts"
    ):

        predicted = [
            item["predicted_amount"]
            for item in arima_result[
                "forecasts"
            ]
        ]

        metrics = evaluate_forecast(
            actual_values,
            predicted
        )

        if metrics:

            validation_results[
                "ARIMA"
            ] = metrics

    # =====================================================
    # PROPHET
    # =====================================================

    prophet_result = forecast_prophet(
        train_df,
        periods
    )

    if prophet_result.get(
        "forecasts"
    ):

        predicted = [
            item["predicted_amount"]
            for item in prophet_result[
                "forecasts"
            ]
        ]

        metrics = evaluate_forecast(
            actual_values,
            predicted
        )

        if metrics:

            validation_results[
                "Prophet"
            ] = metrics

    # =====================================================
    # XGBOOST
    # =====================================================

    xgb_result = forecast_xgboost(
        train_df,
        periods
    )

    if xgb_result.get(
        "forecasts"
    ):

        predicted = [
            item["predicted_amount"]
            for item in xgb_result[
                "forecasts"
            ]
        ]

        metrics = evaluate_forecast(
            actual_values,
            predicted
        )

        if metrics:

            validation_results[
                "XGBoost"
            ] = metrics

    # =====================================================
    # ENSEMBLE
    # =====================================================

    individual_results = [
        arima_result,
        prophet_result,
        xgb_result
    ]

    valid_results = [
        result
        for result in individual_results
        if (
            result.get("forecasts")
            and len(
                result["forecasts"]
            ) > 0
        )
    ]

    if valid_results:

        ensemble_predictions = []

        for i in range(periods):

            values = []

            for result in valid_results:

                forecasts = (
                    result["forecasts"]
                )

                if i < len(forecasts):

                    values.append(
                        forecasts[i][
                            "predicted_amount"
                        ]
                    )

            if values:

                ensemble_predictions.append(
                    sum(values)
                    / len(values)
                )

        metrics = evaluate_forecast(
            actual_values,
            ensemble_predictions
        )

        if metrics:

            validation_results[
                "Ensemble"
            ] = metrics

    return validation_results


# =========================================================
# MAIN HYBRID FORECAST
# =========================================================

def run_hybrid_forecast(
    expenses: List[dict],
    periods: int = 30,
    model: str = "ensemble"
) -> Dict:
    """
    Main forecasting function.

    IMPORTANT:
    All individual models are generated and returned,
    regardless of which model is selected.

    This allows the frontend to display complete
    model comparison metrics.

    The `model` parameter controls which forecast is
    considered selected by the frontend.
    """

    # =====================================================
    # PREPARE DATA
    # =====================================================

    df = prepare_time_series(
        expenses
    )

    if df.empty or len(df) < 14:

        return {
            "error": (
                "Not enough data. Please add "
                "at least 14 days of expenses."
            ),
            "forecasts": []
        }

    # =====================================================
    # NORMALIZE MODEL NAME
    # =====================================================

    model = (
        str(model)
        .lower()
        .strip()
    )

    valid_models = {
        "arima",
        "prophet",
        "xgboost",
        "ensemble"
    }

    if model not in valid_models:

        model = "ensemble"

    # =====================================================
    # GENERATE ALL MODELS
    # =====================================================

    results = {}

    # -----------------------------------------------------
    # ARIMA
    # -----------------------------------------------------

    arima_result = forecast_arima(
        df,
        periods
    )

    results["ARIMA"] = arima_result

    # -----------------------------------------------------
    # PROPHET
    # -----------------------------------------------------

    prophet_result = forecast_prophet(
        df,
        periods
    )

    results["Prophet"] = prophet_result

    # -----------------------------------------------------
    # XGBOOST
    # -----------------------------------------------------

    xgb_result = forecast_xgboost(
        df,
        periods
    )

    results["XGBoost"] = xgb_result

    # =====================================================
    # ENSEMBLE FORECAST
    # =====================================================

    individual_results = [
        arima_result,
        prophet_result,
        xgb_result
    ]

    valid_results = [
        result
        for result in individual_results
        if (
            result.get("forecasts")
            and len(
                result["forecasts"]
            ) > 0
        )
    ]

    ensemble_forecasts = []

    if valid_results:

        for i in range(periods):

            values = []

            date = None

            for result in valid_results:

                forecasts = (
                    result["forecasts"]
                )

                if i < len(forecasts):

                    values.append(
                        forecasts[i][
                            "predicted_amount"
                        ]
                    )

                    if date is None:

                        date = forecasts[i][
                            "date"
                        ]

            if values:

                ensemble_forecasts.append(
                    {
                        "date": date,
                        "predicted_amount": round(
                            sum(values)
                            / len(values),
                            2
                        )
                    }
                )

    results["Ensemble"] = {
        "model": "Ensemble",
        "forecasts": ensemble_forecasts
    }

    # =====================================================
    # MODEL VALIDATION
    # =====================================================

    evaluation = validate_models(
        df
    )

    # =====================================================
    # ATTACH METRICS TO EVERY MODEL
    # =====================================================

    #
    # IMPORTANT FIX:
    #
    # Previously metrics were only attached when the
    # selected model already existed in `results`.
    #
    # Now all four models are always present, so all
    # available evaluation metrics are attached.
    #

    for model_name, metrics in evaluation.items():

        # Ignore the validation error field
        if model_name == "error":
            continue

        if (
            model_name in results
            and isinstance(
                metrics,
                dict
            )
        ):

            results[
                model_name
            ]["mae"] = metrics.get(
                "mae"
            )

            results[
                model_name
            ]["rmse"] = metrics.get(
                "rmse"
            )

    # =====================================================
    # SELECTED MODEL
    # =====================================================

    selected_key_map = {
        "arima": "ARIMA",
        "prophet": "Prophet",
        "xgboost": "XGBoost",
        "ensemble": "Ensemble"
    }

    selected_key = (
        selected_key_map.get(
            model,
            "Ensemble"
        )
    )

    selected_result = results.get(
        selected_key
    )

    # =====================================================
    # SELECTED FORECAST
    # =====================================================

    if selected_result:

        results[
            "selected_model"
        ] = model

        results[
            "selected_forecast"
        ] = selected_result.get(
            "forecasts",
            []
        )

        results[
            "selected_mae"
        ] = selected_result.get(
            "mae"
        )

        results[
            "selected_rmse"
        ] = selected_result.get(
            "rmse"
        )

    else:

        results[
            "selected_model"
        ] = model

        results[
            "selected_forecast"
        ] = []

        results[
            "selected_mae"
        ] = None

        results[
            "selected_rmse"
        ] = None

    # =====================================================
    # COMPLETE EVALUATION DATA
    # =====================================================

    results[
        "evaluation"
    ] = evaluation

    # =====================================================
    # RETURN
    # =====================================================

    return results