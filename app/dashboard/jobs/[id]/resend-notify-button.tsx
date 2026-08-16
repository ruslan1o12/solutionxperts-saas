"use client";

import { useState } from "react";

export default function ResendNotifyButton({ jobId }: { jobId: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function resend() {
    setWorking(true);
    setStatus(null);
    try {
      const res = await fetch("/api/notify-job-assigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Failed to send.");
      } else {
        setStatus(`Email: ${data.results.email} · Text: ${data.results.sms}`);
      }
    } catch {
      setStatus("Failed to send.");
    }
    setWorking(false);
  }

  return (
    <div className="mt-3">
      <button onClick={resend} disabled={working} className="text-steel font-bold text-xs">
        {working ? "Sending..." : "Resend assignment notification"}
      </button>
      {status && <p className="text-xs text-neutral-500 mt-1">{status}</p>}
    </div>
  );
}
