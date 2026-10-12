export type Frequency = "monthly" | "quarterly" | "yearly";

export const FREQUENCIES: { value: Frequency; label: string; perYear: number; months: number }[] = [
  { value: "monthly", label: "Monthly", perYear: 12, months: 1 },
  { value: "quarterly", label: "Quarterly (every 3 months)", perYear: 4, months: 3 },
  { value: "yearly", label: "Yearly", perYear: 1, months: 12 },
];

export function frequencyLabel(f: string) {
  return FREQUENCIES.find((x) => x.value === f)?.label.split(" (")[0] ?? f;
}

export function visitsPerYear(f: string) {
  return FREQUENCIES.find((x) => x.value === f)?.perYear ?? 1;
}

/** Add one service interval to a YYYY-MM-DD date. */
export function addInterval(dateStr: string, f: string): string {
  const months = FREQUENCIES.find((x) => x.value === f)?.months ?? 12;
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0); // e.g. Jan 31 + 1 month -> Feb 28
  return d.toISOString().slice(0, 10);
}

export const DEFAULT_AGREEMENT = `RECURRING SERVICE AGREEMENT

This agreement is between {{business}} ("we", "us") and {{customer}} ("you") for the property at {{address}}.

1. Services
We will perform the following work: {{job}}

2. Schedule
This work will be completed {{frequency}}, starting around {{start_date}}. We will contact you ahead of each visit to confirm a date that suits you.

3. Price
The price per visit is {{price}} (plus applicable taxes). That works out to about {{annual}} per year. Payment is due after each completed visit unless we've agreed otherwise.

4. Changes and cancellation
Either of us can pause or cancel this agreement at any time by letting the other know. Pricing may be adjusted with notice before the next visit.

5. Access and conditions
Please make sure we have safe access to the areas being serviced. Work that can't be completed because of weather or access may be rescheduled at no extra charge.

By accepting below, you agree to these terms.`;

export type AgreementVars = {
  business: string;
  customer: string;
  address?: string | null;
  job: string;
  frequency: string;
  price: number | string;
  start_date?: string | null;
};

/** Fill {{placeholders}} in the agreement text with the contract's details. */
export function renderAgreement(text: string | null | undefined, v: AgreementVars): string {
  const price = Number(v.price || 0);
  const money = (n: number) => `$${n.toFixed(2)}`;
  const map: Record<string, string> = {
    business: v.business,
    customer: v.customer,
    address: v.address || "the address on file",
    job: v.job || "(to be confirmed)",
    frequency: frequencyLabel(v.frequency).toLowerCase(),
    price: money(price),
    annual: money(price * visitsPerYear(v.frequency)),
    start_date: v.start_date || "a date we'll agree on",
  };
  return (text || DEFAULT_AGREEMENT).replace(/\{\{(\w+)\}\}/g, (m, k) => (k in map ? map[k] : m));
}
