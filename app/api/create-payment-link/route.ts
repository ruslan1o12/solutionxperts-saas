import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const { description, amountCents, customerName } = await req.json();

    if (!amountCents || amountCents < 50) {
      return NextResponse.json(
        { error: "Amount must be at least $0.50." },
        { status: 400 }
      );
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: "Stripe isn't configured yet — add STRIPE_SECRET_KEY in Vercel." },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey);

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: description || `SolutionXperts job — ${customerName ?? "customer"}`,
            },
            unit_amount: Math.round(amountCents),
          },
          quantity: 1,
        },
      ],
    });

    return NextResponse.json({ url: paymentLink.url });
  } catch (err) {
    console.error("Stripe payment link error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
