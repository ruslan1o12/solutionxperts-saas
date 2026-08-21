import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import ExportInvoicesButton from "./export-invoices-button";
import InvoicesClient from "./invoices-client";

export default async function InvoicesPage() {
  const { role } = await getCurrentProfile();
  if (role === "technician") redirect("/dashboard/jobs");

  const supabase = await createClient();
  const [{ data: quotes }, { data: profiles }] = await Promise.all([
    supabase.from("quotes").select("*, customers(name)").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const nameById: Record<string, string> = {};
  (profiles ?? []).forEach((p) => (nameById[p.id] = p.full_name || "Team member"));
  const all = (quotes ?? []).map((q) => ({
    ...q,
    added_by_name: q.created_by ? nameById[q.created_by] || "Team member" : null,
  }));
  const today = new Date().toISOString().slice(0, 10);

  const paid = all.filter((q) => q.status === "Paid");
  const overdue = all.filter((q) => q.status !== "Paid" && q.due_date && q.due_date < today);
  const unpaid = all.filter((q) => q.status !== "Paid" && !(q.due_date && q.due_date < today));

  const outstandingTotal = [...overdue, ...unpaid].reduce((sum, q) => sum + Number(q.total || 0), 0);
  const overdueTotal = overdue.reduce((sum, q) => sum + Number(q.total || 0), 0);
  const paidTotal = paid.reduce((sum, q) => sum + Number(q.total || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-extrabold uppercase tracking-wide text-steel">Invoices</div>
        <ExportInvoicesButton quotes={all} />
      </div>

      <InvoicesClient
        overdue={overdue}
        unpaid={unpaid}
        paid={paid}
        outstandingTotal={outstandingTotal}
        overdueTotal={overdueTotal}
        paidTotal={paidTotal}
      />
    </div>
  );
}
