"use client";

import { useState } from "react";

export default function ReviewRequestButton({
  customerName,
  customerContact,
  reviewLink,
}: {
  customerName: string;
  customerContact: string;
  reviewLink: string | null;
}) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const looksLikeEmail = customerContact.includes("@");
  const looksLikePhone = /\d{7,}/.test(customerContact);
  const body = `Hi ${customerName}! So glad we could help. If you have a minute, a quick review would mean a lot to us: ${reviewLink}`;

  async function markSent() {
    setSending(true);
    setSent(true);
    setSending(false);
  }

  if (!reviewLink) {
    return (
      <p className="text-xs text-neutral-500">
        Add a Google review link in Settings → Business info to enable review requests.
      </p>
    );
  }

  if (sent) {
    return <p className="text-good text-sm font-bold">Review request sent ✓</p>;
  }

  return (
    <div className="flex gap-2">
      {looksLikePhone && (
        <a
          href={`sms:${customerContact.replace(/\D/g, "")}?&body=${encodeURIComponent(body)}`}
          onClick={markSent}
          className="flex-1 text-center bg-signal text-white font-bold rounded-xl py-3"
        >
          {sending ? "..." : "Text review request"}
        </a>
      )}
      {looksLikeEmail && (
        <a
          href={`mailto:${customerContact}?subject=${encodeURIComponent("How did we do?")}&body=${encodeURIComponent(body)}`}
          onClick={markSent}
          className="flex-1 text-center bg-white border border-line font-bold rounded-xl py-3"
        >
          Email review request
        </a>
      )}
      {!looksLikePhone && !looksLikeEmail && (
        <p className="text-xs text-neutral-500">No phone or email on file for this customer.</p>
      )}
    </div>
  );
}
