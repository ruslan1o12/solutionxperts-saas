import { createAdminClient } from "@/lib/supabase/admin";
import Logo from "@/app/logo";
import { getThemeSettings } from "@/lib/getTheme";
import { renderAgreement, frequencyLabel } from "@/lib/recurring";
import AgreementButtons from "./agreement-buttons";

export default async function PublicAgreementPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();
  const theme = await getThemeSettings();

  const { data: contract } = await supabase
    .from("recurring_contracts")
    .select("*, customers(name, address)")
    .eq("public_token", token)
    .single();

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-neutral-500">This agreement link isn&apos;t valid or has expired.</p>
      </div>
    );
  }

  const { data: business } = await supabase.from("business_settings").select("*").eq("id", 1).single();
  const cust = (Array.isArray(contract.customers) ? contract.customers[0] : contract.customers) as {
    name: string;
    address: string | null;
  } | null;
  const businessName = business?.legal_name || "SolutionXperts";

  const text = renderAgreement(contract.agreement_text, {
    business: businessName,
    customer: cust?.name || "Customer",
    address: cust?.address,
    job: contract.job_description,
    frequency: contract.frequency,
    price: contract.price,
    start_date: contract.start_date,
  });

  return (
    <div className="min-h-screen bg-[#F4F7F2] pb-16">
      <div className="bg-ink px-6 py-6 flex items-center gap-3">
        <Logo logoUrl={theme.logoUrl} size={36} />
        <div className="text-paper font-extrabold">{businessName}</div>
      </div>

      <div className="max-w-lg mx-auto px-6 pt-8">
        <h1 className="text-xl font-extrabold mb-1">Hi {cust?.name ?? "there"},</h1>
        <p className="text-neutral-600 mb-6">
          Here&apos;s your recurring service agreement. Have a read, and let us know if it works for you.
        </p>

        <div className="bg-white border border-line rounded-2xl p-4 mb-4">
          <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-2">The job</div>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{contract.job_description}</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-5 mb-4 text-center">
          <div className="text-3xl font-extrabold">${Number(contract.price).toFixed(2)}</div>
          <div className="text-xs text-neutral-500 mt-1">per visit · {frequencyLabel(contract.frequency)}</div>
        </div>

        <div className="bg-white border border-line rounded-2xl p-4 mb-6">
          <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-2">Agreement</div>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{text}</p>
        </div>

        <AgreementButtons
          token={token}
          initialStatus={contract.agreement_status}
          signedName={contract.signed_name}
          defaultName={cust?.name ?? ""}
        />
      </div>
    </div>
  );
}
