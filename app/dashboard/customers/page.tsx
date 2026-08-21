import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import CustomersView from "./customers-view";

export default async function CustomersPage() {
  const { role } = await getCurrentProfile();
  if (role === "technician") redirect("/dashboard/jobs");

  const supabase = await createClient();
  const [{ data: customers }, { data: profiles }] = await Promise.all([
    supabase.from("customers").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const nameById: Record<string, string> = {};
  (profiles ?? []).forEach((p) => (nameById[p.id] = p.full_name || "Team member"));
  const withAddedBy = (customers ?? []).map((c) => ({
    ...c,
    added_by_name: c.created_by ? nameById[c.created_by] || "Team member" : null,
  }));

  return <CustomersView list={withAddedBy} />;
}
