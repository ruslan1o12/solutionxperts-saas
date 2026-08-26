import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/sendPush";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    console.error("Stripe webhook hit but STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET is missing.");
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }

  const stripe = new Stripe(secretKey);
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature!, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const quoteId = session.metadata?.quote_id;

    if (quoteId) {
      const admin = createAdminClient();
      const { data: quote } = await admin
        .from("quotes")
        .select("id, total, status, salesman_id, created_by, customers(name)")
        .eq("id", quoteId)
        .single();

      if (quote && quote.status !== "Paid") {
        await admin
          .from("quotes")
          .update({ status: "Paid", paid_at: new Date().toISOString() })
          .eq("id", quoteId);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const customerName = (quote.customers as any)?.name ?? "A customer";
        const recipientIds = new Set<string>();
        if (quote.salesman_id) recipientIds.add(quote.salesman_id);
        else if (quote.created_by) recipientIds.add(quote.created_by);
        const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
        (admins ?? []).forEach((a) => recipientIds.add(a.id));

        const title = `Payment received — ${customerName}`;
        const message = `$${Number(quote.total).toFixed(2)} paid online via Stripe.`;

        if (recipientIds.size > 0) {
          await admin.from("notifications").insert(
            Array.from(recipientIds).map((id) => ({ recipient_id: id, title, message }))
          );
          await sendPushToUsers(Array.from(recipientIds), {
            title,
            body: message,
            url: "/dashboard/invoices",
          });
        }
      }
    } else {
      console.warn("Stripe checkout.session.completed had no quote_id metadata — can't match it to an invoice.");
    }
  }

  return NextResponse.json({ received: true });
}
