"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ROLES = ["admin", "salesman", "technician"];

export default function RoleSelect({
  profileId,
  currentRole,
  isSelf,
}: {
  profileId: string;
  currentRole: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState(currentRole);
  const [saving, setSaving] = useState(false);

  async function updateRole(newRole: string) {
    if (isSelf && newRole !== "admin") {
      const ok = confirm(
        "You're changing your own role away from admin — you'll lose access to Team, Invoices, and Overview. Continue?"
      );
      if (!ok) return;
    }
    setSaving(true);
    setRole(newRole);
    await supabase.from("profiles").update({ role: newRole }).eq("id", profileId);
    setSaving(false);
    router.refresh();
  }

  return (
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
  );
}
