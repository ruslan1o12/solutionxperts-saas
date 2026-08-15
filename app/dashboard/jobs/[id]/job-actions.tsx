"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Job = {
  id: string;
  status: string;
  customers: { name: string; contact: string; address: string } | null;
  quotes: { id: string; total: number; status: string; stripe_payment_link: string | null } | null;
};

const NEXT_STATUS: Record<string, string> = {
  Scheduled: "On The Way",
  "On The Way": "Arrived",
  Arrived: "Completed",
};

const STATUS_LABEL: Record<string, string> = {
  Scheduled: "I'm on my way",
  "On The Way": "I've arrived",
  Arrived: "Mark job complete",
};

export default function JobActions({ job }: { job: Job }) {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState(job.status);
  const [working, setWorking] = useState(false);

  const contact = job.customers?.contact ?? "";
  const looksLikePhone = /\d{7,}/.test(contact);
  const customerName = job.customers?.name ?? "there";

  const smsText: Record<string, string> = {
    "On The Way": `Hi ${customerName}, this is SolutionXperts — your technician is on the way now.`,
    Arrived: `Hi ${customerName}, your SolutionXperts technician has arrived.`,
  };

  async function advance() {
    const next = NEXT_STATUS[status];
    if (!next) return;
    setWorking(true);
    await supabase.from("jobs").update({ status: next }).eq("id", job.id);
    setStatus(next);
    setWorking(false);
    router.refresh();
  }

  async function markInvoicePaid() {
    if (!job.quotes) return;
    setWorking(true);
    await supabase
      .from("quotes")
      .update({ status: "Paid", paid_at: new Date().toISOString() })
      .eq("id", job.quotes.id);
    setWorking(false);
    router.refresh();
  }

  const nextLabel = STATUS_LABEL[status];
  const smsBody = smsText[NEXT_STATUS[status]];

  return (
    <div>
      {nextLabel && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={advance}
            disabled={working}
            className="flex-1 bg-signal text-white font-bold rounded-xl py-3 disabled:opacity-60"
          >
            {working ? "Updating..." : nextLabel}
          </button>
          {smsBody && looksLikePhone && (
            <a
              href={`sms:${contact.replace(/\D/g, "")}?&body=${encodeURIComponent(smsBody)}`}
              className="flex-1 text-center bg-white border border-line font-bold rounded-xl py-3"
            >
              Text customer
            </a>
          )}
        </div>
      )}

      {status === "Completed" && (
        <div className="bg-white border border-line rounded-2xl p-4 mt-2">
          <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-2">
            Collect payment
          </div>
          {job.quotes ? (
            <>
              <div className="text-2xl font-extrabold mb-2">
                ${Number(job.quotes.total).toFixed(2)}
              </div>
              {job.quotes.status === "Paid" ? (
                <div className="text-good font-bold text-sm">✓ Paid</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {job.quotes.stripe_payment_link && (
                    <a
                      href={job.quotes.stripe_payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-center bg-ink text-paper font-bold rounded-xl py-3"
                    >
                      Open payment link
                    </a>
                  )}
                  <button
                    onClick={markInvoicePaid}
                    disabled={working}
                    className="bg-good text-white font-bold rounded-xl py-3 disabled:opacity-60"
                  >
                    Mark paid (cash / e-transfer)
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-neutral-500">
              No invoice linked to this job — create a quote from the customer&apos;s profile
              first.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
