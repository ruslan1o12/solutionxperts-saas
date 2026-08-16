"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PhotoGateToggle({
  profileId,
  initialEnabled,
}: {
  profileId: string;
  initialEnabled: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    const next = !enabled;
    await supabase.from("profiles").update({ photo_gate_enabled: next }).eq("id", profileId);
    setEnabled(next);
    setSaving(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className="flex items-center gap-2 text-xs font-semibold text-neutral-600 disabled:opacity-60"
    >
      <span
        className={`w-8 h-4.5 rounded-full relative transition-colors ${enabled ? "bg-signal" : "bg-neutral-300"}`}
        style={{ height: 18 }}
      >
        <span
          className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all"
          style={{ left: enabled ? 16 : 2 }}
        />
      </span>
      Photo check required
    </button>
  );
}
