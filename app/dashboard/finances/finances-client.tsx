"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downloadCsv } from "@/lib/csv";
import AnimatedNumber from "../animated-number";
import CardSkeleton from "../card-skeleton";

type Expense = {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  paid_amount: number;
  paid_by: string | null;
  receipt_path: string | null;
  notes: string | null;
};

type Person = { id: string; label: string };

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
  const [people, setPeople] = useState<Person[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [upcomingBalance, setUpcomingBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const start = rangeStart(range);

    let expQuery = supabase.from("expenses").select("*").order("expense_date", { ascending: false });
    if (start) expQuery = expQuery.gte("expense_date", start);

    let revQuery = supabase.from("quotes").select("total, paid_at").eq("status", "Paid");
    if (start) revQuery = revQuery.gte("paid_at", start);

    const upcomingQuery = supabase.from("quotes").select("total").neq("status", "Paid");

    const [{ data: exp }, { data: rev }, { data: upcoming }, { data: profiles }] = await Promise.all([
      expQuery,
      revQuery,
      upcomingQuery,
      supabase.from("profiles").select("id, full_name"),
    ]);
    setExpenses(exp ?? []);
    setPeople((profiles ?? []).map((p) => ({ id: p.id, label: p.full_name || "Team member" })));
    setRevenue((rev ?? []).reduce((s, r) => s + Number(r.total || 0), 0));
    setUpcomingBalance((upcoming ?? []).reduce((s, q) => s + Number(q.total || 0), 0));
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
      paid_by: paidBy || user?.id || null,
      created_by: user?.id,
    });
    setCategory("");
    setAmount("");
    setNotes("");
    setPaidBy("");
    setSaving(false);
    load();
  }

  async function deleteExpense(id: string) {
    if (!confirm("Delete this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    load();
  }

  async function updateExpenseField(id: string, field: keyof Expense, value: string) {
    const payload =
      field === "amount" || field === "paid_amount" ? { [field]: Number(value) || 0 } : { [field]: value };
    await supabase.from("expenses").update(payload).eq("id", id);
    load();
  }

  async function uploadReceipt(expenseId: string, file: File) {
    setUploadingFor(expenseId);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${expenseId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("receipts").upload(path, file);
    if (!uploadError) {
      await supabase.from("expenses").update({ receipt_path: path }).eq("id", expenseId);
    }
    setUploadingFor(null);
    load();
  }

  async function viewReceipt(path: string) {
    const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 60 * 5);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  function exportCsv() {
    downloadCsv(
      `expenses-${new Date().toISOString().slice(0, 10)}`,
      expenses.map((e) => ({
        Date: e.expense_date,
        Category: e.category,
        Amount: e.amount,
        "Paid amount": e.paid_amount,
        "Paid by": people.find((p) => p.id === e.paid_by)?.label ?? "",
        Notes: e.notes,
      }))
    );
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalOwedOnExpenses = expenses.reduce(
    (s, e) => s + Math.max(0, Number(e.amount || 0) - Number(e.paid_amount || 0)),
    0
  );
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
        <CardSkeleton rows={3} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
            <div className="bg-white border border-line rounded-2xl p-3 text-center">
              <div className="text-lg font-extrabold text-good">$<AnimatedNumber value={Math.round(revenue)} /></div>
              <div className="text-[10px] font-semibold text-neutral-500 uppercase">Revenue</div>
            </div>
            <div className="bg-white border border-line rounded-2xl p-3 text-center">
              <div className="text-lg font-extrabold text-[#B45F0A]">$<AnimatedNumber value={Math.round(upcomingBalance)} /></div>
              <div className="text-[10px] font-semibold text-neutral-500 uppercase">Upcoming balance</div>
            </div>
            <div className="bg-white border border-line rounded-2xl p-3 text-center">
              <div className="text-lg font-extrabold text-danger">$<AnimatedNumber value={Math.round(totalExpenses)} /></div>
              <div className="text-[10px] font-semibold text-neutral-500 uppercase">Expenses</div>
            </div>
            <div className="bg-white border border-line rounded-2xl p-3 text-center">
              <div className={`text-lg font-extrabold ${profit >= 0 ? "text-ink" : "text-danger"}`}>
                $<AnimatedNumber value={Math.round(profit)} />
              </div>
              <div className="text-[10px] font-semibold text-neutral-500 uppercase">Net profit</div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 -mt-4 mb-2">
            Upcoming balance is what&apos;s owed right now across every unpaid invoice — it isn&apos;t limited to the date range above.
          </p>
          {totalOwedOnExpenses > 0 && (
            <p className="text-xs text-[#B45F0A] font-semibold -mt-1 mb-6">
              ${totalOwedOnExpenses.toFixed(2)} still owed on expenses in this range (not fully paid off yet).
            </p>
          )}

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
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="border border-line rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="border border-line rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">Who paid?</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
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
            {expenses.map((e) => {
              const remaining = Number(e.amount || 0) - Number(e.paid_amount || 0);
              return (
                <div key={e.id} className="bg-white border border-line rounded-xl p-3">
                  <div className="grid grid-cols-[1fr_90px] gap-2 mb-1.5">
                    <input
                      defaultValue={e.category}
                      onBlur={(ev) => updateExpenseField(e.id, "category", ev.target.value)}
                      className="font-bold text-sm border-b border-transparent focus:border-line outline-none py-0.5"
                    />
                    <input
                      defaultValue={e.amount}
                      onBlur={(ev) => updateExpenseField(e.id, "amount", ev.target.value)}
                      inputMode="decimal"
                      className="font-bold text-sm text-right border-b border-transparent focus:border-line outline-none py-0.5"
                    />
                  </div>
                  <div className="grid grid-cols-[110px_1fr] gap-2 items-center mb-1.5">
                    <input
                      type="date"
                      defaultValue={e.expense_date}
                      onBlur={(ev) => updateExpenseField(e.id, "expense_date", ev.target.value)}
                      className="text-xs text-neutral-500 border-b border-transparent focus:border-line outline-none py-0.5"
                    />
                    <input
                      defaultValue={e.notes ?? ""}
                      placeholder="Notes"
                      onBlur={(ev) => updateExpenseField(e.id, "notes", ev.target.value)}
                      className="text-xs text-neutral-500 border-b border-transparent focus:border-line outline-none py-0.5"
                    />
                  </div>

                  <div className="bg-[#F4F7F2] rounded-lg p-2 mb-1.5">
                    <div className="grid grid-cols-2 gap-2 items-center mb-1.5">
                      <div>
                        <label className="text-[9px] font-bold text-neutral-500 uppercase">Paid off</label>
                        <input
                          defaultValue={e.paid_amount}
                          onBlur={(ev) => updateExpenseField(e.id, "paid_amount", ev.target.value)}
                          inputMode="decimal"
                          className="w-full text-xs font-bold bg-white border border-line rounded px-2 py-1"
                        />
                      </div>
                      <select
                        defaultValue={e.paid_by ?? ""}
                        onChange={(ev) => updateExpenseField(e.id, "paid_by", ev.target.value)}
                        className="text-xs bg-white border border-line rounded px-2 py-1"
                      >
                        <option value="">Who paid?</option>
                        {people.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {remaining > 0.004 ? (
                      <p className="text-[10px] font-bold text-[#B45F0A]">${remaining.toFixed(2)} still owed</p>
                    ) : (
                      <p className="text-[10px] font-bold text-good">Paid in full ✓</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => deleteExpense(e.id)} className="text-danger text-xs font-bold">
                        Delete
                      </button>
                      {e.receipt_path ? (
                        <button onClick={() => viewReceipt(e.receipt_path!)} className="text-steel text-xs font-bold">
                          View receipt
                        </button>
                      ) : null}
                    </div>
                    <label className="text-steel text-xs font-bold cursor-pointer">
                      {uploadingFor === e.id ? "Uploading..." : e.receipt_path ? "Replace receipt" : "+ Add receipt"}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        disabled={uploadingFor === e.id}
                        onChange={(ev) => {
                          const file = ev.target.files?.[0];
                          if (file) uploadReceipt(e.id, file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
