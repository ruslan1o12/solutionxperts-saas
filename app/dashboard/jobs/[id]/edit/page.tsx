"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Option = { id: string; label: string };

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [customerName, setCustomerName] = useState("");
  const [teamOptions, setTeamOptions] = useState<Option[]>([]);
  const [assignedTo, setAssignedTo] = useState("");
  const [soldBy, setSoldBy] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: job }, { data: profiles }] = await Promise.all([
        supabase.from("jobs").select("*, customers(name)").eq("id", params.id).single(),
        supabase.from("profiles").select("id, full_name, role"),
      ]);

      setTeamOptions(
        (profiles ?? []).map((p) => ({ id: p.id, label: `${p.full_name || "Unnamed"} (${p.role})` }))
      );

      if (job) {
        setCustomerName(job.customers?.name ?? "Customer");
        setAssignedTo(job.assigned_to ?? "");
        setSoldBy(job.sold_by ?? "");
        setScheduledAt(toLocalInput(job.scheduled_at));
        setDuration(String(job.duration_minutes ?? 60));
        setJobDescription(job.job_description ?? "");
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function save() {
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("jobs")
      .update({
        assigned_to: assignedTo || null,
        sold_by: soldBy || null,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        duration_minutes: Number(duration) || 60,
        job_description: jobDescription.trim() || null,
      })
      .eq("id", params.id);

    setSaving(false);
    if (error) return setError(error.message);
    setSaved(true);
    router.push(`/dashboard/jobs/${params.id}`);
    router.refresh();
  }

  if (loading) return <p className="text-sm text-neutral-400 text-center py-10">Loading...</p>;

  return (
    <div>
      <button onClick={() => router.push(`/dashboard/jobs/${params.id}`)} className="text-steel font-bold text-sm mb-3">
        ← Back to job
      </button>
      <div className="text-xl font-extrabold mb-1">Edit job</div>
      <p className="text-sm text-neutral-500 mb-4">For {customerName}</p>

      <Field label="Assigned technician">
        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 bg-white"
        >
          <option value="">Unassigned</option>
          {teamOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Salesman who got the job">
        <select
          value={soldBy}
          onChange={(e) => setSoldBy(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 bg-white"
        >
          <option value="">Not set</option>
          {teamOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Date & time">
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 bg-white"
        />
      </Field>

      <Field label="Duration (minutes)">
        <input
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          inputMode="numeric"
          className="w-full border border-line rounded-lg px-3 py-2.5 bg-white"
        />
      </Field>

      <Field label="What the job is (shows to the technician)">
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder='e.g. "Window cleaning (15 windows) and gutter cleaning — customer wants gutters extra clean, heavy leaf buildup"'
          className="w-full border border-line rounded-lg px-3 py-2.5 bg-white min-h-24"
        />
      </Field>

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
