import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEmailSender } from "@/lib/getEmailSender";
import { renderAgreement } from "@/lib/recurring";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { contractId } = await req.json();
    if (!contractId) return NextResponse.json({ error: "Missing contractId." }, { status: 400 });

    const { data: contract } = await supabase
      .from("recurring_contracts")
      .select("*, customers(name, contact, address)")
      .eq("id", contractId)
      .single();
    if (!contract) return NextResponse.json({ error: "Contract not found." }, { status: 404 });

    const customer = (Array.isArray(contract.customers) ? contract.customers[0] : contract.customers) as {
      name: string;
      contact: string | null;
      address: string | null;
    } | null;

    const { data: business } = await supabase.from("business_settings").select("*").eq("id", 1).single();
    const businessName = business?.legal_name || "SolutionXperts";
    const link = `${req.nextUrl.origin}/agreement/${contract.public_token}`;
    const contact = (customer?.contact || "").trim();

    const results: { email: string; sms: string; link: string } = { email: "skipped", sms: "skipped", link };

    const rendered = renderAgreement(contract.agreement_text, {
      business: businessName,
      customer: customer?.name || "Customer",
      address: customer?.address,
      job: contract.job_description,
      frequency: contract.frequency,
      price: contract.price,
      start_date: contract.start_date,
    });

    if (contact.includes("@")) {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        results.email = "not configured (add RESEND_API_KEY in Vercel)";
      } else {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: await getEmailSender(),
            to: contact,
            subject: `Your recurring service agreement — ${businessName}`,
            html: `<p>Hi ${esc(customer?.name || "there")},</p>
                   <p>Thanks for choosing ${esc(businessName)}! Here's the recurring service we've set up for you:</p>
                   <p><b>${esc(contract.job_description)}</b><br/>
                   ${esc(contract.frequency)} · $${Number(contract.price).toFixed(2)} per visit</p>
                   <p><a href="${link}" style="background:#3D8B4C;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Review &amp; accept your agreement</a></p>
                   <hr/><pre style="white-space:pre-wrap;font-family:inherit;font-size:14px">${esc(rendered)}</pre>`,
          }),
        });
        results.email = res.ok ? "sent" : `failed (${res.status})`;
      }
    } else if (contact) {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_FROM_NUMBER;
      if (sid && authToken && fromNumber) {
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: contact,
            From: fromNumber,
            Body: `Hi ${customer?.name || "there"}! ${businessName} set up your ${contract.frequency} service (${contract.job_description}) at $${Number(contract.price).toFixed(2)}/visit. Review & accept: ${link}`,
          }),
        });
        results.sms = res.ok ? "sent" : `failed (${res.status})`;
      } else {
        results.sms = "not configured (Twilio keys missing)";
      }
    }

    const delivered = results.email === "sent" || results.sms === "sent";
    await supabase
      .from("recurring_contracts")
      .update({
        agreement_status: "Sent",
        agreement_sent_at: new Date().toISOString(),
        agreement_responded_at: null,
        signed_name: null,
      })
      .eq("id", contractId);

    return NextResponse.json({ ok: true, delivered, results });
  } catch (err) {
    console.error("send-agreement error", err);
    return NextResponse.json({ error: "Something went wrong sending the agreement." }, { status: 500 });
  }
}
