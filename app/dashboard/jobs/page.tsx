import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import Link from "next/link";
import ScheduleView from "./schedule-view";

const STATUS_COLOR: Record<string, string> = {
  Scheduled: "bg-[#E7EEF5] text-steel",
  "On The Way": "bg-[#FFF1DF] text-[#8A5A17]",
  Arrived: "bg-[#FFE9CC] text-[#B45F0A]",
  "In Progress": "bg-[#FFE9CC] text-[#B45F0A]",
  Completed: "bg-[#E4F1E5] text-good",
  Cancelled: "bg-[#F1E7E6] text-neutral-500",
};

export default async function JobsPage() {
  const { role, user } = await getCurrentProfile();
  const isOfficeStaff = role === "admin" || role === "salesman";

  if (isOfficeStaff) {
    return <ScheduleView />;
  }

  // Technicians get a simple "my jobs" list instead of the full calendar.
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*, customers(name, address, contact), quotes(total, status)")
    .eq("assigned_to", user?.id)
    .order("scheduled_at", { ascending: true });

  const list = jobs ?? [];

  return (
    <div>
      <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-3">
        Your jobs ({list.length})
      </div>

      {list.length === 0 && (
        <p className="text-sm text-neutral-500 text-center py-12">
          No jobs assigned to you yet.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {list.map((j) => (
          <Link
            key={j.id}
            href={`/dashboard/jobs/${j.id}`}
            className="bg-white border border-line rounded-2xl p-4 block"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold">{j.customers?.name ?? "Customer"}</div>
                <div className="text-xs text-neutral-500">{j.customers?.address}</div>
              </div>
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                  STATUS_COLOR[j.status] ?? STATUS_COLOR.Scheduled
                }`}
              >
                {j.status}
              </span>
            </div>
            {j.scheduled_at && (
              <div className="text-xs text-neutral-500 mt-1">
                {new Date(j.scheduled_at).toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            )}
            {j.quotes && (
              <div className="text-xs font-bold mt-1">
                ${Number(j.quotes.total).toFixed(2)} — {j.quotes.status}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
