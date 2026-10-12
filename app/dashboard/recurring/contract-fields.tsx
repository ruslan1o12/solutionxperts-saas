"use client";

import { DEFAULT_AGREEMENT, FREQUENCIES, visitsPerYear } from "@/lib/recurring";

export type ContractValues = {
  job_description: string;
  frequency: string;
  price: string;
  start_date: string;
  next_service_date: string;
  agreement_text: string;
};

export const emptyContract: ContractValues = {
  job_description: "",
  frequency: "yearly",
  price: "",
  start_date: "",
  next_service_date: "",
  agreement_text: DEFAULT_AGREEMENT,
};

const input = "w-full border border-line rounded-lg px-3 py-2.5 bg-white";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-neutral-500 mt-1">{hint}</p>}
    </div>
  );
}

export default function ContractFields({
  values,
  onChange,
  showNextDate,
}: {
  values: ContractValues;
  onChange: (v: ContractValues) => void;
  showNextDate?: boolean;
}) {
  const set = (k: keyof ContractValues, v: string) => onChange({ ...values, [k]: v });
  const price = Number(values.price || 0);

  return (
    <>
      <Field label="Job to be done" hint="e.g. Exterior window wash (inside + out) and screen cleaning">
        <textarea
          value={values.job_description}
          onChange={(e) => set("job_description", e.target.value)}
          rows={3}
          className={input}
          placeholder="What will you do on every visit?"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="How often">
          <select value={values.frequency} onChange={(e) => set("frequency", e.target.value)} className={input}>
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Price per visit ($)"
          hint={price > 0 ? `≈ $${(price * visitsPerYear(values.frequency)).toFixed(2)} per year` : undefined}
        >
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={values.price}
            onChange={(e) => set("price", e.target.value)}
            className={input}
            placeholder="0.00"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="First service date">
          <input type="date" value={values.start_date} onChange={(e) => set("start_date", e.target.value)} className={input} />
        </Field>
        {showNextDate && (
          <Field label="Next service date">
            <input
              type="date"
              value={values.next_service_date}
              onChange={(e) => set("next_service_date", e.target.value)}
              className={input}
            />
          </Field>
        )}
      </div>

      <Field
        label="Contract agreement"
        hint="Placeholders like {{customer}}, {{job}}, {{price}}, {{frequency}}, {{annual}}, {{address}}, {{business}} and {{start_date}} are filled in automatically for the customer. Edit it any time."
      >
        <textarea
          value={values.agreement_text}
          onChange={(e) => set("agreement_text", e.target.value)}
          rows={14}
          className={`${input} font-mono text-xs leading-relaxed`}
        />
        <button
          type="button"
          onClick={() => set("agreement_text", DEFAULT_AGREEMENT)}
          className="text-xs text-steel font-bold mt-1"
        >
          Reset to standard template
        </button>
      </Field>
    </>
  );
}
