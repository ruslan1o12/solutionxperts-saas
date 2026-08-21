"use client";

import { useState } from "react";

export default function ResponseButtons({
  token,
  initialStatus,
}: {
  token: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [working, setWorking] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "accept" | "decline") {
    setWorking(action);
    setError(null);
    try {
      const res = await fetch("/api/invoice-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong — try again.");
        setWorking(null);
        return;
      }
      setStatus(action === "accept" ? "Accepted" : "Declined");
    } catch {
      setError("Something went wrong — try again.");
    }
    setWorking(null);
  }

  if (status === "Accepted") {
    return (
      <div className="bg-[#E4F1E5] border border-good rounded-2xl p-5 text-center">
        <div className="text-good font-extrabold text-lg">You&apos;re all set ✓</div>
        <p className="text-sm text-neutral-600 mt-1">
          Thanks! We&apos;ve let the team know you approved this — we&apos;ll be in touch to schedule.
        </p>
      </div>
    );
  }

  if (status === "Declined") {
    return (
      <div className="bg-white border border-line rounded-2xl p-5 text-center">
        <div className="font-extrabold text-lg">No problem</div>
        <p className="text-sm text-neutral-600 mt-1">
          We&apos;ve let the team know. Reach out any time if you change your mind or want to talk
          through the details.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-3">
        <button
          onClick={() => respond("accept")}
          disabled={!!working}
          className="flex-1 bg-signal text-white font-bold rounded-xl py-3.5 disabled:opacity-60"
        >
          {working === "accept" ? "..." : "Accept"}
        </button>
        <button
          onClick={() => respond("decline")}
          disabled={!!working}
          className="flex-1 bg-white border-2 border-line font-bold rounded-xl py-3.5 disabled:opacity-60"
        >
          {working === "decline" ? "..." : "Decline"}
        </button>
      </div>
      {error && <p className="text-danger text-sm text-center mt-2">{error}</p>}
    </div>
  );
}
