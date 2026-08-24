import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import Link from "next/link";
import AnimatedNumber from "./animated-number";
import DailyRevenueChart from "./daily-revenue-chart";
import AverageJobSizeChart from "./avg-job-size-chart";
import Leaderboard from "./leaderboard";

export default async function OverviewPage() {
  const { role, fullName } = await getCurrentProfile();
  if (role === "technician") redirect("/dashboard/jobs");

  const supabase = await createClient();

  const eightMonthsAgo = new Date();
  eightMonthsAgo.setMonth(eightMonthsAgo.getMonth() - 7);
  eightMonthsAgo.setDate(1);

  const [{ data: customers }, { data: quotes }, { data: doorLogs }, { data: paidQuotesForCharts }, { data: profiles }, { data: completedJobs }] =
    await Promise.all([
      supabase.from("customers").select("id,status"),
      supabase.from("quotes").select("id,total,status"),
      supabase.from("door_logs").select("id,created_at,outcome"),
      supabase
        .from("quotes")
        .select("total, paid_at, sold_by, created_by")
        .eq("status", "Paid")
        .gte("paid_at", eightMonthsAgo.toISOString()),
      supabase.from("profiles").select("id, full_name"),
      supabase
        .from("jobs")
        .select("assigned_to, completed_at")
        .eq("status", "Completed")
        .gte("completed_at", eightMonthsAgo.toISOString()),
    ]);

  const allCustomers = customers ?? [];
  const allQuotes = quotes ?? [];
  const allDoors = doorLogs ?? [];
  const paidForCharts = paidQuotesForCharts ?? [];
  const nameById: Record<string, string> = {};
  (profiles ?? []).forEach((p) => (nameById[p.id] = p.full_name || "Team member"));

  const active = allCustomers.filter((c) => c.status !== "Done" && c.status !== "Lost").length;
  const won = allCustomers.filter((c) => c.status === "Done").length;
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

  // Daily revenue — last 7 days
  const dailyRevenue = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().slice(0, 10);
    const total = paidForCharts
      .filter((q) => q.paid_at?.slice(0, 10) === dayStr)
      .reduce((s, q) => s + Number(q.total || 0), 0);
    return { day: d.toLocaleDateString(undefined, { weekday: "short" }), total };
  });

  // Average job size — last 6 months
  const avgJobSize = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthQuotes = paidForCharts.filter((q) => q.paid_at?.slice(0, 7) === monthKey);
    const avg = monthQuotes.length
      ? monthQuotes.reduce((s, q) => s + Number(q.total || 0), 0) / monthQuotes.length
      : 0;
    return { month: d.toLocaleDateString(undefined, { month: "short" }), avg };
  });

  // Leaderboard — current calendar month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthLabel = monthStart.toLocaleDateString(undefined, { month: "long" });

  const thisMonthPaid = paidForCharts.filter((q) => q.paid_at && new Date(q.paid_at) >= monthStart);
  const salesTotals: Record<string, { jobs: number; amount: number }> = {};
  thisMonthPaid.forEach((q) => {
    const id = q.sold_by || q.created_by;
    if (!id) return;
    if (!salesTotals[id]) salesTotals[id] = { jobs: 0, amount: 0 };
    salesTotals[id].jobs += 1;
    salesTotals[id].amount += Number(q.total || 0);
  });
  const salesLeaders = Object.entries(salesTotals)
    .map(([id, v]) => ({ id, name: nameById[id] || "Team member", ...v }))
    .sort((a, b) => b.amount - a.amount);

  const thisMonthJobs = (completedJobs ?? []).filter(
    (j) => j.completed_at && new Date(j.completed_at) >= monthStart
  );
  const techTotals: Record<string, { jobs: number }> = {};
  thisMonthJobs.forEach((j) => {
    if (!j.assigned_to) return;
    if (!techTotals[j.assigned_to]) techTotals[j.assigned_to] = { jobs: 0 };
    techTotals[j.assigned_to].jobs += 1;
  });
  const techLeaders = Object.entries(techTotals)
    .map(([id, v]) => ({ id, name: nameById[id] || "Team member", jobs: v.jobs, amount: 0 }))
    .sort((a, b) => b.jobs - a.jobs);


  return (
    <div>
      <div className="mb-6">
        <div className="text-2xl font-extrabold">
          {greeting()}{fullName ? `, ${fullName.split(" ")[0]}` : ""}.
        </div>
        <p className="text-neutral-500 text-sm mt-1">Here&apos;s how things are looking.</p>
      </div>

      <SectionLabel>This week</SectionLabel>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat label="Active customers" value={active} icon="users" color="#2B4C6F" />
        <Stat label="Done" value={won} icon="check" color="#2F8F4E" />
        <Stat label="Doors knocked" value={doorsThisWeek} icon="door" color="#3D8B4C" />
        <Stat label="Interested" value={interestedThisWeek} icon="spark" color="#B45F0A" />
      </div>

      <Leaderboard monthLabel={monthLabel} sales={salesLeaders} tech={techLeaders} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-line rounded-2xl p-4 shadow-sm">
          <div className="font-bold text-sm mb-1">Average job size</div>
          <AverageJobSizeChart data={avgJobSize} />
        </div>
        <div className="bg-white border border-line rounded-2xl p-4 shadow-sm">
          <div className="font-bold text-sm mb-1">Daily revenue</div>
          <DailyRevenueChart data={dailyRevenue} />
        </div>
      </div>

      <SectionLabel>Revenue</SectionLabel>
      <div className="grid grid-cols-2 gap-3 mb-8 md:max-w-xl">
        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
          <IconBadge icon="clock" color="#B45F0A" />
          <div className="text-2xl font-extrabold mt-3">
            $<AnimatedNumber value={Math.round(pipelineValue)} />
          </div>
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
            Open quotes
          </div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
          <IconBadge icon="cash" color="#2F8F4E" />
          <div className="text-2xl font-extrabold mt-3 text-good">
            $<AnimatedNumber value={Math.round(paidValue)} />
          </div>
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
            Collected
          </div>
        </div>
      </div>

      <SectionLabel>Quick actions</SectionLabel>
      <div className="flex gap-3 md:max-w-md">
        <Link
          href="/dashboard/customers/new"
          className="flex-1 bg-signal text-white font-bold text-center rounded-xl py-3 shadow-sm hover:opacity-90"
        >
          Add customer
        </Link>
        <Link
          href="/dashboard/map"
          className="flex-1 bg-white border border-line font-bold text-center rounded-xl py-3 hover:bg-[#FAFAF8]"
        >
          Log a door
        </Link>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-3">
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: IconName;
  color: string;
}) {
  return (
    <div className="bg-white border border-line rounded-2xl p-4 shadow-sm">
      <IconBadge icon={icon} color={color} />
      <div className="text-2xl font-extrabold mt-3">
        <AnimatedNumber value={value} />
      </div>
      <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

type IconName = "users" | "check" | "door" | "spark" | "clock" | "cash";

function IconBadge({ icon, color }: { icon: IconName; color: string }) {
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center"
      style={{ background: `${color}1A` }}
    >
      <StatIcon name={icon} color={color} />
    </div>
  );
}

function StatIcon({ name, color }: { name: IconName; color: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" };
  switch (name) {
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" stroke={color} strokeWidth="2" />
          <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M16.5 4.5a3.5 3.5 0 0 1 0 7M20 20a5.5 5.5 0 0 0-4-5.3" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
          <path d="M8 12.5l2.5 2.5L16 9.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "door":
      return (
        <svg {...common}>
          <rect x="5" y="3" width="14" height="18" rx="1" stroke={color} strokeWidth="2" />
          <circle cx="15" cy="12" r="1" fill={color} />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3l1.8 5.3L19 10l-5.2 1.7L12 17l-1.8-5.3L5 10l5.2-1.7L12 3Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
          <path d="M12 7v5l3.5 2" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "cash":
      return (
        <svg {...common}>
          <rect x="2.5" y="6" width="19" height="12" rx="2" stroke={color} strokeWidth="2" />
          <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
        </svg>
      );
  }
}
