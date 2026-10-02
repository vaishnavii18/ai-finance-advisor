from app.ml.anomaly_detection import (
    detect_anomalies,
    get_anomaly_summary,
)


# Sample expense data
# One unusually large expense is included.
expenses = [
    {"id": 1, "amount": 100, "category": "Food"},
    {"id": 2, "amount": 150, "category": "Food"},
    {"id": 3, "amount": 200, "category": "Transport"},
    {"id": 4, "amount": 120, "category": "Food"},
    {"id": 5, "amount": 180, "category": "Shopping"},
    {"id": 6, "amount": 250, "category": "Food"},
    {"id": 7, "amount": 300, "category": "Transport"},
    {"id": 8, "amount": 220, "category": "Shopping"},
    {"id": 9, "amount": 170, "category": "Food"},
    {"id": 10, "amount": 190, "category": "Food"},
    {"id": 11, "amount": 140, "category": "Transport"},
    {"id": 12, "amount": 160, "category": "Food"},
    {"id": 13, "amount": 210, "category": "Shopping"},
    {"id": 14, "amount": 130, "category": "Food"},
    {"id": 15, "amount": 280, "category": "Transport"},
    {"id": 16, "amount": 240, "category": "Shopping"},
    {"id": 17, "amount": 110, "category": "Food"},
    {"id": 18, "amount": 200, "category": "Food"},
    {"id": 19, "amount": 175, "category": "Transport"},
    {"id": 20, "amount": 50000, "category": "Shopping"},
]


# Detect anomalies
detected_expenses = detect_anomalies(expenses)


# Generate summary
summary = get_anomaly_summary(detected_expenses)


print("\n========== ANOMALY DETECTION RESULTS ==========")

print("Total expenses:", summary["total_expenses"])
print("Anomaly count:", summary["anomaly_count"])
print("Anomaly percentage:", summary["anomaly_percentage"], "%")
print("Total anomaly amount:", summary["total_anomaly_amount"])

print("\nDetected expenses:")

for expense in detected_expenses:
    print(
        "ID:", expense["id"],
        "| Amount:", expense["amount"],
        "| Category:", expense["category"],
        "| Anomaly:", expense["is_anomaly"],
    )

print("\nAnomalous expenses:")

for anomaly in summary["anomalies"]:
    print(anomaly)