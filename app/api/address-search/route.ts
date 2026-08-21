import { NextRequest, NextResponse } from "next/server";

type Result = { label: string; lat: number; lng: number };

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  if (query.trim().length < 3) return NextResponse.json({ results: [] });

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;

  if (googleKey) {
    try {
      const results = await searchGoogle(query, googleKey);
      return NextResponse.json({ results, provider: "google" });
    } catch (err) {
      console.error("Google Places search failed, falling back to Nominatim", err);
      // fall through to Nominatim below
    }
  }

  const results = await searchNominatim(query);
  return NextResponse.json({ results, provider: "nominatim" });
}

async function searchGoogle(query: string, apiKey: string): Promise<Result[]> {
  // Autocomplete (New) API — returns place predictions, biased to Canada.
  const autocompleteRes = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        input: query,
        includedRegionCodes: ["ca"],
      }),
    }
  );
  if (!autocompleteRes.ok) throw new Error(`Google autocomplete failed: ${autocompleteRes.status}`);
  const autocompleteData = await autocompleteRes.json();

  const predictions = (autocompleteData.suggestions || [])
    .map((s: { placePrediction?: { placeId: string; text: { text: string } } }) => s.placePrediction)
    .filter(Boolean)
    .slice(0, 6);

  // Resolve each prediction to lat/lng via Place Details
  const results = await Promise.all(
    predictions.map(async (p: { placeId: string; text: { text: string } }) => {
      const detailsRes = await fetch(
        `https://places.googleapis.com/v1/places/${p.placeId}?fields=location`,
        { headers: { "X-Goog-Api-Key": apiKey } }
      );
      if (!detailsRes.ok) return null;
      const details = await detailsRes.json();
      if (!details.location) return null;
      return {
        label: p.text.text,
        lat: details.location.latitude,
        lng: details.location.longitude,
      };
    })
  );

  return results.filter(Boolean) as Result[];
}

async function searchNominatim(query: string): Promise<Result[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=6&countrycodes=ca&viewbox=-81.45,43.10,-80.95,42.85&bounded=0&q=${encodeURIComponent(
      query
    )}`
  );
  const data = await res.json();
  return (data as { display_name: string; lat: string; lon: string }[]).map((d) => ({
    label: d.display_name,
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
  }));
}
