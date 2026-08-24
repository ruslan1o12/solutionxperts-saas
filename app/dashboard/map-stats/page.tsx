import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import Link from "next/link";
import MapStatsClient from "./map-stats-client";

export default async function MapStatsPage() {
  const { role } = await getCurrentProfile();
  if (role === "technician") redirect("/dashboard/jobs");

  const supabase = await createClient();
  const [{ data: logs }, { data: profiles }] = await Promise.all([
    supabase.from("door_logs").select("created_by, created_at, outcome").limit(5000),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const names: Record<string, string> = {};
  (profiles ?? []).forEach((p) => (names[p.id] = p.full_name || "Team member"));

  return (
    <div>
      <Link href="/dashboard/map" className="text-steel font-bold text-sm">
        ← Back to Map
      </Link>
      <div className="text-xl font-extrabold mt-3 mb-1">Map stats</div>
      <p className="text-sm text-neutral-500 mb-4">
        Who&apos;s knocking the most doors, and how it&apos;s going.
      </p>
      <MapStatsClient logs={logs ?? []} names={names} />
    </div>
  );
}
