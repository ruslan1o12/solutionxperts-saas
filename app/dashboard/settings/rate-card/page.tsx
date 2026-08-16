import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import Link from "next/link";
import RateCardEditor from "./rate-card-editor";

export default async function RateCardPage() {
  const { role } = await getCurrentProfile();
  if (role !== "admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("rate_card")
    .select("*")
    .order("service_name", { ascending: true });

  return (
    <div>
      <Link href="/dashboard/settings" className="text-steel font-bold text-sm">
        ← Back to Settings
      </Link>
      <div className="text-xl font-extrabold mt-3 mb-1">Rate card</div>
      <RateCardEditor items={items ?? []} />
    </div>
  );
}
