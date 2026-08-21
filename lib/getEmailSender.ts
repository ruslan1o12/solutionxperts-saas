import { createClient } from "@/lib/supabase/server";

export async function getEmailSender() {
  const supabase = await createClient();
  const { data } = await supabase.from("email_settings").select("*").eq("id", 1).single();

  const fromEmail = data?.from_email || "onboarding@resend.dev";
  const fromName = data?.from_name || "SolutionXperts";

  return `${fromName} <${fromEmail}>`;
}
