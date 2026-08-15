import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import Link from "next/link";
import RoleSelect from "./role-select";

export default async function TeamPage() {
  const { role, user } = await getCurrentProfile();
  if (role !== "admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .order("created_at", { ascending: true });

  return (
    <div>
      <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-1">Team</div>
      <p className="text-sm text-neutral-500 mb-4">
        Admins can access everything. Salesmen see customers, invoices, and the map. Technicians
        only see their assigned jobs.
      </p>

      <Link
        href="/dashboard/settings/rate-card"
        className="block bg-white border border-line rounded-2xl p-4 mb-4 font-bold text-steel"
      >
        Manage rate card (used by the AI estimator) →
      </Link>

      <div className="flex flex-col gap-2">
        {(profiles ?? []).map((p) => (
          <div
            key={p.id}
            className="bg-white border border-line rounded-2xl p-4 flex items-center justify-between"
          >
            <div>
              <div className="font-bold">{p.full_name || "Unnamed"}</div>
              {p.id === user?.id && (
                <div className="text-[11px] text-neutral-400 font-semibold">You</div>
              )}
            </div>
            <RoleSelect profileId={p.id} currentRole={p.role} isSelf={p.id === user?.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
