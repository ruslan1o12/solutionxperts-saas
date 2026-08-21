import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    // Verify the caller is actually an admin using their real session — the
    // service-role client itself has no idea who's asking, so this check is
    // the only thing standing between this route and anyone with the URL.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Only admins can add employees." }, { status: 403 });
    }

    const { fullName, email, password, phone, role } = await req.json();
    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Not set up yet — add SUPABASE_SERVICE_ROLE_KEY in Vercel (see DEPLOY.md)." },
        { status: 500 }
      );
    }

    const admin = createAdminClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email verification — admin is vouching for this account
      user_metadata: { full_name: fullName },
    });

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message || "Couldn't create the account." },
        { status: 400 }
      );
    }

    // The signup trigger already inserts a basic profile row; fill in the rest.
    await admin
      .from("profiles")
      .update({ phone: phone || null, role: role || "technician" })
      .eq("id", created.user.id);

    return NextResponse.json({ ok: true, id: created.user.id });
  } catch (err) {
    console.error("create-employee error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
