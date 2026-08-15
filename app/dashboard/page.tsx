import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function OverviewPage() {
  const { role } = await getCurrentProfile();
  if (role === "technician") redirect("/dashboard/jobs");

  const supabase = await createClient();

  const [{ data: customers }, { data: quotes }, { data: doorLogs }] = await Promise.all([
    supabase.from("customers").select("id,status"),
    supabase.from("quotes").select("id,total,status"),
    supabase.from("door_logs").select("id,created_at,outcome"),
  ]);

  const allCustomers = customers ?? [];
  const allQuotes = quotes ?? [];
  const allDoors = doorLogs ?? [];

  const active = allCustomers.filter((c) => c.status !== "Won" && c.status !== "Lost").length;
  const won = allCustomers.filter((c) => c.status === "Won").length;
  const pipelineValue = allQuotes
    .filter((q) => q.status !== "Paid")
    .reduce((sum, q) => sum + Number(q.total || 0), 0);
  const paidValue = allQuotes
    .filter((q) => q.status === "Paid")
    .reduce((sum, q) => sum + Number(q.total || 0), 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const doorsThisWeek = allDoors.filter((d) => new Date(d.created_at) >= weekAgo).length;
  const interestedThisWeek = allDoors.filter(
    (d) => new Date(d.created_at) >= weekAgo && d.outcome === "Answered - Interested"
  ).length;

  return (
    <div>
      <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-3">
        This week
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Stat label="Active customers" value={active} />
        <Stat label="Won total" value={won} />
        <Stat label="Doors knocked" value={doorsThisWeek} />
        <Stat label="Interested" value={interestedThisWeek} />
      </div>

      <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-3">Revenue</div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white border border-line rounded-2xl p-4">
          <div className="text-2xl font-extrabold">${pipelineValue.toFixed(0)}</div>
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
            Open quotes
          </div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-4">
          <div className="text-2xl font-extrabold text-good">${paidValue.toFixed(0)}</div>
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
            Collected
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href="/dashboard/customers/new"
          className="flex-1 bg-signal text-white font-bold text-center rounded-xl py-3"
        >
          Add customer
        </Link>
        <Link
          href="/dashboard/map"
          className="flex-1 bg-white border border-line font-bold text-center rounded-xl py-3"
        >
          Log a door
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-line rounded-2xl p-4 text-center">
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}
