"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STATUSES = ["New", "Contacted", "Quoted", "Done", "Lost"];

export default function StatusEditor({
  customerId,
  currentStatus,
}: {
  customerId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("customers").update({ status }).eq("id", customerId);

    if (note.trim()) {
      await supabase
        .from("customer_notes")
        .insert({ customer_id: customerId, note: note.trim(), created_by: user?.id });
      setNote("");
    }
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-4 mt-4">
      <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
        Status
      </label>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="w-full border border-line rounded-lg px-3 py-2.5 bg-white mb-3"
      >
        {STATUSES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>

      <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
        Add a note
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full border border-line rounded-lg px-3 py-2.5 bg-white mb-3 min-h-20"
        placeholder="What happened? What do they need?"
      />

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-signal text-white font-bold rounded-xl py-2.5 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
