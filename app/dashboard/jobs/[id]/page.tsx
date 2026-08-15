import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import JobActions from "./job-actions";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*, customers(name, contact, address), quotes(id, total, status, stripe_payment_link)")
    .eq("id", id)
    .single();

  if (!job) {
    return <p className="text-neutral-500">Job not found.</p>;
  }

  return (
    <div>
      <Link href="/dashboard/jobs" className="text-steel font-bold text-sm">
        ← Back to jobs
      </Link>

      <div className="mt-3 mb-4">
        <div className="text-xl font-extrabold">{job.customers?.name ?? "Customer"}</div>
        {job.customers?.address && (
          <div className="text-sm text-neutral-500">{job.customers.address}</div>
        )}
        {job.customers?.contact && <div className="text-sm mt-1">{job.customers.contact}</div>}
        {job.scheduled_at && (
          <div className="text-sm text-neutral-500 mt-1">
            Scheduled:{" "}
            {new Date(job.scheduled_at).toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>

      <JobActions job={job} />
    </div>
  );
}
