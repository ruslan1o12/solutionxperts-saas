"use client";

import { useState } from "react";

export default function EmailInvoiceButton({ quoteId }: { quoteId: string }) {
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function send() {
    setWorking(true);
    setStatus(null);
    try {
      const res = await fetch("/api/email-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      const data = await res.json();
      setStatus(res.ok ? "Sent ✓" : data.error || "Failed to send.");
    } catch {
      setStatus("Failed to send.");
    }
    setWorking(false);
  }

  return (
    <div>
      <button onClick={send} disabled={working} className="text-xs font-bold text-steel">
        {working ? "Sending..." : "Email PDF"}
      </button>
      {status && <p className="text-[10px] text-neutral-500 mt-0.5">{status}</p>}
    </div>
  );
}
