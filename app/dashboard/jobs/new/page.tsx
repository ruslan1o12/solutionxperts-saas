"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Option = { id: string; label: string };

export default function NewJobPage() {
  const router = useRouter();
  const supabase = createClient();

  const [customers, setCustomers] = useState<Option[]>([]);
  const [techs, setTechs] = useState<Option[]>([]);
  const [quotes, setQuotes] = useState<Option[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [techId, setTechId] = useState("");
  const [soldBy, setSoldBy] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setSoldBy(user.id);
    });

    supabase
      .from("customers")
      .select("id, name")
      .order("name")
      .then(({ data }) => setCustomers((data ?? []).map((c) => ({ id: c.id, label: c.name }))));

    supabase
      .from("profiles")
      .select("id, full_name, role")
      .order("full_name")
      .then(({ data }) =>
        setTechs(
          (data ?? []).map((p) => ({
            id: p.id,
            label: `${p.full_name || "Unnamed"} (${p.role})`,
          }))
        )
      );
  }, []);

  useEffect(() => {
    if (!customerId) {
      setQuotes([]);
      return;
    }
    supabase
      .from("quotes")
      .select("id, total, status")
      .eq("customer_id", customerId)
      .neq("status", "Paid")
      .then(({ data }) =>
        setQuotes((data ?? []).map((q) => ({ id: q.id, label: `$${Number(q.total).toFixed(2)} — ${q.status}` })))
      );
  }, [customerId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) return setError("Pick a customer.");
    if (!techId) return setError("Assign a technician.");
    setError(null);
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        customer_id: customerId,
        assigned_to: techId,
        sold_by: soldBy || null,
        quote_id: quoteId || null,
        scheduled_at: scheduledAt || null,
        status: "Scheduled",
        created_by: user?.id,
      })
      .select()
      .single();

    setSaving(false);
    if (error) return setError(error.message);

    // Fire-and-forget notification — don't block navigation if it fails
    fetch("/api/notify-job-assigned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: data.id }),
    }).catch(() => {});

    router.push(`/dashboard/jobs/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-3">
        Schedule a job
      </div>

      <Field label="Customer">
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 bg-white"
        >
          <option value="">Select a customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Assign to">
        <select
          value={techId}
          onChange={(e) => setTechId(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 bg-white"
        >
          <option value="">Select a team member</option>
          {techs.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        {techs.length === 0 && (
          <p className="text-xs text-neutral-500 mt-1">
            No team members found yet.
          </p>
        )}
      </Field>

      <Field label="Salesman who got the job">
        <select
          value={soldBy}
          onChange={(e) => setSoldBy(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 bg-white"
        >
          <option value="">Unassigned</option>
          {techs.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-500 mt-1">
          Defaults to you — change it if you&apos;re scheduling on someone else&apos;s behalf.
        </p>
      </Field>

      <Field label="Scheduled time">
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 bg-white"
        />
      </Field>

      {quotes.length > 0 && (
        <Field label="Link an unpaid invoice (optional)">
          <select
            value={quoteId}
            onChange={(e) => setQuoteId(e.target.value)}
            className="w-full border border-line rounded-lg px-3 py-2.5 bg-white"
          >
            <option value="">None</option>
            {quotes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      {error && <p className="text-danger text-sm mb-2">{error}</p>}

      <button
        disabled={saving}
        className="w-full bg-signal text-white font-bold rounded-xl py-3 mt-2 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Schedule job"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
