import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/sendPush";

export async function POST(req: NextRequest) {
  try {
    const { token, action } = await req.json();
    if (!token || (action !== "accept" && action !== "decline")) {
      return NextResponse.json({ error: "Bad request." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: quote } = await supabase
      .from("quotes")
      .select("*, customers(name)")
      .eq("public_token", token)
      .single();

    if (!quote) {
      return NextResponse.json({ error: "Estimate not found." }, { status: 404 });
    }

    const approval_status = action === "accept" ? "Accepted" : "Declined";
    await supabase
      .from("quotes")
      .update({ approval_status, approved_at: new Date().toISOString() })
      .eq("id", quote.id);

    const customerName = (quote.customers as { name: string } | null)?.name ?? "A customer";

    // Figure out who to notify: the salesman who sold it, plus every admin
    const recipientIds = new Set<string>();
    if (quote.salesman_id) recipientIds.add(quote.salesman_id);
    else if (quote.created_by) recipientIds.add(quote.created_by);
    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
    (admins ?? []).forEach((a) => recipientIds.add(a.id));

    const title = `${customerName} ${action === "accept" ? "accepted" : "declined"} the estimate`;
    const message = `$${Number(quote.total).toFixed(2)} estimate — ${approval_status.toLowerCase()}.`;

    if (recipientIds.size > 0) {
      await supabase.from("notifications").insert(
        Array.from(recipientIds).map((id) => ({
          recipient_id: id,
          title,
          message,
        }))
      );
      await sendPushToUsers(Array.from(recipientIds), { title, body: message, url: "/dashboard/notifications" });
    }

    // Email whoever's getting notified, using their profile email on file
    if (recipientIds.size > 0) {
      const { data: recipientProfiles } = await supabase
        .from("profiles")
        .select("email")
        .in("id", Array.from(recipientIds));

      const { data: emailSettings } = await supabase.from("email_settings").select("*").eq("id", 1).single();
      const fromAddr = `${emailSettings?.from_name || "SolutionXperts"} <${emailSettings?.from_email || "onboarding@resend.dev"}>`;

      const resendKey = process.env.RESEND_API_KEY;
      const emails = (recipientProfiles ?? []).map((p) => p.email).filter(Boolean) as string[];
      if (resendKey && emails.length > 0) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromAddr,
            to: emails,
            subject: title,
            html: `<p>${title}.</p><p>${message}</p>`,
          }),
        }).catch((e) => console.error("Failed to email accept/decline notice", e));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("invoice-response error", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
