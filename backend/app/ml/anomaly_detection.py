
import numpy as np
from typing import List, Dict, Any
from sklearn.ensemble import IsolationForest


def _get_severity(
    is_anomaly: bool,
    anomaly_score: float,
) -> str:
    """
    Assign a display severity based on the anomaly score.

    The score is derived from the Isolation Forest decision function.
    These thresholds are application-level display rules, not
    statistical probability thresholds.
    """

    if not is_anomaly:
        return "Normal"

    if anomaly_score >= 0.30:
        return "High"

    if anomaly_score >= 0.15:
        return "Medium"

    return "Low"


def detect_anomalies(
    expenses: List[dict],
    contamination: float = 0.1,
) -> List[dict]:
    """
    Detect anomalous expenses using Isolation Forest.

    Current model features:
        - Log-transformed expense amount

    Parameters:
        expenses:
            List of expense dictionaries. Each expense should contain
            an "amount" field.

        contamination:
            Expected proportion of anomalies.
            Must be greater than 0 and less than 0.5.

    Returns:
        A new list of expense dictionaries containing:
            - is_anomaly
            - anomaly_score
            - severity
    """

    # Create copies so the original input list is not modified.
    results = [expense.copy() for expense in expenses]

    # Handle empty input.
    if not results:
        return results

    # Validate contamination.
    if not 0 < contamination < 0.5:
        raise ValueError(
            "Contamination must be greater than 0 and less than 0.5."
        )

    # Convert expense amounts into numeric values.
    valid_amounts = []

    for expense in results:
        try:
            amount = float(expense.get("amount", 0))

            if not np.isfinite(amount) or amount < 0:
                amount = 0.0

        except (TypeError, ValueError):
            amount = 0.0

        expense["amount"] = amount
        valid_amounts.append(amount)

    # Initialize default values.
    for expense in results:
        expense["is_anomaly"] = False
        expense["anomaly_score"] = 0.0
        expense["severity"] = "Normal"

    # Isolation Forest may produce unreliable results
    # with very small datasets.
    if len(results) < 10:
        return results

    # Log transformation reduces the effect of very large amounts.
    log_amounts = np.log1p(np.array(valid_amounts))

    # Isolation Forest requires a two-dimensional feature matrix.
    X = log_amounts.reshape(-1, 1)

    # Train the Isolation Forest model.
    model = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=42,
    )

    # Predictions:
    # 1  = normal observation
    # -1 = anomaly
    predictions = model.fit_predict(X)

    # Lower decision-function values are more unusual.
    decision_scores = model.decision_function(X)

    # Convert the decision function into a display-oriented score.
    # Larger values represent more unusual observations.
    anomaly_scores = np.maximum(-decision_scores, 0.0)

    for index, expense in enumerate(results):
        is_anomaly = bool(predictions[index] == -1)
        anomaly_score = float(anomaly_scores[index])

        expense["is_anomaly"] = is_anomaly
        expense["anomaly_score"] = round(anomaly_score, 4)
        expense["severity"] = _get_severity(
            is_anomaly=is_anomaly,
            anomaly_score=anomaly_score,
        )

    return results


def get_anomaly_summary(
    expenses: List[dict],
) -> Dict[str, Any]:
    """
    Generate a summary of detected anomalies.

    Returns:
        A dictionary containing:
            - total_expenses
            - anomaly_count
            - anomaly_percentage
            - total_anomaly_amount
            - anomalies
    """

    anomalies = [
        expense
        for expense in expenses
        if bool(expense.get("is_anomaly", False))
    ]

    total_anomaly_amount = 0.0

    for expense in anomalies:
        try:
            amount = float(expense.get("amount", 0))

            if np.isfinite(amount):
                total_anomaly_amount += amount

        except (TypeError, ValueError):
            continue

    total_expenses = len(expenses)
    anomaly_count = len(anomalies)

    anomaly_percentage = (
        (anomaly_count / total_expenses) * 100
        if total_expenses > 0
        else 0.0
    )

    severity_counts = {
        "High": 0,
        "Medium": 0,
        "Low": 0,
    }

    for anomaly in anomalies:
        severity = anomaly.get("severity", "Low")

        if severity in severity_counts:
            severity_counts[severity] += 1

    return {
        "total_expenses": total_expenses,
        "anomaly_count": anomaly_count,
        "anomaly_percentage": round(anomaly_percentage, 2),
        "total_anomaly_amount": round(total_anomaly_amount, 2),
        "severity_counts": severity_counts,
        "anomalies": anomalies,
    }