"use client";

import { useEffect, useRef, useState } from "react";

export type AddressResult = { label: string; lat: number; lng: number };

export default function AddressSearch({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address...",
}: {
  value: string;
  onChange: (text: string) => void;
  onSelect: (result: AddressResult) => void;
  placeholder?: string;
}) {
  const [results, setResults] = useState<AddressResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 4) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/address-search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full border border-line rounded-lg px-3 py-2.5"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">...</span>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-[2000] left-0 right-0 mt-1 bg-white border border-line rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSelect(r);
                setOpen(false);
                setResults([]);
              }}
              className="block w-full text-left px-3 py-2.5 text-sm border-b border-line last:border-b-0 hover:bg-[#F4F7F2]"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
