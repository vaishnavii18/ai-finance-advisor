import {
  TrendingUp,
  Wallet,
  AlertTriangle,
  PiggyBank,
} from "lucide-react";

interface Props {
  totalPredicted: number;
  currentSpending: number;
  totalBudget: number;
  highPriority: number;
  anomalyCount: number;
  budgetStatus: string;
}

export default function SummaryCards({
  totalPredicted,
  currentSpending,
  totalBudget,
  highPriority,
  anomalyCount,
  budgetStatus,
}: Props) {
  const formatCurrency = (value: number) =>
    `₹${value.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;

  const budgetUsage =
    totalBudget > 0
      ? Math.min((currentSpending / totalBudget) * 100, 100)
      : 0;

  const getBudgetStyles = (status: string) => {
    if (status === "Over Budget") {
      return {
        valueColor: "text-rose-600",
        iconBg: "bg-rose-50",
        iconColor: "text-rose-600",
      };
    }

    if (status === "Attention Needed") {
      return {
        valueColor: "text-amber-600",
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
      };
    }

    return {
      valueColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    };
  };

  const budgetStyles = getBudgetStyles(budgetStatus);

  const cards = [
    {
      title: "Predicted Spending",
      subtitle: "Next 30 days",
      value: formatCurrency(totalPredicted),
      icon: TrendingUp,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      valueColor: "text-slate-900",
    },
    {
      title: "Current Spending",
      subtitle:
        totalBudget > 0
          ? `${budgetUsage.toFixed(0)}% of budget used`
          : "This month",
      value: formatCurrency(currentSpending),
      icon: Wallet,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      valueColor: "text-slate-900",
    },
    {
      title: "Budget Status",
      subtitle:
        totalBudget > 0
          ? `${formatCurrency(currentSpending)} / ${formatCurrency(
              totalBudget
            )}`
          : "No budget set",
      value: budgetStatus,
      icon: PiggyBank,
      iconBg: budgetStyles.iconBg,
      iconColor: budgetStyles.iconColor,
      valueColor: budgetStyles.valueColor,
    },
    {
      title: "Anomalies",
      subtitle:
        highPriority > 0
          ? `${highPriority} high-priority recommendation${
              highPriority === 1 ? "" : "s"
            }`
          : "Unusual transactions",
      value: anomalyCount,
      icon: AlertTriangle,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      valueColor: "text-slate-900",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium tracking-tight text-slate-500">
                {card.title}
              </p>

              <p
                className={`mt-1.5 text-[22px] font-semibold tracking-tight ${card.valueColor}`}
              >
                {card.value}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {card.subtitle}
              </p>
            </div>

            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}
            >
              <card.icon
                className={`h-[18px] w-[18px] ${card.iconColor}`}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}