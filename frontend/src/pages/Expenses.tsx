
import { useEffect, useState, useMemo } from "react";
import {
  getExpenses,
  createExpense,
} from "../services/api";
import type { Expense } from "../services/api";
import { Search, Filter, Plus, X } from "lucide-react";

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Normal" | "Anomaly"
  >("All");

  // Controls the Add Expense form
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Form fields
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const data = await getExpenses();
        setExpenses(data);
      } catch (err) {
        setError(
          "Failed to load expenses. Make sure the backend is running."
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, []);

  // Get unique categories for the filter
  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(expenses.map((expense) => expense.category))
    );

    return ["All", ...unique.sort()];
  }, [expenses]);

  // Filtered and searched expenses
  const filtered = useMemo(() => {
    return expenses.filter((expense) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        search === "" ||
        expense.category.toLowerCase().includes(searchText) ||
        (expense.description?.toLowerCase().includes(searchText) ??
          false);

      const matchesCategory =
        categoryFilter === "All" ||
        expense.category === categoryFilter;

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Anomaly" && expense.is_anomaly) ||
        (statusFilter === "Normal" && !expense.is_anomaly);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus
      );
    });
  }, [expenses, search, categoryFilter, statusFilter]);

  // Summary numbers
  const totalAmount = filtered.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const anomalyCount = filtered.filter(
    (expense) => expense.is_anomaly
  ).length;

  // Clear the form
  const resetForm = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setAmount("");
    setCategory("Food");
    setDescription("");
    setPaymentMethod("UPI");
    setFormError("");
  };

  // Close the form
  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    resetForm();
  };

  // Save a new expense
  const handleAddExpense = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setFormError("");

    const numericAmount = Number(amount);

    if (!date) {
      setFormError("Please select a date.");
      return;
    }

    if (!amount || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError("Please enter an amount greater than zero.");
      return;
    }

    if (!category.trim()) {
      setFormError("Please select a category.");
      return;
    }

    try {
      setSaving(true);

      const newExpense = await createExpense({
        date,
        amount: numericAmount,
        category: category.trim(),
        description: description.trim() || undefined,
        payment_method: paymentMethod || undefined,
      });

      // Add the new expense to the table immediately
      setExpenses((previousExpenses) => [
        newExpense,
        ...previousExpenses,
      ]);

      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error(err);
      setFormError(
        "Failed to save expense. Please check that the backend is running."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
            Expenses
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View and filter all your transactions
          </p>
        </div>

        {/* Add Expense Button */}
        <button
          type="button"
          onClick={() => {
            setFormError("");
            setShowForm(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Add New Expense
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Enter the details of your expense.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close form"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form
            onSubmit={handleAddExpense}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {/* Date */}
            <div>
              <label
                htmlFor="expense-date"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Date
              </label>

              <input
                id="expense-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Amount */}
            <div>
              <label
                htmlFor="expense-amount"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Amount (₹)
              </label>

              <input
                id="expense-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="500"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="expense-category"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Category
              </label>

              <select
                id="expense-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Food">Food</option>
                <option value="Education">Education</option>
                <option value="Shopping">Shopping</option>
                <option value="Transport">Transport</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Health">Health</option>
                <option value="Bills">Bills</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label
                htmlFor="expense-payment-method"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Payment Method
              </label>

              <select
                id="expense-payment-method"
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value)
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label
                htmlFor="expense-description"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Description
              </label>

              <input
                id="expense-description"
                type="text"
                placeholder="Lunch at college canteen"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Form Error */}
            {formError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 sm:col-span-2">
                {formError}
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Expense"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">
            Loading expenses…
          </p>
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
        <>
          {/* Summary */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5">
              <span className="text-slate-500">Total</span>
              <span className="ml-2 font-semibold text-slate-900">
                ₹{totalAmount.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5">
              <span className="text-slate-500">Transactions</span>
              <span className="ml-2 font-semibold text-slate-900">
                {filtered.length}
              </span>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5">
              <span className="text-slate-500">Anomalies</span>
              <span className="ml-2 font-semibold text-rose-600">
                {anomalyCount}
              </span>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                placeholder="Search by category or description…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "All"
                    | "Normal"
                    | "Anomaly"
                )
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All Status</option>
              <option value="Normal">Normal</option>
              <option value="Anomaly">Anomaly</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">
                No expenses match your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3 text-right">
                        Amount
                      </th>
                      <th className="px-5 py-3 text-right">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((expense) => (
                      <tr
                        key={expense.id}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-slate-600">
                          {expense.date
                            ? new Date(
                                expense.date
                              ).toLocaleDateString("en-IN")
                            : "No date"}
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-medium text-slate-700">
                            {expense.category}
                          </span>
                        </td>

                        <td className="max-w-[220px] truncate px-5 py-3.5 text-[13px] text-slate-600">
                          {expense.description || "—"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-3.5 text-right text-[13px] font-medium text-slate-900">
                          ₹{expense.amount.toLocaleString("en-IN")}
                        </td>

                        <td className="whitespace-nowrap px-5 py-3.5 text-right">
                          {expense.is_anomaly ? (
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
            )}
          </div>
        </>
      )}
    </div>
  );
}