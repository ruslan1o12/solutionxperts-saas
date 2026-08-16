import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { jobId } = await req.json();
    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: job } = await supabase
      .from("jobs")
      .select("id, scheduled_at, assigned_to, customers(name, address)")
      .eq("id", jobId)
      .single();

    if (!job || !job.assigned_to) {
      return NextResponse.json({ error: "Job or assigned technician not found." }, { status: 404 });
    }

    const { data: tech } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", job.assigned_to)
      .single();

    if (!tech) {
      return NextResponse.json({ error: "Technician profile not found." }, { status: 404 });
    }

    const when = job.scheduled_at
      ? new Date(job.scheduled_at).toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "no time set yet";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = job.customers as any;
    const customerName = customer?.name ?? "a customer";
    const address = customer?.address ?? "";

    const results: { email: string | null; sms: string | null } = { email: null, sms: null };

    // Email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && tech.email) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.NOTIFY_FROM_EMAIL || "SolutionXperts <onboarding@resend.dev>",
          to: tech.email,
          subject: `New job assigned — ${customerName}`,
          html: `<p>Hi ${tech.full_name || "there"},</p>
                 <p>You've been assigned a job for <b>${customerName}</b>${address ? ` at ${address}` : ""}.</p>
                 <p>Scheduled: <b>${when}</b></p>
                 <p>Open it in the app to see full details and update status.</p>`,
        }),
      });
      results.email = res.ok ? "sent" : `failed (${res.status})`;
    } else {
      results.email = !tech.email ? "skipped: no email on file" : "skipped: not configured";
    }

    // SMS via Twilio
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    if (sid && authToken && fromNumber && tech.phone) {
      const body = `SolutionXperts: New job assigned — ${customerName}${address ? ` (${address})` : ""}. Scheduled ${when}. Check the app for details.`;
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: tech.phone,
          From: fromNumber,
          Body: body,
        }),
      });
      results.sms = res.ok ? "sent" : `failed (${res.status})`;
    } else {
      results.sms = !tech.phone ? "skipped: no phone on file" : "skipped: not configured";
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("notify-job-assigned error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
