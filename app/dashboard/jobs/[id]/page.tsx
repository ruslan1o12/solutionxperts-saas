import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import Link from "next/link";
import JobActions from "./job-actions";
import JobPhotoGallery from "./job-photo-gallery";
import ResendNotifyButton from "./resend-notify-button";
import DeleteJobButton from "./delete-job-button";
import MapLink from "../../map-link";

const STATUS_LABEL_COLOR: Record<string, string> = {
  Scheduled: "text-steel",
  "On The Way": "text-[#8A5A17]",
  Arrived: "text-[#B45F0A]",
  "In Progress": "text-[#B45F0A]",
  Completed: "text-good",
};

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { role } = await getCurrentProfile();
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*, customers(name, contact, address), quotes(id, total, status, stripe_payment_link)")
    .eq("id", id)
    .single();

  if (!job) {
    return <p className="text-neutral-500">Job not found.</p>;
  }

  let techName: string | null = null;
  let photoGateEnabled = true;
  if (job.assigned_to) {
    const { data: tech } = await supabase
      .from("profiles")
      .select("full_name, photo_gate_enabled")
      .eq("id", job.assigned_to)
      .single();
    techName = tech?.full_name ?? null;
    photoGateEnabled = tech?.photo_gate_enabled !== false;
  }

  let createdByName: string | null = null;
  let salesmanName: string | null = null;
  if (job.created_by) {
    const { data: creator } = await supabase.from("profiles").select("full_name").eq("id", job.created_by).single();
    createdByName = creator?.full_name ?? null;
  }
  if (job.sold_by) {
    const { data: sales } = await supabase.from("profiles").select("full_name").eq("id", job.sold_by).single();
    salesmanName = sales?.full_name ?? null;
  }

  return (
    <div>
      <Link href="/dashboard/jobs" className="text-steel font-bold text-sm">
        ← Back to jobs
      </Link>

      <div className="mt-3 mb-4">
        <div className="flex items-start justify-between">
          <div className="text-xl font-extrabold">{job.customers?.name ?? "Customer"}</div>
          {(role === "admin" || role === "salesman") && (
            <div className="flex gap-2">
              <Link
                href={`/dashboard/customers/${job.customer_id}/edit`}
                className="text-steel font-bold text-xs bg-white border border-line rounded-lg px-3 py-1.5 whitespace-nowrap"
              >
                Edit customer
              </Link>
              <Link
                href={`/dashboard/jobs/${id}/edit`}
                className="text-steel font-bold text-xs bg-white border border-line rounded-lg px-3 py-1.5 whitespace-nowrap"
              >
                Edit job
              </Link>
            </div>
          )}
        </div>
        {job.customers?.address && (
          <div className="text-sm">
            <MapLink address={job.customers.address} className="text-steel underline font-semibold" />
          </div>
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
            {job.duration_minutes ? ` (${job.duration_minutes} min)` : ""}
          </div>
        )}
        <div className={`text-xs font-extrabold uppercase mt-1 ${STATUS_LABEL_COLOR[job.status] ?? ""}`}>
          {job.status}
        </div>
        {job.job_description && (
          <div className="bg-[#F4F7F2] border border-line rounded-xl p-3 mt-3 text-sm">
            <div className="text-[10px] font-extrabold uppercase tracking-wide text-steel mb-1">
              Job details
            </div>
            {job.job_description}
          </div>
        )}
        {(createdByName || salesmanName) && (
          <div className="text-[11px] text-neutral-400 mt-2">
            {salesmanName && <>Sold by {salesmanName}</>}
            {salesmanName && createdByName && salesmanName !== createdByName ? " · " : ""}
            {createdByName && (!salesmanName || salesmanName !== createdByName) && `Scheduled by ${createdByName}`}
            {job.created_at &&
              ` · ${new Date(job.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
          </div>
        )}
      </div>

      <JobActions job={job} techName={techName} photoGateEnabled={photoGateEnabled} />

      {(role === "admin" || role === "salesman") && <ResendNotifyButton jobId={id} />}

      {role === "admin" && <JobPhotoGallery jobId={id} />}

      {role === "admin" && <DeleteJobButton jobId={id} />}
    </div>
  );
}
