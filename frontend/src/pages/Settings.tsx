import { useEffect, useState } from "react";
import { getBudgets } from "../services/api";
import type { Budget } from "../types";
import { Wallet, PiggyBank, Save } from "lucide-react";

export default function Settings() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Local form state (for future save functionality)
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [totalBudget, setTotalBudget] = useState("");

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const data = await getBudgets();
        setBudgets(data);

        // Pre-fill total budget from existing data
        const total = data.reduce((sum, b) => sum + b.monthly_limit, 0);
        if (total > 0) {
          setTotalBudget(String(total));
        }
      } catch (err) {
        setError("Failed to load budget settings.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBudgets();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder – will be connected to backend later
    alert("Settings saved (frontend only for now). Backend integration coming next.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your income, budgets and preferences
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">Loading settings…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* General Settings */}
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-slate-900">
                General
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Income and overall monthly budget
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-5">
              {/* Monthly Income */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Monthly Income (₹)
                </label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Total Monthly Budget */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Total Monthly Budget (₹)
                </label>
                <div className="relative">
                  <PiggyBank className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(e.target.value)}
                    placeholder="e.g. 35000"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </form>
          </div>

          {/* Category Budgets */}
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-slate-900">
                Category Budgets
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Current limits from the backend
              </p>
            </div>

            <div className="p-5">
              {budgets.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No category budgets set yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {budgets.map((budget) => (
                    <div
                      key={budget.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-slate-800">
                        {budget.category}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        ₹{budget.monthly_limit.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-4 text-xs text-slate-400">
                Editing individual category budgets will be added when the
                backend update endpoints are ready.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}