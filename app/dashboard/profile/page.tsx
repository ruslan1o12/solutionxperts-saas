"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", user.id)
        .single();
      setFullName(data?.full_name ?? "");
      setEmail(data?.email ?? user.email ?? "");
      setPhone(data?.phone ?? "");
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() })
      .eq("id", user?.id);
    setSaving(false);
    setSaved(true);
  }

  if (loading) return <p className="text-sm text-neutral-400 text-center py-10">Loading...</p>;

  return (
    <div className="max-w-md">
      <div className="text-xl font-extrabold mb-1">My profile</div>
      <p className="text-sm text-neutral-500 mb-4">
        Your phone number is what job-assignment texts get sent to.
      </p>

      <div className="bg-white border border-line rounded-2xl p-4">
        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
          Full name
        </label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 mb-4"
        />

        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
          Email
        </label>
        <input
          value={email}
          disabled
          className="w-full border border-line rounded-lg px-3 py-2.5 mb-4 bg-[#F4F7F2] text-neutral-500"
        />

        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
          Phone number
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 519-555-0100"
          className="w-full border border-line rounded-lg px-3 py-2.5 mb-4"
        />

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-signal text-white font-bold rounded-xl py-2.5 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && <p className="text-good text-xs font-bold text-center mt-2">Saved ✓</p>}
      </div>
    </div>
  );
}
