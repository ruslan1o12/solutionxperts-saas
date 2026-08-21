"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PhotoGateToggle from "./photo-gate-toggle";
import AiEstimatorToggle from "./ai-estimator-toggle";

const ROLES = ["admin", "salesman", "technician"];

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  photo_gate_enabled: boolean | null;
  ai_estimator_enabled: boolean | null;
  commission_rate: number | null;
  pay_type: string | null;
  pay_rate: number | null;
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
  const [commissionRate, setCommissionRate] = useState(profile.commission_rate?.toString() ?? "0");
  const [payType, setPayType] = useState(profile.pay_type || "hourly");
  const [payRate, setPayRate] = useState(profile.pay_rate?.toString() ?? "0");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function deleteEmployee() {
    if (
      !confirm(
        `Remove ${profile.full_name || "this person"}'s login? They won't be able to sign in anymore. This can't be undone.`
      )
    )
      return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/delete-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: profile.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Couldn't remove this employee.");
        setDeleting(false);
        return;
      }
      router.refresh();
    } catch {
      setDeleteError("Couldn't remove this employee.");
      setDeleting(false);
    }
  }

  async function saveField(field: "full_name" | "phone", value: string) {
    setSaving(true);
    setSaved(false);
    await supabase.from("profiles").update({ [field]: value.trim() }).eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  async function savePay() {
    setSaving(true);
    setSaved(false);
    await supabase
      .from("profiles")
      .update({
        commission_rate: Number(commissionRate) || 0,
        pay_type: payType,
        pay_rate: Number(payRate) || 0,
      })
      .eq("id", profile.id);
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

      <div className="mt-3 pt-3 border-t border-line flex flex-col gap-2">
        <PhotoGateToggle profileId={profile.id} initialEnabled={profile.photo_gate_enabled !== false} />
        <AiEstimatorToggle profileId={profile.id} initialEnabled={profile.ai_estimator_enabled !== false} />
      </div>

      <div className="mt-3 pt-3 border-t border-line">
        <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-500 mb-2">
          Pay & commission
        </div>
        {(role === "salesman" || role === "admin") && (
          <div className="mb-2">
            <label className="text-[10px] font-bold text-neutral-500 uppercase">
              Commission % (per sale)
            </label>
            <input
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              onBlur={savePay}
              inputMode="decimal"
              className="w-full border border-line rounded-lg px-2.5 py-2 text-sm"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase">Pay type</label>
            <select
              value={payType}
              onChange={(e) => {
                setPayType(e.target.value);
                setTimeout(savePay, 0);
              }}
              className="w-full border border-line rounded-lg px-2.5 py-2 text-sm"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="percentage">% of job</option>
              <option value="flat">Flat per job</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase">
              Rate ($ or %)
            </label>
            <input
              value={payRate}
              onChange={(e) => setPayRate(e.target.value)}
              onBlur={savePay}
              inputMode="decimal"
              className="w-full border border-line rounded-lg px-2.5 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {!isSelf && (
        <div className="mt-3 pt-3 border-t border-line">
          {deleteError && <p className="text-danger text-xs mb-2">{deleteError}</p>}
          <button
            onClick={deleteEmployee}
            disabled={deleting}
            className="text-danger text-xs font-bold disabled:opacity-60"
          >
            {deleting ? "Removing..." : "Remove employee login"}
          </button>
        </div>
      )}
    </div>
  );
}
