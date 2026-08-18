"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PhotoGateToggle from "./photo-gate-toggle";

const ROLES = ["admin", "salesman", "technician"];

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  photo_gate_enabled: boolean | null;
};

export default function EmployeeCard({
  profile,
  isSelf,
}: {
  profile: Profile;
  isSelf: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState(profile.full_name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [role, setRole] = useState(profile.role);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveField(field: "full_name" | "phone", value: string) {
    setSaving(true);
    setSaved(false);
    await supabase.from("profiles").update({ [field]: value.trim() }).eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  async function updateRole(newRole: string) {
    if (isSelf && newRole !== "admin") {
      const ok = confirm(
        "You're changing your own role away from admin — you'll lose access to Settings. Continue?"
      );
      if (!ok) return;
    }
    setSaving(true);
    setRole(newRole);
    await supabase.from("profiles").update({ role: newRole }).eq("id", profile.id);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={(e) => saveField("full_name", e.target.value)}
            className="font-bold text-sm w-full border-b border-transparent focus:border-line outline-none py-0.5"
            placeholder="Name"
          />
          {isSelf && <div className="text-[11px] text-neutral-400 font-semibold">You</div>}
          {profile.email && <div className="text-[11px] text-neutral-400">{profile.email}</div>}
        </div>
        <select
          value={role}
          disabled={saving}
          onChange={(e) => updateRole(e.target.value)}
          className="border border-line rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white disabled:opacity-60"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <label className="block text-[10px] font-bold uppercase tracking-wide text-neutral-500 mb-1">
        Phone
      </label>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        onBlur={(e) => saveField("phone", e.target.value)}
        placeholder="No phone on file"
        className="w-full border border-line rounded-lg px-2.5 py-2 text-sm mb-1"
      />
      {saved && <p className="text-good text-[10px] font-bold mb-2">Saved ✓</p>}

      <div className="mt-3 pt-3 border-t border-line">
        <PhotoGateToggle profileId={profile.id} initialEnabled={profile.photo_gate_enabled !== false} />
      </div>
    </div>
  );
}
