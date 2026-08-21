import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import Link from "next/link";
import PayrollClient from "./payroll-client";

export default async function PayrollPage() {
  const { role } = await getCurrentProfile();
  if (role !== "admin") redirect("/dashboard");

  const supabase = await createClient();

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const rangeStart = ninetyDaysAgo.toISOString().slice(0, 10);

  const [{ data: profiles }, { data: paidQuotes }, { data: completedJobs }, { data: workDays }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, role, commission_rate, pay_type, pay_rate"),
      supabase
        .from("quotes")
        .select("id, total, sold_by, created_by, paid_at")
        .eq("status", "Paid")
        .gte("paid_at", rangeStart),
      supabase
        .from("jobs")
        .select("id, assigned_to, completed_at, quotes(total)")
        .eq("status", "Completed")
        .gte("completed_at", rangeStart),
      supabase.from("work_days").select("user_id, work_date, started_at, ended_at").gte("work_date", rangeStart),
    ]);

  return (
    <div>
      <Link href="/dashboard/settings" className="text-steel font-bold text-sm">
        ← Back to Settings
      </Link>
      <div className="text-xl font-extrabold mt-3 mb-1">Payroll & commission</div>
      <p className="text-sm text-neutral-500 mb-4">
        Set each person&apos;s rate under Team & roles. This computes what they&apos;ve earned
        based on that.
      </p>

      <PayrollClient
        profiles={profiles ?? []}
        paidQuotes={paidQuotes ?? []}
        completedJobs={completedJobs ?? []}
        workDays={workDays ?? []}
      />
    </div>
  );
}
