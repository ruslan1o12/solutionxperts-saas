"use client";

import { useState } from "react";
import Link from "next/link";
import MarkPaidButton from "./mark-paid-button";
import DeleteInvoiceButton from "./delete-invoice-button";
import EmailInvoiceButton from "./email-invoice-button";

type Quote = {
  id: string;
  total: number;
  status: string;
  due_date: string | null;
  created_at?: string;
  added_by_name?: string | null;
  customers: { name: string } | null;
};

type FilterKey = "all" | "outstanding" | "overdue" | "paid";

export default function InvoicesClient({
  overdue,
  unpaid,
  paid,
  outstandingTotal,
  overdueTotal,
  paidTotal,
}: {
  overdue: Quote[];
  unpaid: Quote[];
  paid: Quote[];
  outstandingTotal: number;
  overdueTotal: number;
  paidTotal: number;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const showOverdue = filter === "all" || filter === "outstanding" || filter === "overdue";
  const showUnpaid = filter === "all" || filter === "outstanding";
  const showPaid = filter === "all" || filter === "paid";

  return (
    <div>
      <div className="grid grid-cols-3 md:max-w-md gap-2 mb-6">
        <button
          onClick={() => setFilter(filter === "outstanding" ? "all" : "outstanding")}
          className={`bg-white border rounded-2xl p-3 text-center ${
            filter === "outstanding" ? "border-ink border-2" : "border-line"
          }`}
        >
          <div className="text-lg font-extrabold">${outstandingTotal.toFixed(0)}</div>
          <div className="text-[10px] font-semibold text-neutral-500 uppercase">Outstanding</div>
        </button>
        <button
          onClick={() => setFilter(filter === "overdue" ? "all" : "overdue")}
          className={`bg-white border rounded-2xl p-3 text-center ${
            filter === "overdue" ? "border-danger border-2" : "border-line"
          }`}
        >
          <div className="text-lg font-extrabold text-danger">${overdueTotal.toFixed(0)}</div>
          <div className="text-[10px] font-semibold text-neutral-500 uppercase">Overdue</div>
        </button>
        <button
          onClick={() => setFilter(filter === "paid" ? "all" : "paid")}
          className={`bg-white border rounded-2xl p-3 text-center ${
            filter === "paid" ? "border-good border-2" : "border-line"
          }`}
        >
          <div className="text-lg font-extrabold text-good">${paidTotal.toFixed(0)}</div>
          <div className="text-[10px] font-semibold text-neutral-500 uppercase">Collected</div>
        </button>
      </div>

      {filter !== "all" && (
        <button onClick={() => setFilter("all")} className="text-steel font-bold text-xs mb-3">
          Clear filter — showing all
        </button>
      )}

      {showOverdue && <InvoiceGroup title={`Overdue (${overdue.length})`} accent="text-danger" quotes={overdue} />}
      {showUnpaid && <InvoiceGroup title={`Unpaid (${unpaid.length})`} accent="text-steel" quotes={unpaid} />}
      {showPaid && <InvoiceGroup title={`Paid (${paid.length})`} accent="text-good" quotes={paid} />}

      {overdue.length === 0 && unpaid.length === 0 && paid.length === 0 && (
        <p className="text-sm text-neutral-500 text-center py-10">
          No invoices yet — create one from a customer&apos;s quote.
        </p>
      )}
    </div>
  );
}

function InvoiceGroup({ title, accent, quotes }: { title: string; accent: string; quotes: Quote[] }) {
  if (quotes.length === 0) return null;
  return (
    <div className="mb-6">
      <div className={`text-xs font-extrabold uppercase tracking-wide mb-2 ${accent}`}>{title}</div>
      <div className="flex flex-col gap-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
        {quotes.map((q) => (
          <div key={q.id} className="bg-white border border-line rounded-2xl p-4">
            <div className="flex justify-between items-start mb-1">
              <div>
                <Link href={`/dashboard/invoices/${q.id}/edit`} className="font-bold text-steel underline">
                  {q.customers?.name ?? "Customer"}
                </Link>
                <div className="text-xs text-neutral-500">
                  {q.due_date ? `Due ${q.due_date}` : "No due date"}
                </div>
                {q.added_by_name && (
                  <div className="text-[11px] text-neutral-400">
                    Added by {q.added_by_name}
                    {q.created_at ? ` · ${new Date(q.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}
                  </div>
                )}
              </div>
              <div className="text-lg font-extrabold">${Number(q.total).toFixed(2)}</div>
            </div>
            <div className="flex items-center gap-4 mt-2 mb-2">
              <a
                href={`/api/invoice-pdf/${q.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-steel"
              >
                View / Download PDF
              </a>
              <EmailInvoiceButton quoteId={q.id} />
            </div>
            {q.status !== "Paid" && (
              <div className="mt-2 flex items-center justify-between">
                <MarkPaidButton quoteId={q.id} />
                <DeleteInvoiceButton quoteId={q.id} />
              </div>
            )}
            {q.status === "Paid" && (
              <div className="mt-2 flex justify-end">
                <DeleteInvoiceButton quoteId={q.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
