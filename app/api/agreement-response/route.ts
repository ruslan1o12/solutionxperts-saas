import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/sendPush";

export async function POST(req: NextRequest) {
  try {
    const { token, action, name } = await req.json();
    if (!token || (action !== "accept" && action !== "decline")) {
      return NextResponse.json({ error: "Bad request." }, { status: 400 });
    }
    if (action === "accept" && !String(name || "").trim()) {
      return NextResponse.json({ error: "Please type your full name to accept." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: contract } = await supabase
      .from("recurring_contracts")
      .select("*, customers(name)")
      .eq("public_token", token)
      .single();
    if (!contract) return NextResponse.json({ error: "Agreement not found." }, { status: 404 });

    const agreement_status = action === "accept" ? "Accepted" : "Declined";
    await supabase
      .from("recurring_contracts")
      .update({
        agreement_status,
        agreement_responded_at: new Date().toISOString(),
        signed_name: action === "accept" ? String(name).trim() : null,
      })
      .eq("id", contract.id);

    const cust = Array.isArray(contract.customers) ? contract.customers[0] : contract.customers;
    const customerName = (cust as { name: string } | null)?.name ?? "A customer";

    const recipientIds = new Set<string>();
    if (contract.created_by) recipientIds.add(contract.created_by);
    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
    (admins ?? []).forEach((a) => recipientIds.add(a.id));

    const title = `${customerName} ${action === "accept" ? "accepted" : "declined"} the recurring agreement`;
    const message = `${contract.job_description} — $${Number(contract.price).toFixed(2)} ${contract.frequency}.`;

    if (recipientIds.size > 0) {
      const ids = Array.from(recipientIds);
      await supabase.from("notifications").insert(ids.map((id) => ({ recipient_id: id, title, message })));
      await sendPushToUsers(ids, { title, body: message, url: `/dashboard/recurring/${contract.id}` });

      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const { data: profs } = await supabase.from("profiles").select("email").in("id", ids);
        const { data: es } = await supabase.from("email_settings").select("*").eq("id", 1).single();
        const emails = (profs ?? []).map((p) => p.email).filter(Boolean) as string[];
        if (emails.length > 0) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: `${es?.from_name || "SolutionXperts"} <${es?.from_email || "onboarding@resend.dev"}>`,
              to: emails,
              subject: title,
              html: `<p>${title}.</p><p>${message}</p>`,
            }),
          }).catch((e) => console.error("agreement email failed", e));
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("agreement-response error", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
