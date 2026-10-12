"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ContractFields, { ContractValues } from "../contract-fields";
import { addInterval } from "@/lib/recurring";

type Contract = ContractValues & {
  id: string;
  status: string;
  agreement_status: string;
  agreement_sent_at: string | null;
  signed_name: string | null;
  public_token: string;
  last_service_date: string | null;
};

const AGREEMENT_STYLE: Record<string, string> = {
  Accepted: "bg-[#E4F1E5] text-good",
  Sent: "bg-amber-100 text-amber-800",
  Declined: "bg-red-100 text-danger",
  "Not sent": "bg-neutral-100 text-neutral-600",
};

export default function ContractEditor({
  contract,
  customer,
  banner,
}: {
  contract: Contract;
  customer: { id: string; name: string; contact: string | null; address: string | null } | null;
  banner: { ok: boolean; text: string } | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [values, setValues] = useState<ContractValues>({
    job_description: contract.job_description,
    frequency: contract.frequency,
    price: contract.price,
    start_date: contract.start_date,
    next_service_date: contract.next_service_date,
    agreement_text: contract.agreement_text,
  });
  const [status, setStatus] = useState(contract.status);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(banner);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const link = typeof window !== "undefined" ? `${window.location.origin}/agreement/${contract.public_token}` : "";

  async function save(): Promise<boolean> {
    if (!values.job_description.trim()) {
      setMsg({ ok: false, text: "Enter the job that will be done." });
      return false;
    }
    const { error } = await supabase
      .from("recurring_contracts")
      .update({
        job_description: values.job_description.trim(),
        frequency: values.frequency,
        price: Number(values.price || 0),
        start_date: values.start_date || null,
        next_service_date: values.next_service_date || null,
        agreement_text: values.agreement_text,
        status,
      })
      .eq("id", contract.id);
    if (error) {
      setMsg({ ok: false, text: error.message });
      return false;
    }
    return true;
  }

  async function onSave() {
    setBusy("save");
    setMsg(null);
    if (await save()) {
      setMsg({
        ok: true,
        text:
          contract.agreement_status === "Accepted" || contract.agreement_status === "Sent"
            ? "Saved. If you changed the job, price or wording, tap “Resend agreement” so the customer sees the update."
            : "Saved.",
      });
      router.refresh();
    }
    setBusy(null);
  }

  async function resend() {
    setBusy("send");
    setMsg(null);
    if (!(await save())) return setBusy(null);
    try {
      const res = await fetch("/api/send-agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId: contract.id }),
      });
      const data = await res.json();
      if (!res.ok) setMsg({ ok: false, text: data.error || "Couldn't send." });
      else if (data.delivered)
        setMsg({ ok: true, text: `Agreement sent by ${data.results.email === "sent" ? "email" : "text"}.` });
      else
        setMsg({
          ok: false,
          text: `Not delivered (${data.results.email !== "skipped" ? data.results.email : data.results.sms === "skipped" ? "customer has no email or phone" : data.results.sms}). Copy the link below and send it yourself.`,
        });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Network problem — try again." });
    }
    setBusy(null);
  }

  async function markDone() {
    setBusy("done");
    const today = new Date().toISOString().slice(0, 10);
    const base = values.next_service_date || today;
    const next = addInterval(base, values.frequency);
    const { error } = await supabase
      .from("recurring_contracts")
      .update({ last_service_date: today, next_service_date: next })
      .eq("id", contract.id);
    if (error) setMsg({ ok: false, text: error.message });
    else {
      setValues({ ...values, next_service_date: next });
      setMsg({ ok: true, text: `Visit logged. Next service: ${next}.` });
      router.refresh();
    }
    setBusy(null);
  }

  async function remove() {
    if (!confirm("Delete this recurring contract? The customer stays in your Customers list.")) return;
    setBusy("delete");
    const { error } = await supabase.from("recurring_contracts").delete().eq("id", contract.id);
    if (error) {
      setMsg({ ok: false, text: error.message });
      setBusy(null);
      return;
    }
    router.push("/dashboard/recurring");
    router.refresh();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", link);
    }
  }

  return (
    <div>
      <Link href="/dashboard/recurring" className="text-xs font-bold text-steel">
        ← All recurring customers
      </Link>

      <div className="flex items-start justify-between gap-3 mt-2 mb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold truncate">{customer?.name ?? "Customer"}</h1>
          <div className="text-sm text-neutral-500 truncate">
            {[customer?.contact, customer?.address].filter(Boolean).join(" · ")}
          </div>
          {customer && (
            <Link href={`/dashboard/customers/${customer.id}`} className="text-xs font-bold text-steel">
              View customer →
            </Link>
          )}
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-line rounded-lg px-2 py-1.5 text-sm bg-white font-bold"
        >
          <option>Active</option>
          <option>Paused</option>
          <option>Cancelled</option>
        </select>
      </div>

      <div className="bg-white border border-line rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold ${AGREEMENT_STYLE[contract.agreement_status] ?? AGREEMENT_STYLE["Not sent"]}`}
          >
            Agreement: {contract.agreement_status}
          </span>
          <button onClick={copyLink} className="text-xs font-bold text-steel">
            {copied ? "Copied ✓" : "Copy agreement link"}
          </button>
        </div>
        {contract.signed_name && (
          <p className="text-xs text-neutral-600 mt-2">Signed by {contract.signed_name}</p>
        )}
        {contract.agreement_sent_at && (
          <p className="text-xs text-neutral-500 mt-1">Last sent {new Date(contract.agreement_sent_at).toLocaleString()}</p>
        )}
        {contract.last_service_date && (
          <p className="text-xs text-neutral-500 mt-1">Last visit {contract.last_service_date}</p>
        )}
      </div>

      <ContractFields values={values} onChange={setValues} showNextDate />

      {msg && <p className={`text-sm mb-3 ${msg.ok ? "text-good" : "text-danger"}`}>{msg.text}</p>}

      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          onClick={onSave}
          disabled={!!busy}
          className="bg-signal text-white font-bold rounded-xl py-3 disabled:opacity-60"
        >
          {busy === "save" ? "Saving..." : "Save changes"}
        </button>
        <button
          onClick={resend}
          disabled={!!busy}
          className="bg-ink text-white font-bold rounded-xl py-3 disabled:opacity-60"
        >
          {busy === "send" ? "Sending..." : contract.agreement_status === "Not sent" ? "Send agreement" : "Resend agreement"}
        </button>
      </div>
      <button
        onClick={markDone}
        disabled={!!busy}
        className="w-full bg-white border-2 border-line font-bold rounded-xl py-3 mb-2 disabled:opacity-60"
      >
        {busy === "done" ? "..." : "Log completed visit (moves next date forward)"}
      </button>
      <button onClick={remove} disabled={!!busy} className="w-full text-danger font-bold text-sm py-2">
        Delete contract
      </button>
    </div>
  );
}
