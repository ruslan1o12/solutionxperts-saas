import { NextRequest, NextResponse } from "next/server";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";

export async function POST(req: NextRequest) {
  try {
    const { quoteId } = await req.json();
    if (!quoteId) {
      return NextResponse.json({ error: "Missing quoteId." }, { status: 400 });
    }

    const { bytes, filename, quote, customer, business } = await generateInvoicePdf(quoteId);

    const contact = customer?.contact || "";
    const isEmail = contact.includes("@");
    if (!isEmail) {
      return NextResponse.json(
        { error: "This customer doesn't have an email on file — only a phone number." },
        { status: 400 }
      );
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json(
        { error: "Email isn't set up yet — add RESEND_API_KEY in Vercel." },
        { status: 500 }
      );
    }

    const businessName = business?.legal_name || "SolutionXperts";
    const base64Pdf = Buffer.from(bytes).toString("base64");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM_EMAIL || "SolutionXperts <onboarding@resend.dev>",
        to: contact,
        subject: `Invoice from ${businessName} — $${Number(quote.total).toFixed(2)}`,
        html: `<p>Hi ${customer?.name || "there"},</p>
               <p>Please find your invoice attached from <b>${businessName}</b>.</p>
               <p>Total due: <b>$${Number(quote.total).toFixed(2)}</b>${quote.due_date ? ` by ${quote.due_date}` : ""}</p>
               ${quote.stripe_payment_link ? `<p><a href="${quote.stripe_payment_link}">Pay online</a></p>` : ""}
               <p>Thank you for your business.</p>`,
        attachments: [
          {
            filename,
            content: base64Pdf,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend email-invoice error", errText);
      return NextResponse.json({ error: "Failed to send the email." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("email-invoice error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
