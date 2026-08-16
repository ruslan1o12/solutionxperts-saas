import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, phase } = (await req.json()) as {
      imageBase64: string; // data URL
      phase: "before" | "after";
    };

    if (!imageBase64) {
      return NextResponse.json({ error: "Missing image." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // If AI isn't configured, don't block field workers — auto-pass.
      return NextResponse.json({ verified: true, reason: "AI check not configured — auto-approved." });
    }

    const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    const mediaType = match ? match[1] : "image/jpeg";
    const data = match ? match[2] : imageBase64;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: `You are a quick quality gate for a field service app. A technician just took a "${phase}" photo of a job site. Your only job: reject photos that are clearly NOT usable job-site documentation — blank/black images, screenshots of a phone screen, selfies with no visible property/worksite, or obviously unrelated images (memes, random objects with no context). Be LENIENT — approve anything that plausibly shows a property, work area, or job-related scene, even if blurry or oddly framed. Respond with ONLY valid JSON, no markdown: {"verified": boolean, "reason": string (one short sentence)}`,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data } },
              { type: "text", text: "Check this photo." },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      // Fail open — don't block a tech's whole day over an API hiccup.
      return NextResponse.json({ verified: true, reason: "AI check unavailable — auto-approved." });
    }

    const result = await response.json();
    const rawText = result.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/^```json\s*|\s*```$/g, "").trim());
    } catch {
      parsed = { verified: true, reason: "Couldn't parse AI response — auto-approved." };
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("verify-photo error", err);
    // Fail open
    return NextResponse.json({ verified: true, reason: "Check failed — auto-approved." });
  }
}
