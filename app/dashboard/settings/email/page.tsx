import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import Link from "next/link";
import EmailSettingsEditor from "./email-settings-editor";

export default async function EmailSettingsPage() {
  const { role } = await getCurrentProfile();
  if (role !== "admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase.from("email_settings").select("*").eq("id", 1).single();

  return (
    <div>
      <Link href="/dashboard/settings" className="text-steel font-bold text-sm">
        ← Back to Settings
      </Link>
      <div className="text-xl font-extrabold mt-3 mb-1">Email</div>
      <p className="text-sm text-neutral-500 mb-4">
        Controls what address invoices, job assignments, and estimate emails are sent from.
      </p>
      <EmailSettingsEditor
        initial={{
          fromEmail: data?.from_email || "onboarding@resend.dev",
          fromName: data?.from_name || "SolutionXperts",
        }}
      />
    </div>
  );
}
