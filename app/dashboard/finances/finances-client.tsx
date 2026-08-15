"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downloadCsv } from "@/lib/csv";

type Expense = {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  notes: string | null;
};

type RangeKey = "30" | "month" | "all";

function rangeStart(key: RangeKey): string | null {
  const d = new Date();
  if (key === "30") {
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }
  if (key === "month") {
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  }
  return null;
}

export default function FinancesClient() {
  const supabase = createClient();
  const [range, setRange] = useState<RangeKey>("month");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const start = rangeStart(range);

    let expQuery = supabase.from("expenses").select("*").order("expense_date", { ascending: false });
    if (start) expQuery = expQuery.gte("expense_date", start);

    let revQuery = supabase.from("quotes").select("total, paid_at").eq("status", "Paid");
    if (start) revQuery = revQuery.gte("paid_at", start);

    const [{ data: exp }, { data: rev }] = await Promise.all([expQuery, revQuery]);
    setExpenses(exp ?? []);
    setRevenue((rev ?? []).reduce((s, r) => s + Number(r.total || 0), 0));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  async function addExpense() {
    if (!category.trim() || !amount) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("expenses").insert({
      expense_date: expenseDate,
      category: category.trim(),
      amount: Number(amount) || 0,
      notes: notes.trim() || null,
      created_by: user?.id,
    });
    setCategory("");
    setAmount("");
    setNotes("");
    setSaving(false);
    load();
  }

  async function deleteExpense(id: string) {
    if (!confirm("Delete this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    load();
  }

  function exportCsv() {
    downloadCsv(
      `expenses-${new Date().toISOString().slice(0, 10)}`,
      expenses.map((e) => ({
        Date: e.expense_date,
        Category: e.category,
        Amount: e.amount,
        Notes: e.notes,
      }))
    );
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const profit = revenue - totalExpenses;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xl font-extrabold">Finances</div>
      </div>
      <div className="flex gap-2 mb-4">
        {(["month", "30", "all"] as RangeKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setRange(k)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
              range === k ? "bg-ink text-paper border-ink" : "border-line text-neutral-500"
            }`}
          >
            {k === "month" ? "This month" : k === "30" ? "Last 30 days" : "All time"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400 text-center py-10">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-white border border-line rounded-2xl p-3 text-center">
              <div className="text-lg font-extrabold text-good">${revenue.toFixed(0)}</div>
              <div className="text-[10px] font-semibold text-neutral-500 uppercase">Revenue</div>
            </div>
            <div className="bg-white border border-line rounded-2xl p-3 text-center">
              <div className="text-lg font-extrabold text-danger">${totalExpenses.toFixed(0)}</div>
              <div className="text-[10px] font-semibold text-neutral-500 uppercase">Expenses</div>
            </div>
            <div className="bg-white border border-line rounded-2xl p-3 text-center">
              <div className={`text-lg font-extrabold ${profit >= 0 ? "text-ink" : "text-danger"}`}>
                ${profit.toFixed(0)}
              </div>
              <div className="text-[10px] font-semibold text-neutral-500 uppercase">Net profit</div>
            </div>
          </div>

          <div className="bg-white border border-line rounded-2xl p-4 mb-6">
            <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-3">
              Add expense
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category (e.g. Materials)"
                className="border border-line rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                inputMode="decimal"
                className="border border-line rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-2"
            />
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-3"
            />
            <button
              onClick={addExpense}
              disabled={saving}
              className="w-full bg-signal text-white font-bold rounded-xl py-2.5 disabled:opacity-60"
            >
              {saving ? "Adding..." : "Add expense"}
            </button>
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-extrabold uppercase tracking-wide text-steel">
              Expenses ({expenses.length})
            </div>
            {expenses.length > 0 && (
              <button onClick={exportCsv} className="text-steel font-bold text-sm">
                Export CSV
              </button>
            )}
          </div>

          {expenses.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-6">No expenses logged for this range.</p>
          )}

          <div className="flex flex-col gap-2">
            {expenses.map((e) => (
              <div key={e.id} className="bg-white border border-line rounded-xl p-3 flex justify-between items-center">
                <div>
                  <div className="font-bold text-sm">{e.category}</div>
                  <div className="text-xs text-neutral-500">
                    {e.expense_date} {e.notes ? `· ${e.notes}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm">${Number(e.amount).toFixed(2)}</span>
                  <button onClick={() => deleteExpense(e.id)} className="text-danger text-xs font-bold">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
