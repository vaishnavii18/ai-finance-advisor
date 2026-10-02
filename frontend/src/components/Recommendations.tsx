import type { Recommendation } from "../types";
import { AlertCircle, Info, CheckCircle2 } from "lucide-react";

interface Props {
  recommendations: Recommendation[];
}

const priorityConfig = {
  high: {
    border: "border-l-rose-500",
    badge: "bg-rose-50 text-rose-700 ring-rose-600/10",
    icon: AlertCircle,
    iconColor: "text-rose-600",
  },
  medium: {
    border: "border-l-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-amber-600/10",
    icon: Info,
    iconColor: "text-amber-600",
  },
  low: {
    border: "border-l-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
  },
};

export default function Recommendations({ recommendations }: Props) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-[15px] font-semibold text-slate-900">
          Recommendations
        </h2>
        <p className="mt-6 text-center text-sm text-slate-500">
          No recommendations available right now.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
            Recommendations
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {recommendations.length} insight
            {recommendations.length !== 1 ? "s" : ""} based on recent activity
          </p>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[480px] space-y-0 overflow-y-auto divide-y divide-slate-100">
        {recommendations.map((rec, idx) => {
          const config = priorityConfig[rec.priority] || priorityConfig.medium;
          const Icon = config.icon;

          return (
            <div
              key={idx}
              className={`border-l-[3px] ${config.border} px-5 py-4 hover:bg-slate-50/60 transition-colors`}
            >
              <div className="flex gap-3">
                <div className="mt-0.5 shrink-0">
                  <Icon className={`h-4 w-4 ${config.iconColor}`} />
                </div>

                <div className="min-w-0 flex-1">
                  {/* Title + Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {rec.title}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${config.badge}`}
                    >
                      {rec.priority}
                    </span>
                    {rec.category && (
                      <span className="text-[11px] text-slate-400">
                        · {rec.category}
                      </span>
                    )}
                  </div>

                  {/* Message */}
                  <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                    {rec.message}
                  </p>

                  {/* Impact */}
                  {rec.impact && (
                    <p className="mt-1.5 text-[13px] font-medium text-slate-800">
                      {rec.impact}
                    </p>
                  )}

                  {/* Suggested Actions */}
                  {rec.suggested_actions && rec.suggested_actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {rec.suggested_actions.map((action, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700"
                        >
                          {action}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}