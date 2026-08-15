import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import Link from "next/link";
import StatusEditor from "./status-editor";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { role } = await getCurrentProfile();
  if (role === "technician") redirect("/dashboard/jobs");

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: customer }, { data: notes }, { data: quotes }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).single(),
    supabase
      .from("customer_notes")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("quotes")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!customer) {
    return <p className="text-neutral-500">Customer not found.</p>;
  }

  return (
    <div>
      <Link href="/dashboard/customers" className="text-steel font-bold text-sm">
        ← Back to customers
      </Link>

      <div className="mt-3">
        <div className="text-xl font-extrabold">{customer.name}</div>
        <div className="text-sm text-neutral-500">{customer.service_type}</div>
        {customer.contact && <div className="text-sm mt-1">{customer.contact}</div>}
        {customer.address && <div className="text-sm text-neutral-500">{customer.address}</div>}
      </div>

      <Link
        href={`/dashboard/customers/${id}/quote`}
        className="block text-center bg-ink text-paper font-bold rounded-xl py-3 mt-4"
      >
        Create quote / estimate
      </Link>

      {(quotes ?? []).length > 0 && (
        <div className="bg-white border border-line rounded-2xl p-4 mt-4">
          <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-2">
            Quote history
          </div>
          {quotes!.map((q) => (
            <div key={q.id} className="flex justify-between text-sm py-2 border-t border-line first:border-t-0 first:pt-0">
              <span>{new Date(q.created_at).toLocaleDateString()}</span>
              <span className="font-bold">${Number(q.total).toFixed(2)}</span>
              <span className="text-neutral-500">{q.status}</span>
            </div>
          ))}
        </div>
      )}

      <StatusEditor customerId={id} currentStatus={customer.status} />

      <div className="mt-4">
        <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-2">
          Notes
        </div>
        {(notes ?? []).length === 0 && (
          <p className="text-sm text-neutral-500">No notes yet.</p>
        )}
        {(notes ?? []).map((n) => (
          <div key={n.id} className="bg-white border border-line rounded-xl p-3 mb-2 text-sm">
            <div className="text-[11px] text-neutral-400 font-semibold mb-1">
              {new Date(n.created_at).toLocaleDateString()}
            </div>
            {n.note}
          </div>
        ))}
      </div>
    </div>
  );
}
