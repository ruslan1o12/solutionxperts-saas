import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { notFound, redirect } from "next/navigation";
import ContractEditor from "./contract-editor";

export default async function RecurringDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string; notsent?: string }>;
}) {
  const { role } = await getCurrentProfile();
  if (role === "technician") redirect("/dashboard/jobs");

  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("recurring_contracts")
    .select("*, customers(id, name, contact, address)")
    .eq("id", id)
    .single();
  if (!contract) notFound();

  const customer = (Array.isArray(contract.customers) ? contract.customers[0] : contract.customers) as {
    id: string;
    name: string;
    contact: string | null;
    address: string | null;
  } | null;

  return (
    <ContractEditor
      contract={{
        id: contract.id,
        job_description: contract.job_description ?? "",
        frequency: contract.frequency,
        price: String(contract.price ?? ""),
        start_date: contract.start_date ?? "",
        next_service_date: contract.next_service_date ?? "",
        agreement_text: contract.agreement_text ?? "",
        status: contract.status,
        agreement_status: contract.agreement_status,
        agreement_sent_at: contract.agreement_sent_at,
        signed_name: contract.signed_name,
        public_token: contract.public_token,
        last_service_date: contract.last_service_date,
      }}
      customer={customer}
      banner={sp.sent ? { ok: true, text: `Agreement sent by ${sp.sent}.` } : sp.notsent ? { ok: false, text: decodeURIComponent(sp.notsent) } : null}
    />
  );
}
