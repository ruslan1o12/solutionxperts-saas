"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RateItem = {
  id: string;
  service_name: string;
  unit: string;
  low_price: number;
  high_price: number;
  notes: string | null;
};

type ResultLine = {
  service_name: string;
  estimated_quantity: string;
  low: number;
  high: number;
  reasoning: string;
};

function resizeImage(file: File, maxWidth = 1024, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function EstimatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [rateCard, setRateCard] = useState<RateItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [images, setImages] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    line_items: ResultLine[];
    total_low: number;
    total_high: number;
    caveats: string[];
  } | null>(null);

  useEffect(() => {
    supabase
      .from("rate_card")
      .select("*")
      .order("service_name")
      .then(({ data }) => setRateCard(data ?? []));
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    const remaining = 8 - images.length;
    const toProcess = Array.from(files).slice(0, remaining);
    try {
      const resized = await Promise.all(toProcess.map((f) => resizeImage(f)));
      setImages((prev) => [...prev, ...resized]);
    } catch {
      setError("Couldn't process one of those photos — try again.");
    }
  }

  function toggleService(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generateEstimate() {
    if (images.length === 0) return setError("Add at least one photo.");
    const selected = rateCard.filter((r) => selectedIds.has(r.id));
    if (selected.length === 0) return setError("Select at least one service.");

    setError(null);
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/ai-estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images, selectedServices: selected, notes }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Couldn't generate an estimate.");
      return;
    }
    setResult(data);
  }

  function updateLine(idx: number, field: "low" | "high", value: string) {
    if (!result) return;
    const lines = [...result.line_items];
    lines[idx] = { ...lines[idx], [field]: Number(value) || 0 };
    const total_low = lines.reduce((s, l) => s + l.low, 0);
    const total_high = lines.reduce((s, l) => s + l.high, 0);
    setResult({ ...result, line_items: lines, total_low, total_high });
  }

  function continueToQuote() {
    if (!result) return;
    const lines = result.line_items.map((l) => ({
      desc: `${l.service_name} (${l.estimated_quantity})`,
      qty: "1",
      price: (((l.low + l.high) / 2) || 0).toFixed(2),
    }));
    sessionStorage.setItem(`sx_estimate_${params.id}`, JSON.stringify(lines));
    router.push(`/dashboard/customers/${params.id}/quote?fromEstimate=1`);
  }

  return (
    <div>
      <button onClick={() => router.back()} className="text-steel font-bold text-sm mb-3">
        ← Back
      </button>
      <div className="text-xl font-extrabold mb-1">AI rough estimate</div>
      <p className="text-sm text-neutral-500 mb-4">
        Draft only — review every number before sending it to a customer.
      </p>

      <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-2">
        Photos ({images.length}/8)
      </div>
      <div className="grid grid-cols-4 gap-2 mb-2">
        {images.map((img, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
              className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-5 h-5 text-xs leading-5"
            >
              ×
            </button>
          </div>
        ))}
        {images.length < 8 && (
          <label className="aspect-square rounded-lg border-2 border-dashed border-line flex items-center justify-center text-steel text-2xl cursor-pointer">
            +
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
          </label>
        )}
      </div>

      <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-2 mt-5">
        Services to estimate
      </div>
      <div className="flex flex-col gap-2 mb-4">
        {rateCard.map((r) => (
          <label
            key={r.id}
            className={`border rounded-xl p-3 flex items-center gap-3 cursor-pointer ${
              selectedIds.has(r.id) ? "border-signal bg-[#EAF6EC]" : "border-line bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(r.id)}
              onChange={() => toggleService(r.id)}
              className="w-4 h-4"
            />
            <div>
              <div className="font-bold text-sm">{r.service_name}</div>
              <div className="text-xs text-neutral-500">
                ${r.low_price}–${r.high_price} / {r.unit}
              </div>
            </div>
          </label>
        ))}
        {rateCard.length === 0 && (
          <p className="text-sm text-neutral-500">
            No rate card yet — ask an admin to set one up under Team → Manage rate card.
          </p>
        )}
      </div>

      <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-2">
        On-site notes
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Anything the photos won't show — steep driveway, heavy staining, tight access, etc."
        className="w-full border border-line rounded-lg px-3 py-2.5 bg-white mb-4 min-h-20"
      />

      {error && <p className="text-danger text-sm mb-3">{error}</p>}

      <button
        onClick={generateEstimate}
        disabled={loading}
        className="w-full bg-signal text-white font-bold rounded-xl py-3 disabled:opacity-60 mb-4"
      >
        {loading ? "Analyzing photos..." : "Generate estimate"}
      </button>

      {result && (
        <div>
          <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-2">
            Draft estimate — review before saving
          </div>
          {result.line_items.map((line, i) => (
            <div key={i} className="bg-white border border-line rounded-2xl p-3 mb-2">
              <div className="font-bold text-sm">{line.service_name}</div>
              <div className="text-xs text-neutral-500 mb-2">
                Est. quantity: {line.estimated_quantity}
              </div>
              <div className="text-xs text-neutral-600 mb-2">{line.reasoning}</div>
              <div className="flex gap-2 items-center">
                <span className="text-xs font-bold">$</span>
                <input
                  value={line.low}
                  onChange={(e) => updateLine(i, "low", e.target.value)}
                  inputMode="decimal"
                  className="w-20 border border-line rounded-lg px-2 py-1.5 text-sm"
                />
                <span className="text-xs text-neutral-400">to</span>
                <span className="text-xs font-bold">$</span>
                <input
                  value={line.high}
                  onChange={(e) => updateLine(i, "high", e.target.value)}
                  inputMode="decimal"
                  className="w-20 border border-line rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          ))}

          {result.caveats?.length > 0 && (
            <div className="bg-[#FFF1DF] border border-[#F0D6AE] rounded-2xl p-3 mb-3">
              <div className="text-xs font-extrabold text-[#8A5A17] uppercase mb-1">
                Couldn&apos;t assess from photos
              </div>
              <ul className="text-xs text-[#8A5A17] list-disc pl-4">
                {result.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between items-center border-t-2 border-ink py-3 mb-4">
            <span className="text-sm font-bold">Total range</span>
            <span className="text-xl font-extrabold">
              ${result.total_low.toFixed(0)} – ${result.total_high.toFixed(0)}
            </span>
          </div>

          <button
            onClick={continueToQuote}
            className="w-full bg-ink text-paper font-bold rounded-xl py-3"
          >
            Continue to quote builder
          </button>
        </div>
      )}
    </div>
  );
}
