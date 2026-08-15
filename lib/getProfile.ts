import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "salesman" | "technician";

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, role: null as Role | null, fullName: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  return {
    user,
    role: (profile?.role as Role) ?? "technician",
    fullName: profile?.full_name ?? null,
  };
}
