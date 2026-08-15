"use client";

import { downloadCsv } from "@/lib/csv";

type Quote = {
  total: number;
  status: string;
  due_date: string | null;
  created_at: string;
  customers: { name: string } | null;
};

export default function ExportInvoicesButton({ quotes }: { quotes: Quote[] }) {
  function exportCsv() {
    downloadCsv(
      `invoices-${new Date().toISOString().slice(0, 10)}`,
      quotes.map((q) => ({
        Customer: q.customers?.name ?? "",
        Total: q.total,
        Status: q.status,
        "Due date": q.due_date,
        Created: q.created_at?.slice(0, 10),
      }))
    );
  }

  if (quotes.length === 0) return null;
  return (
    <button onClick={exportCsv} className="text-steel font-bold text-sm">
      Export CSV
    </button>
  );
}
