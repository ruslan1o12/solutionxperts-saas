import { createAdminClient } from "@/lib/supabase/admin";
import Logo from "@/app/logo";
import { getThemeSettings } from "@/lib/getTheme";
import ResponseButtons from "./response-buttons";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAdminClient();
  const theme = await getThemeSettings();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*, customers(name)")
    .eq("public_token", token)
    .single();

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-neutral-500">This estimate link isn&apos;t valid or has expired.</p>
      </div>
    );
  }

  const { data: business } = await supabase.from("business_settings").select("*").eq("id", 1).single();
  const customerName = (quote.customers as { name: string } | null)?.name ?? "there";
  const businessName = business?.legal_name || "SolutionXperts";

  return (
    <div className="min-h-screen bg-[#F4F7F2] pb-16">
      <div className="bg-ink px-6 py-6 flex items-center gap-3">
        <Logo logoUrl={theme.logoUrl} size={36} />
        <div className="text-paper font-extrabold">{businessName}</div>
      </div>

      <div className="max-w-lg mx-auto px-6 pt-8">
        <h1 className="text-xl font-extrabold mb-1">Hi {customerName},</h1>
        <p className="text-neutral-600 mb-6">
          Here&apos;s the estimate for your job. Take a look, and let us know if it works for you.
        </p>

        {quote.description && (
          <div className="bg-white border border-line rounded-2xl p-4 mb-4">
            <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-2">
              What we&apos;ll do
            </div>
            <p className="text-sm text-neutral-700 whitespace-pre-wrap">{quote.description}</p>
          </div>
        )}

        <div className="bg-white border border-line rounded-2xl p-5 mb-6 text-center">
          <div className="text-3xl font-extrabold">${Number(quote.total).toFixed(2)}</div>
          {quote.due_date && (
            <div className="text-xs text-neutral-500 mt-1">If approved, due by {quote.due_date}</div>
          )}
        </div>

        <ResponseButtons token={token} initialStatus={quote.approval_status || "Pending"} />

        <a
          href={`/api/invoice-pdf/${quote.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-steel font-bold text-sm mt-6"
        >
          View / download the full invoice PDF
        </a>
      </div>
    </div>
  );
}
