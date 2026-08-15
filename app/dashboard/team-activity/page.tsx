import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import Link from "next/link";

function hoursBetween(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return (ms / 3600000).toFixed(1);
}

export default async function TeamActivityPage() {
  const { role } = await getCurrentProfile();
  if (role !== "admin") redirect("/dashboard");

  const supabase = await createClient();

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [{ data: days }, { data: profiles }] = await Promise.all([
    supabase
      .from("work_days")
      .select("*")
      .gte("work_date", fourteenDaysAgo.toISOString().slice(0, 10))
      .order("work_date", { ascending: false }),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const nameFor = (id: string) =>
    profiles?.find((p) => p.id === id)?.full_name || "Unnamed";

  const list = days ?? [];
  const totalDoors = list.reduce((s, d) => s + (d.doors_knocked || 0), 0);

  return (
    <div>
      <Link href="/dashboard/team" className="text-steel font-bold text-sm">
        ← Back to Team
      </Link>
      <div className="text-xl font-extrabold mt-3 mb-1">Team activity</div>
      <p className="text-sm text-neutral-500 mb-4">Last 14 days.</p>

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
          <div key={d.id} className="bg-white border border-line rounded-2xl p-4">
            <div className="flex justify-between items-start mb-1">
              <div>
                <div className="font-bold">{nameFor(d.user_id)}</div>
                <div className="text-xs text-neutral-500">{d.work_date}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">
                  {d.started_at && d.ended_at
                    ? `${hoursBetween(d.started_at, d.ended_at)} hrs`
                    : d.started_at
                    ? "In progress"
                    : "Not started"}
                </div>
                {d.doors_knocked != null && (
                  <div className="text-xs text-neutral-500">{d.doors_knocked} doors</div>
                )}
              </div>
            </div>
            {d.notes && <div className="text-sm text-neutral-600 mt-1">{d.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
