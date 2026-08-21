import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import Link from "next/link";
import DayLogRow from "./day-log-row";
import ExportActivityButton from "./export-activity-button";

function hoursBetween(start: string | null, end: string | null) {
  if (!start || !end) return "";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return (ms / 3600000).toFixed(1);
}

export default async function TeamActivityPage() {
  const { role } = await getCurrentProfile();
  if (role !== "admin") redirect("/dashboard");

  const supabase = await createClient();

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const rangeStart = fourteenDaysAgo.toISOString().slice(0, 10);

  const [{ data: days }, { data: profiles }, { data: completedJobs }, { data: paidQuotes }] =
    await Promise.all([
      supabase
        .from("work_days")
        .select("*")
        .gte("work_date", rangeStart)
        .order("work_date", { ascending: false }),
      supabase.from("profiles").select("id, full_name"),
      supabase
        .from("jobs")
        .select("assigned_to, completed_at, customers(service_type)")
        .eq("status", "Completed")
        .gte("completed_at", rangeStart),
      supabase
        .from("quotes")
        .select("created_by, paid_at")
        .eq("status", "Paid")
        .gte("paid_at", rangeStart),
    ]);

  const nameFor = (id: string) => profiles?.find((p) => p.id === id)?.full_name || "Unnamed";

  const list = days ?? [];
  const totalDoors = list.reduce((s, d) => s + (d.doors_knocked || 0), 0);

  const rows = list.map((d) => {
    const salesMade = (paidQuotes ?? []).filter(
      (q) => q.created_by === d.user_id && q.paid_at?.slice(0, 10) === d.work_date
    ).length;
    const housesCleaned = (completedJobs ?? []).filter((j) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customer = j.customers as any;
      return (
        j.assigned_to === d.user_id &&
        j.completed_at?.slice(0, 10) === d.work_date &&
        customer?.service_type === "Cleaning"
      );
    }).length;
    return {
      name: nameFor(d.user_id),
      date: d.work_date,
      isDriver: !!d.is_driver,
      hours: hoursBetween(d.started_at, d.ended_at),
      doorsKnocked: d.doors_knocked || 0,
      salesMade,
      housesCleaned,
    };
  });

  return (
    <div>
      <Link href="/dashboard/team" className="text-steel font-bold text-sm">
        ← Back to Team
      </Link>
      <div className="flex items-center justify-between mt-3 mb-1">
        <div className="text-xl font-extrabold">Team activity</div>
        <ExportActivityButton rows={rows} />
      </div>
      <p className="text-sm text-neutral-500 mb-4">
        Last 14 days. Includes hours, doors knocked, sales made, and houses cleaned per person —
        export to CSV for payroll or reporting.
      </p>

      <div className="bg-white border border-line rounded-2xl p-4 text-center mb-4">
        <div className="text-2xl font-extrabold">{totalDoors}</div>
        <div className="text-[11px] font-semibold text-neutral-500 uppercase">
          Total doors knocked
        </div>
      </div>

      {list.length === 0 && (
        <p className="text-sm text-neutral-500 text-center py-10">
          No day logs yet — the team hasn&apos;t used &quot;My Day&quot; yet.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {list.map((d) => (
          <DayLogRow key={d.id} day={d} name={nameFor(d.user_id)} />
        ))}
      </div>
    </div>
  );
}
