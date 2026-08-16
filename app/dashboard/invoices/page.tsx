import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import MarkPaidButton from "./mark-paid-button";
import DeleteInvoiceButton from "./delete-invoice-button";
import ExportInvoicesButton from "./export-invoices-button";
import EmailInvoiceButton from "./email-invoice-button";

export default async function InvoicesPage() {
  const { role } = await getCurrentProfile();
  if (role === "technician") redirect("/dashboard/jobs");

  const supabase = await createClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("*, customers(name)")
    .order("created_at", { ascending: false });

  const all = quotes ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const paid = all.filter((q) => q.status === "Paid");
  const overdue = all.filter(
    (q) => q.status !== "Paid" && q.due_date && q.due_date < today
  );
  const unpaid = all.filter(
    (q) => q.status !== "Paid" && !(q.due_date && q.due_date < today)
  );

  const outstandingTotal = [...overdue, ...unpaid].reduce(
    (sum, q) => sum + Number(q.total || 0),
    0
  );
  const overdueTotal = overdue.reduce((sum, q) => sum + Number(q.total || 0), 0);
  const paidTotal = paid.reduce((sum, q) => sum + Number(q.total || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-extrabold uppercase tracking-wide text-steel">
          Invoices
        </div>
        <ExportInvoicesButton quotes={all} />
      </div>

      <div className="grid grid-cols-3 md:grid-cols-3 md:max-w-md gap-2 mb-6">
        <div className="bg-white border border-line rounded-2xl p-3 text-center">
          <div className="text-lg font-extrabold">${outstandingTotal.toFixed(0)}</div>
          <div className="text-[10px] font-semibold text-neutral-500 uppercase">Outstanding</div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-3 text-center">
          <div className="text-lg font-extrabold text-danger">${overdueTotal.toFixed(0)}</div>
          <div className="text-[10px] font-semibold text-neutral-500 uppercase">Overdue</div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-3 text-center">
          <div className="text-lg font-extrabold text-good">${paidTotal.toFixed(0)}</div>
          <div className="text-[10px] font-semibold text-neutral-500 uppercase">Collected</div>
        </div>
      </div>

      <InvoiceGroup title={`Overdue (${overdue.length})`} accent="text-danger" quotes={overdue} />
      <InvoiceGroup title={`Unpaid (${unpaid.length})`} accent="text-steel" quotes={unpaid} />
      <InvoiceGroup title={`Paid (${paid.length})`} accent="text-good" quotes={paid} />

      {all.length === 0 && (
        <p className="text-sm text-neutral-500 text-center py-10">
          No invoices yet — create one from a customer&apos;s quote.
        </p>
      )}
    </div>
  );
}

function InvoiceGroup({
  title,
  accent,
  quotes,
}: {
  title: string;
  accent: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quotes: any[];
}) {
  if (quotes.length === 0) return null;
  return (
    <div className="mb-6">
      <div className={`text-xs font-extrabold uppercase tracking-wide mb-2 ${accent}`}>
        {title}
      </div>
      <div className="flex flex-col gap-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
        {quotes.map((q) => (
          <div key={q.id} className="bg-white border border-line rounded-2xl p-4">
            <div className="flex justify-between items-start mb-1">
              <div>
                <div className="font-bold">{q.customers?.name ?? "Customer"}</div>
                <div className="text-xs text-neutral-500">
                  {q.due_date ? `Due ${q.due_date}` : "No due date"}
                </div>
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
