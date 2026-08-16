"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notifyOfficeStaff } from "@/lib/notify";
import JobPhotoUploader from "./job-photo-uploader";

type Job = {
  id: string;
  status: string;
  assigned_to: string | null;
  customers: { name: string; contact: string; address: string } | null;
  quotes: { id: string; total: number; status: string; stripe_payment_link: string | null } | null;
};

export default function JobActions({
  job,
  techName,
  photoGateEnabled = true,
}: {
  job: Job;
  techName?: string | null;
  photoGateEnabled?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState(job.status);
  const [working, setWorking] = useState(false);
  const [beforeVerified, setBeforeVerified] = useState(0);
  const [afterVerified, setAfterVerified] = useState(0);
  const [readySent, setReadySent] = useState(false);

  const contact = job.customers?.contact ?? "";
  const looksLikePhone = /\d{7,}/.test(contact);
  const customerName = job.customers?.name ?? "there";

  async function goOnTheWay() {
    setWorking(true);
    await supabase.from("jobs").update({ status: "On The Way" }).eq("id", job.id);
    setStatus("On The Way");
    setWorking(false);
    router.refresh();
  }

  async function goArrived() {
    setWorking(true);
    await supabase.from("jobs").update({ status: "Arrived" }).eq("id", job.id);
    setStatus("Arrived");
    setWorking(false);
    router.refresh();
  }

  async function startJob() {
    setWorking(true);
    await supabase.from("jobs").update({ status: "In Progress" }).eq("id", job.id);
    setStatus("In Progress");
    setWorking(false);
    router.refresh();
  }

  async function markComplete() {
    setWorking(true);
    await supabase.from("jobs").update({ status: "Completed" }).eq("id", job.id);
    setStatus("Completed");
    await notifyOfficeStaff(supabase, {
      title: "Job completed",
      message: `${techName || "A technician"} finished the job for ${customerName}.`,
      jobId: job.id,
    });
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

  async function sendReady() {
    setWorking(true);
    await notifyOfficeStaff(supabase, {
      title: "Technician ready for next job",
      message: `${techName || "A technician"} just finished with ${customerName} and is ready to be picked up for their next job.`,
      jobId: job.id,
    });
    setReadySent(true);
    setWorking(false);
  }

  const smsText: Record<string, string> = {
    "On The Way": `Hi ${customerName}, this is SolutionXperts — your technician is on the way now.`,
    Arrived: `Hi ${customerName}, your SolutionXperts technician has arrived.`,
  };

  return (
    <div className="flex flex-col gap-3">
      {status === "Scheduled" && (
        <button
          onClick={goOnTheWay}
          disabled={working}
          className="w-full bg-signal text-white font-bold rounded-xl py-3 disabled:opacity-60"
        >
          {working ? "Updating..." : "I'm on my way"}
        </button>
      )}

      {status === "On The Way" && (
        <div className="flex gap-2">
          <button
            onClick={goArrived}
            disabled={working}
            className="flex-1 bg-signal text-white font-bold rounded-xl py-3 disabled:opacity-60"
          >
            {working ? "Updating..." : "I've arrived"}
          </button>
          {looksLikePhone && (
            <a
              href={`sms:${contact.replace(/\D/g, "")}?&body=${encodeURIComponent(smsText["On The Way"])}`}
              className="flex-1 text-center bg-white border border-line font-bold rounded-xl py-3"
            >
              Text customer
            </a>
          )}
        </div>
      )}

      {status === "Arrived" && (
        <>
          {photoGateEnabled && (
            <JobPhotoUploader jobId={job.id} phase="before" onVerifiedCountChange={setBeforeVerified} />
          )}
          {looksLikePhone && (
            <a
              href={`sms:${contact.replace(/\D/g, "")}?&body=${encodeURIComponent(smsText.Arrived)}`}
              className="text-center bg-white border border-line font-bold rounded-xl py-3"
            >
              Text customer
            </a>
          )}
          <button
            onClick={startJob}
            disabled={working || (photoGateEnabled && beforeVerified === 0)}
            className="w-full bg-signal text-white font-bold rounded-xl py-3 disabled:opacity-40"
          >
            {photoGateEnabled && beforeVerified === 0
              ? "Take a before photo to start"
              : working
              ? "Starting..."
              : "Start job"}
          </button>
        </>
      )}

      {status === "In Progress" && (
        <>
          {photoGateEnabled && (
            <JobPhotoUploader jobId={job.id} phase="after" onVerifiedCountChange={setAfterVerified} />
          )}
          <button
            onClick={markComplete}
            disabled={working || (photoGateEnabled && afterVerified === 0)}
            className="w-full bg-ink text-paper font-bold rounded-xl py-3 disabled:opacity-40"
          >
            {photoGateEnabled && afterVerified === 0
              ? "Take an after photo to finish"
              : working
              ? "Finishing..."
              : "Mark job complete"}
          </button>
        </>
      )}

      {status === "Completed" && (
        <>
          <div className="bg-white border border-line rounded-2xl p-4">
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
                No invoice linked to this job — create a quote from the customer&apos;s profile first.
              </p>
            )}
          </div>

          <button
            onClick={sendReady}
            disabled={working || readySent}
            className="w-full bg-signal text-white font-bold rounded-xl py-3 disabled:opacity-50"
          >
            {readySent ? "Dispatch notified ✓" : "I'm ready for my next job"}
          </button>
        </>
      )}
    </div>
  );
}
