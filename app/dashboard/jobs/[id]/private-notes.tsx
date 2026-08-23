"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PrivateNotes({ jobId, initialNotes }: { jobId: string; initialNotes: string | null }) {
  const supabase = createClient();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await supabase.from("jobs").update({ private_notes: notes.trim() || null }).eq("id", jobId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={save}
        placeholder="Only your team sees this — access details, quirks about the property, anything worth flagging."
        className="w-full border border-line rounded-lg px-3 py-2.5 min-h-20 text-sm"
      />
      {saving && <p className="text-[10px] text-neutral-400 mt-1">Saving...</p>}
      {saved && <p className="text-[10px] text-good font-bold mt-1">Saved ✓</p>}
    </div>
  );
}
