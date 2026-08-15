"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RateItem = {
  id: string;
  service_name: string;
  unit: string;
  low_price: number;
  high_price: number;
  notes: string | null;
};

export default function RateCardEditor({ items }: { items: RateItem[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateField(id: string, field: string, value: string) {
    const { error } = await supabase
      .from("rate_card")
      .update({ [field]: field.includes("price") ? Number(value) || 0 : value })
      .eq("id", id);
    if (error) return setError(error.message);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this service from the rate card?")) return;
    const { error } = await supabase.from("rate_card").delete().eq("id", id);
    if (error) return setError(error.message);
    router.refresh();
  }

  async function addNew() {
    setAdding(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("rate_card").insert({
      service_name: "New service",
      unit: "job",
      low_price: 0,
      high_price: 0,
      created_by: user?.id,
    });
    setAdding(false);
    if (error) return setError(error.message);
    router.refresh();
  }

  return (
    <div>
      <p className="text-sm text-neutral-500 mb-4">
        These are the ONLY prices the AI estimator is allowed to use. Keep them accurate — the AI
        multiplies these against what it sees in photos.
      </p>

      {error && (
        <div className="bg-[#F1E7E6] border border-[#E7CFCD] text-danger text-sm rounded-xl p-3 mb-4">
          Couldn&apos;t save: {error}. If this keeps happening, re-run the latest{" "}
          <code className="text-xs">supabase-schema.sql</code> in Supabase — it sets up the
          permissions this screen needs.
        </div>
      )}

      <div className="flex flex-col gap-2 mb-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-line rounded-2xl p-3">
            <input
              defaultValue={item.service_name}
              onBlur={(e) => updateField(item.id, "service_name", e.target.value)}
              className="w-full font-bold text-sm mb-2 border-b border-transparent focus:border-line outline-none py-1"
            />
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Unit</label>
                <input
                  defaultValue={item.unit}
                  onBlur={(e) => updateField(item.id, "unit", e.target.value)}
                  className="w-full border border-line rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Low $</label>
                <input
                  defaultValue={item.low_price}
                  onBlur={(e) => updateField(item.id, "low_price", e.target.value)}
                  inputMode="decimal"
                  className="w-full border border-line rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">High $</label>
                <input
                  defaultValue={item.high_price}
                  onBlur={(e) => updateField(item.id, "high_price", e.target.value)}
                  inputMode="decimal"
                  className="w-full border border-line rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <input
              defaultValue={item.notes ?? ""}
              placeholder="Notes for the AI (e.g. what changes complexity)"
              onBlur={(e) => updateField(item.id, "notes", e.target.value)}
              className="w-full border border-line rounded-lg px-2 py-1.5 text-xs mb-2"
            />
            <button onClick={() => remove(item.id)} className="text-danger text-xs font-bold">
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addNew}
        disabled={adding}
        className="w-full border border-dashed border-line rounded-xl py-3 text-steel font-bold text-sm disabled:opacity-60"
      >
        {adding ? "Adding..." : "+ Add service"}
      </button>
    </div>
  );
}
