"use client";

import { useState } from "react";

export default function AgreementButtons({
  token,
  initialStatus,
  signedName,
  defaultName,
}: {
  token: string;
  initialStatus: string;
  signedName: string | null;
  defaultName: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [name, setName] = useState(defaultName);
  const [working, setWorking] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "accept" | "decline") {
    setWorking(action);
    setError(null);
    try {
      const res = await fetch("/api/agreement-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, name }),
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
        <div className="text-good font-extrabold text-lg">Agreement accepted ✓</div>
        <p className="text-sm text-neutral-600 mt-1">
          Thanks{signedName ? `, ${signedName}` : ""}! We&apos;ll reach out ahead of each visit to confirm a date.
        </p>
      </div>
    );
  }

  if (status === "Declined") {
    return (
      <div className="bg-white border border-line rounded-2xl p-5 text-center">
        <div className="font-extrabold text-lg">No problem</div>
        <p className="text-sm text-neutral-600 mt-1">
          We&apos;ve let the team know. Reach out any time if you change your mind.
        </p>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
        Type your full name to accept
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border border-line rounded-lg px-3 py-2.5 bg-white mb-3"
        placeholder="Your full name"
      />
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
