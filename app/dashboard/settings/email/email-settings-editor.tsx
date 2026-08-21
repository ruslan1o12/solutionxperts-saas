"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EmailSettingsEditor({
  initial,
}: {
  initial: { fromEmail: string; fromName: string };
}) {
  const router = useRouter();
  const supabase = createClient();
  const [fromEmail, setFromEmail] = useState(initial.fromEmail);
  const [fromName, setFromName] = useState(initial.fromName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await supabase
      .from("email_settings")
      .update({ from_email: fromEmail.trim(), from_name: fromName.trim() })
      .eq("id", 1);
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="max-w-lg">
      <div className="bg-white border border-line rounded-2xl p-4 mb-4">
        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
          Sender name
        </label>
        <input
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 mb-4"
          placeholder="SolutionXperts"
        />

        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
          Sender email
        </label>
        <input
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5"
          placeholder="invoices@yourbusiness.com"
        />
      </div>

      <div className="bg-[#FFF1DF] border border-[#F0D6AE] rounded-2xl p-4 mb-4 text-xs text-[#8A5A17]">
        <b>Important:</b> this address only works once its domain is verified in your
        Resend account (Resend Dashboard → Domains → Add Domain → add the DNS records
        it gives you). Until then, leave this as the default{" "}
        <code>onboarding@resend.dev</code> — emails will still send, just from Resend's
        shared test address instead of your own domain.
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-signal text-white font-bold rounded-xl py-3 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save"}
      </button>
      {saved && <p className="text-good text-xs font-bold text-center mt-2">Saved ✓</p>}
    </div>
  );
}
