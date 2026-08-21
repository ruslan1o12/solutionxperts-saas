import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Only admins can remove employees." }, { status: 403 });
    }

    const { employeeId } = await req.json();
    if (!employeeId) {
      return NextResponse.json({ error: "Missing employeeId." }, { status: 400 });
    }
    if (employeeId === user.id) {
      return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
    }

    const admin = createAdminClient();
    // Delete the profile row first (rows referencing this user via created_by/
    // assigned_to etc. keep those FKs as historical record — only the login
    // and their team-member profile go away).
    await admin.from("profiles").delete().eq("id", employeeId);
    const { error } = await admin.auth.admin.deleteUser(employeeId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete-employee error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
