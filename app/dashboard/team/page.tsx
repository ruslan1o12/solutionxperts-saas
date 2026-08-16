import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import Link from "next/link";
import RoleSelect from "./role-select";
import PhotoGateToggle from "./photo-gate-toggle";

export default async function TeamPage() {
  const { role, user } = await getCurrentProfile();
  if (role !== "admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, photo_gate_enabled, created_at")
    .order("created_at", { ascending: true });

  return (
    <div>
      <Link href="/dashboard/settings" className="text-steel font-bold text-sm">
        ← Back to Settings
      </Link>
      <div className="text-xl font-extrabold mt-3 mb-1">Team & roles</div>
      <p className="text-sm text-neutral-500 mb-4">
        Admins can access everything. Salesmen see customers, invoices, and the map. Technicians
        only see their assigned jobs.
      </p>

      <div className="flex flex-col gap-2">
        {(profiles ?? []).map((p) => (
          <div key={p.id} className="bg-white border border-line rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold">{p.full_name || "Unnamed"}</div>
                {p.id === user?.id && (
                  <div className="text-[11px] text-neutral-400 font-semibold">You</div>
                )}
              </div>
              <RoleSelect profileId={p.id} currentRole={p.role} isSelf={p.id === user?.id} />
            </div>
            {p.role === "technician" && (
              <div className="mt-3 pt-3 border-t border-line">
                <PhotoGateToggle profileId={p.id} initialEnabled={p.photo_gate_enabled !== false} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
