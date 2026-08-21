"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LineItem = { id: string; desc: string; qty: string; price: string };

function newLine(): LineItem {
  return { id: Math.random().toString(36).slice(2), desc: "", qty: "1", price: "" };
}

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [customerName, setCustomerName] = useState("");
  const [lines, setLines] = useState<LineItem[]>([newLine()]);
  const [taxRate, setTaxRate] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("Draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from("quotes")
      .select("*, customers(name)")
      .eq("id", params.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCustomerName(data.customers?.name ?? "Customer");
          const items = (data.line_items as LineItem[]) || [];
          setLines(
            items.length
              ? items.map((l) => ({ ...l, id: Math.random().toString(36).slice(2) }))
              : [newLine()]
          );
          setTaxRate(String(data.tax_rate ?? 0));
          setDueDate(data.due_date ?? "");
          setStatus(data.status ?? "Draft");
        }
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const subtotal = lines.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);
  const tax = subtotal * (Number(taxRate) / 100 || 0);
  const total = subtotal + tax;

  function updateLine(id: string, field: keyof LineItem, value: string) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }
  function removeLine(id: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  async function save() {
    if (subtotal <= 0) return setError("Add at least one line item with a price.");
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("quotes")
      .update({
        line_items: lines.filter((l) => l.desc.trim()).map(({ desc, qty, price }) => ({ desc, qty, price })),
        tax_rate: Number(taxRate) || 0,
        total,
        due_date: dueDate || null,
        status,
      })
      .eq("id", params.id);

    setSaving(false);
    if (error) return setError(error.message);
    setSaved(true);
    router.refresh();
  }

  if (loading) return <p className="text-sm text-neutral-400 text-center py-10">Loading...</p>;

  return (
    <div>
      <button onClick={() => router.push("/dashboard/invoices")} className="text-steel font-bold text-sm mb-3">
        ← Back to invoices
      </button>
      <div className="text-xl font-extrabold mb-1">Edit invoice</div>
      <p className="text-sm text-neutral-500 mb-4">For {customerName}</p>

      {lines.map((l) => (
        <div key={l.id} className="grid grid-cols-[1fr_50px_70px_28px] gap-1.5 mb-2 items-center">
          <input
            value={l.desc}
            onChange={(e) => updateLine(l.id, "desc", e.target.value)}
            placeholder="Description"
            className="border border-line rounded-lg px-2 py-2 text-sm bg-white"
          />
          <input
            value={l.qty}
            onChange={(e) => updateLine(l.id, "qty", e.target.value)}
            placeholder="Qty"
            inputMode="decimal"
            className="border border-line rounded-lg px-2 py-2 text-sm bg-white"
          />
          <input
            value={l.price}
            onChange={(e) => updateLine(l.id, "price", e.target.value)}
            placeholder="$"
            inputMode="decimal"
            className="border border-line rounded-lg px-2 py-2 text-sm bg-white"
          />
          <button onClick={() => removeLine(l.id)} className="text-danger text-lg">
            ×
          </button>
        </div>
      ))}

      <button
        onClick={() => setLines((p) => [...p, newLine()])}
        className="w-full border border-dashed border-line rounded-lg py-2.5 text-steel font-bold text-sm mb-4"
      >
        + Add line item
      </button>

      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm font-semibold text-neutral-600">Tax %</label>
        <input
          value={taxRate}
          onChange={(e) => setTaxRate(e.target.value)}
          inputMode="decimal"
          className="w-20 border border-line rounded-lg px-2 py-1.5 text-sm bg-white"
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
          Due date
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 bg-white"
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 bg-white"
        >
          <option>Draft</option>
          <option>Sent</option>
          <option>Paid</option>
        </select>
      </div>

      <div className="flex justify-between items-center border-t-2 border-ink py-3 mb-4">
        <span className="text-sm font-bold">Total</span>
        <span className="text-2xl font-extrabold">${total.toFixed(2)}</span>
      </div>

      {error && <p className="text-danger text-sm mb-3">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-signal text-white font-bold rounded-xl py-3 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save changes"}
      </button>
      {saved && <p className="text-good text-xs font-bold text-center mt-2">Saved ✓</p>}
    </div>
  );
}
