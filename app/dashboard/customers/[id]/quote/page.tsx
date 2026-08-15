"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LineItem = { id: string; desc: string; qty: string; price: string };

function newLine(): LineItem {
  return { id: Math.random().toString(36).slice(2), desc: "", qty: "1", price: "" };
}

export default function QuoteBuilderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [customer, setCustomer] = useState<{ id: string; name: string; contact: string } | null>(
    null
  );
  const [lines, setLines] = useState<LineItem[]>([newLine()]);
  const [taxRate, setTaxRate] = useState("13");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("customers")
      .select("id,name,contact")
      .eq("id", params.id)
      .single()
      .then(({ data }) => setCustomer(data));
  }, [params.id]);

  const subtotal = lines.reduce(
    (sum, l) => sum + (Number(l.qty) || 0) * (Number(l.price) || 0),
    0
  );
  const tax = subtotal * (Number(taxRate) / 100 || 0);
  const total = subtotal + tax;

  function updateLine(id: string, field: keyof LineItem, value: string) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }
  function removeLine(id: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  function quoteText() {
    const rows = lines
      .filter((l) => l.desc.trim())
      .map((l) => `${l.desc}  x${l.qty}  $${(Number(l.qty) * Number(l.price)).toFixed(2)}`)
      .join("\n");
    return (
      `SolutionXperts — Estimate\n` +
      `For: ${customer?.name ?? ""}\n\n` +
      `${rows}\n\n` +
      `Subtotal: $${subtotal.toFixed(2)}\n` +
      `Tax (${taxRate}%): $${tax.toFixed(2)}\n` +
      `Total: $${total.toFixed(2)}`
    );
  }

  async function saveAndGetLink() {
    if (subtotal <= 0) {
      setError("Add at least one line item with a price.");
      return;
    }
    setError(null);
    setWorking(true);

    const res = await fetch("/api/create-payment-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: `Estimate for ${customer?.name ?? "customer"}`,
        amountCents: Math.round(total * 100),
        customerName: customer?.name,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setWorking(false);
      setError(data.error || "Couldn't create the payment link.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("quotes").insert({
      customer_id: params.id,
      line_items: lines.filter((l) => l.desc.trim()),
      tax_rate: Number(taxRate) || 0,
      total,
      status: "Sent",
      stripe_payment_link: data.url,
      created_by: user?.id,
    });

    await supabase.from("customers").update({ status: "Quoted" }).eq("id", params.id);

    setPaymentLink(data.url);
    setWorking(false);
  }

  const bodyText = paymentLink ? `${quoteText()}\n\nPay online: ${paymentLink}` : quoteText();
  const contact = customer?.contact ?? "";
  const looksLikeEmail = contact.includes("@");
  const looksLikePhone = /\d{7,}/.test(contact);

  return (
    <div>
      <button onClick={() => router.back()} className="text-steel font-bold text-sm mb-3">
        ← Back
      </button>
      <div className="text-xl font-extrabold mb-1">New estimate</div>
      <div className="text-sm text-neutral-500 mb-4">For {customer?.name ?? "..."}</div>

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

      <div className="flex justify-between items-center border-t-2 border-ink py-3 mb-4">
        <span className="text-sm font-bold">Total</span>
        <span className="text-2xl font-extrabold">${total.toFixed(2)}</span>
      </div>

      {error && <p className="text-danger text-sm mb-3">{error}</p>}

      {!paymentLink ? (
        <button
          onClick={saveAndGetLink}
          disabled={working}
          className="w-full bg-signal text-white font-bold rounded-xl py-3 disabled:opacity-60"
        >
          {working ? "Creating payment link..." : "Save & generate payment link"}
        </button>
      ) : (
        <div>
          <div className="bg-white border border-line rounded-2xl p-3 text-xs font-mono whitespace-pre-wrap mb-3">
            {bodyText}
          </div>
          <div className="flex gap-2">
            <a
              href={`mailto:${looksLikeEmail ? contact : ""}?subject=${encodeURIComponent(
                "Estimate from SolutionXperts"
              )}&body=${encodeURIComponent(bodyText)}`}
              className="flex-1 text-center bg-ink text-paper font-bold rounded-xl py-3"
            >
              Send via Email
            </a>
            <a
              href={`sms:${looksLikePhone ? contact.replace(/\D/g, "") : ""}?&body=${encodeURIComponent(
                bodyText
              )}`}
              className="flex-1 text-center bg-white border border-line font-bold rounded-xl py-3"
            >
              Send via Text
            </a>
          </div>
          <p className="text-xs text-neutral-500 mt-3">
            This opens your phone&apos;s email or messaging app with the estimate and payment link
            pre-filled — review it, then hit send.
          </p>
        </div>
      )}
    </div>
  );
}
