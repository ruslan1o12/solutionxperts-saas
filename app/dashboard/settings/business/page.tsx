import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import Link from "next/link";
import BusinessSettingsEditor from "./business-settings-editor";

export default async function BusinessSettingsPage() {
  const { role } = await getCurrentProfile();
  if (role !== "admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase.from("business_settings").select("*").eq("id", 1).single();

  return (
    <div>
      <Link href="/dashboard/team" className="text-steel font-bold text-sm">
        ← Back to Team
      </Link>
      <div className="text-xl font-extrabold mt-3 mb-1">Business info</div>
      <p className="text-sm text-neutral-500 mb-4">
        Shown on every invoice PDF, alongside your logo.
      </p>
      <BusinessSettingsEditor
        initial={{
          legal_name: data?.legal_name || "SolutionXperts Property Improvement",
          tax_number: data?.tax_number ?? null,
          business_number: data?.business_number ?? null,
          address: data?.address ?? null,
          phone: data?.phone ?? null,
          email: data?.email ?? null,
        }}
      />
    </div>
  );
}
