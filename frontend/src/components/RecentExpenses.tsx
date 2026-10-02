import type { Expense } from "../types";

interface Props {
  expenses: Expense[];
}

export default function RecentExpenses({ expenses }: Props) {
  const recent = expenses.slice(0, 8);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return dateStr;
    }
  };

  if (!recent.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-[15px] font-semibold text-slate-900">
          Recent Expenses
        </h2>
        <p className="mt-8 text-center text-sm text-slate-500">
          No expenses recorded yet.
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
            Recent Expenses
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Last {recent.length} transactions
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-medium uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recent.map((exp) => (
              <tr
                key={exp.id}
                className="hover:bg-slate-50/70 transition-colors"
              >
                <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-slate-600">
                  {formatDate(exp.date)}
                </td>

                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-medium text-slate-700">
                    {exp.category}
                  </span>
                </td>

                <td className="whitespace-nowrap px-5 py-3.5 text-right text-[13px] font-medium text-slate-900">
                  ₹{exp.amount.toLocaleString("en-IN")}
                </td>

                <td className="whitespace-nowrap px-5 py-3.5 text-right">
                  {exp.is_anomaly ? (
                    <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-inset ring-rose-600/10">
                      Anomaly
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-inset ring-slate-500/10">
                      Normal
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}