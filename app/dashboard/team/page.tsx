import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import Link from "next/link";
import EmployeeCard from "./employee-card";
import AddEmployeeForm from "./add-employee-form";

export default async function TeamPage() {
  const { role, user } = await getCurrentProfile();
  if (role !== "admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, role, photo_gate_enabled, ai_estimator_enabled, commission_rate, pay_type, pay_rate, created_at")
    .order("created_at", { ascending: true });

  return (
    <div>
      <Link href="/dashboard/settings" className="text-steel font-bold text-sm">
        ← Back to Settings
      </Link>
      <div className="text-xl font-extrabold mt-3 mb-1">Team & roles</div>
      <p className="text-sm text-neutral-500 mb-4">
        Admins can access everything. Salesmen see customers, invoices, and the map. Technicians
        only see their assigned jobs. Photo verification can be required or skipped per person,
        regardless of role — tap a field to edit it, it saves automatically.
      </p>

      <AddEmployeeForm />

      <div className="flex flex-col gap-2">
        {(profiles ?? []).map((p) => (
          <EmployeeCard key={p.id} profile={p} isSelf={p.id === user?.id} />
        ))}
      </div>
    </div>
  );
}
