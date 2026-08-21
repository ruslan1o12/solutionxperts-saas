import { NextRequest, NextResponse } from "next/server";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";
import { getEmailSender } from "@/lib/getEmailSender";

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
        from: await getEmailSender(),
        to: contact,
        subject: `Your invoice from ${businessName} — $${Number(quote.total).toFixed(2)}`,
        html: `<p>Hi ${customer?.name || "there"}!</p>
               <p>Here's your invoice from ${businessName} — thanks again for choosing us.</p>
               <p>Total: <b>$${Number(quote.total).toFixed(2)}</b>${quote.due_date ? ` (due by ${quote.due_date})` : ""}</p>
               ${quote.stripe_payment_link ? `<p><a href="${quote.stripe_payment_link}">Pay online here</a></p>` : ""}
               <p>Let us know if you have any questions — happy to help!</p>`,
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
