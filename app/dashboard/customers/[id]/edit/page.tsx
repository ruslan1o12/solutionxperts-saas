"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AddressSearch from "../../../address-search";

const TYPES = ["Handyman", "Cleaning", "Pothole Repair", "Road Resurfacing", "Other"];

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [type, setType] = useState(TYPES[0]);
  const [followUp, setFollowUp] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("customers")
      .select("*")
      .eq("id", params.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setName(data.name || "");
          setContact(data.contact || "");
          setAddress(data.address || "");
          setLat(data.lat ?? null);
          setLng(data.lng ?? null);
          setType(data.service_type || TYPES[0]);
          setFollowUp(data.follow_up || "");
        }
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Enter a name.");
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("customers")
      .update({
        name: name.trim(),
        contact: contact.trim(),
        address: address.trim(),
        lat,
        lng,
        service_type: type,
        follow_up: followUp || null,
      })
      .eq("id", params.id);

    setSaving(false);
    if (error) return setError(error.message);
    router.push(`/dashboard/customers/${params.id}`);
  }

  if (loading) return <p className="text-sm text-neutral-400 text-center py-10">Loading...</p>;

  return (
    <form onSubmit={handleSubmit}>
      <button
        type="button"
        onClick={() => router.push(`/dashboard/customers/${params.id}`)}
        className="text-steel font-bold text-sm mb-3"
      >
        ← Back
      </button>
      <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-3">
        Edit customer
      </div>

      <Field label="Name / business">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 bg-white"
        />
      </Field>

      <Field label="Phone or email">
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 bg-white"
        />
      </Field>

      <Field label="Address">
        <AddressSearch
          value={address}
          onChange={(v) => { setAddress(v); setLat(null); setLng(null); }}
          onSelect={(r) => { setAddress(r.label); setLat(r.lat); setLng(r.lng); }}
        />
      </Field>

      <Field label="Service type">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 bg-white"
        >
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>

      <Field label="Next follow-up">
        <input
          type="date"
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2.5 bg-white"
        />
      </Field>

      {error && <p className="text-danger text-sm mb-2">{error}</p>}

      <button
        disabled={saving}
        className="w-full bg-signal text-white font-bold rounded-xl py-3 mt-2 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save changes"}
      </button>
    </form>
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
