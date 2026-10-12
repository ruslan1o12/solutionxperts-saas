import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import { frequencyLabel, visitsPerYear } from "@/lib/recurring";

type Row = {
  id: string;
  job_description: string;
  frequency: string;
  price: number;
  status: string;
  agreement_status: string;
  next_service_date: string | null;
  customers: { name: string; address: string | null } | { name: string; address: string | null }[] | null;
};

const AGREEMENT_STYLE: Record<string, string> = {
  Accepted: "bg-[#E4F1E5] text-good",
  Sent: "bg-amber-100 text-amber-800",
  Declined: "bg-red-100 text-danger",
  "Not sent": "bg-neutral-100 text-neutral-600",
};

export default async function RecurringPage() {
  const { role } = await getCurrentProfile();
  if (role === "technician") redirect("/dashboard/jobs");

  const supabase = await createClient();
  const { data } = await supabase
    .from("recurring_contracts")
    .select("id, job_description, frequency, price, status, agreement_status, next_service_date, customers(name, address)")
    .order("next_service_date", { ascending: true, nullsFirst: false });

  const rows = (data ?? []) as unknown as Row[];
  const active = rows.filter((r) => r.status === "Active");
  const annual = active.reduce((s, r) => s + Number(r.price) * visitsPerYear(r.frequency), 0);
  const today = new Date().toISOString().slice(0, 10);
  const dueSoon = active.filter((r) => r.next_service_date && r.next_service_date <= addDays(today, 30)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-extrabold uppercase tracking-wide text-steel">Recurring customers</div>
        <Link href="/dashboard/recurring/new" className="bg-signal text-white font-bold rounded-lg px-3.5 py-2 text-sm">
          + Add
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="Active" value={String(active.length)} />
        <Stat label="Yearly value" value={`$${Math.round(annual).toLocaleString()}`} />
        <Stat label="Due in 30 days" value={String(dueSoon)} />
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-6 text-center text-neutral-500 text-sm">
          No recurring customers yet. Tap <b>+ Add</b> to set up yearly, quarterly or monthly service — new customer or
          one you already have.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const c = Array.isArray(r.customers) ? r.customers[0] : r.customers;
            return (
              <Link
                key={r.id}
                href={`/dashboard/recurring/${r.id}`}
                className="block bg-white border border-line rounded-2xl p-4 hover:border-signal transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-extrabold truncate">{c?.name ?? "Customer"}</div>
                    <div className="text-sm text-neutral-600 truncate">{r.job_description || "No job entered yet"}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold">${Number(r.price).toFixed(2)}</div>
                    <div className="text-xs text-neutral-500">{frequencyLabel(r.frequency)}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${AGREEMENT_STYLE[r.agreement_status] ?? AGREEMENT_STYLE["Not sent"]}`}>
                    Agreement: {r.agreement_status}
                  </span>
                  {r.status !== "Active" && (
                    <span className="px-2 py-0.5 rounded-full font-bold bg-neutral-100 text-neutral-600">{r.status}</span>
                  )}
                  {r.next_service_date && (
                    <span className={r.next_service_date < today ? "text-danger font-bold" : "text-neutral-500"}>
                      Next: {r.next_service_date}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function addDays(d: string, n: number) {
  const dt = new Date(d + "T12:00:00");
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-line rounded-xl p-3 text-center">
      <div className="text-lg font-extrabold">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{label}</div>
    </div>
  );
}
