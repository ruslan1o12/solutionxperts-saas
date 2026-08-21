import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { images, prompt } = (await req.json()) as {
      images: string[]; // base64 data URLs
      prompt: string; // free-text description of the job from the salesperson
    };

    if (!images?.length) {
      return NextResponse.json({ error: "Include at least one photo." }, { status: 400 });
    }
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Describe the job in a sentence or two." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI estimates aren't set up yet — add ANTHROPIC_API_KEY in Vercel." },
        { status: 500 }
      );
    }

    // Pull the FULL rate card server-side — the AI is only ever allowed to use
    // these prices, regardless of what the salesperson typed in the prompt.
    const supabase = await createClient();
    const { data: rateCard } = await supabase.from("rate_card").select("*").order("service_name");

    if (!rateCard || rateCard.length === 0) {
      return NextResponse.json(
        { error: "No rate card set up yet — ask an admin to add one under Settings → Rate card." },
        { status: 400 }
      );
    }

    const rateCardText = rateCard
      .map(
        (s) =>
          `- ${s.service_name}: $${s.low_price}–$${s.high_price} per ${s.unit}${
            s.notes ? ` (${s.notes})` : ""
          }`
      )
      .join("\n");

    const systemPrompt = `You are helping a contractor's field salesperson turn on-site photos and a short description into a ROUGH, DRAFT price estimate. This is a starting point a human will review and adjust before it's ever sent to a customer — not a final quote.

Rules you must follow:
1. Read the salesperson's description below to figure out which services from the rate card apply — it may mention several (e.g. "window cleaning and gutters").
2. Only use the price ranges given below. Never invent prices or services outside the rate card.
3. For each service that applies, estimate a plausible quantity (sqft, hours, etc.) from what's visible in the photos, then multiply by the given per-unit range to get a low/high dollar estimate for that line item.
4. If a photo doesn't give you enough information to judge scope (e.g. can't see roof pitch, can't tell material thickness, photo too far away), say so explicitly in "caveats" instead of guessing wildly.
5. Always output a range (low/high), never a single confident number.
6. Base complexity adjustments (steep terrain, heavy staining, extensive cracking, tight access, multiple stories) on what's actually visible — name the specific visual cue you're reacting to.
7. Output ONLY valid JSON, no markdown fences, no commentary outside the JSON, matching exactly this shape:
{
  "line_items": [
    { "service_name": string, "estimated_quantity": string, "low": number, "high": number, "reasoning": string }
  ],
  "total_low": number,
  "total_high": number,
  "caveats": [string]
}

Rate card (the ONLY prices and services you're allowed to use):
${rateCardText}

Salesperson's description of the job: ${prompt.trim()}`;

    const imageBlocks = images.slice(0, 8).map((dataUrl) => {
      const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      return {
        type: "image",
        source: {
          type: "base64",
          media_type: match ? match[1] : "image/jpeg",
          data: match ? match[2] : dataUrl,
        },
      };
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              ...imageBlocks,
              {
                type: "text",
                text: "Here are the property photos. Produce the JSON estimate now.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error", errText);
      return NextResponse.json(
        { error: "The AI estimate service returned an error. Try again in a moment." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawText = data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";

    let parsed;
    try {
      const cleaned = rawText.replace(/^```json\s*|\s*```$/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response", rawText);
      return NextResponse.json(
        { error: "Couldn't read the AI's response. Try again with clearer photos." },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("AI estimate error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
