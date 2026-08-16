"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Settings = {
  legal_name: string;
  tax_number: string | null;
  business_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
};

export default function BusinessSettingsEditor({ initial }: { initial: Settings }) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    await supabase.from("business_settings").update(form).eq("id", 1);
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-4 max-w-lg">
      <Field label="Legal business name">
        <input
          value={form.legal_name || ""}
          onChange={(e) => set("legal_name", e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tax number (HST/GST)">
          <input
            value={form.tax_number || ""}
            onChange={(e) => set("tax_number", e.target.value)}
            placeholder="e.g. 123456789 RT0001"
            className="w-full border border-line rounded-lg px-3 py-2.5"
          />
        </Field>
        <Field label="Business number">
          <input
            value={form.business_number || ""}
            onChange={(e) => set("business_number", e.target.value)}
            className="w-full border border-line rounded-lg px-3 py-2.5"
          />
        </Field>
      </div>
      <Field label="Business address">
        <input
          value={form.address || ""}
          onChange={(e) => set("address", e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          <input
            value={form.phone || ""}
            onChange={(e) => set("phone", e.target.value)}
            className="w-full border border-line rounded-lg px-3 py-2.5"
          />
        </Field>
        <Field label="Email">
          <input
            value={form.email || ""}
            onChange={(e) => set("email", e.target.value)}
            className="w-full border border-line rounded-lg px-3 py-2.5"
          />
        </Field>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-signal text-white font-bold rounded-xl py-2.5 mt-2 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save"}
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
