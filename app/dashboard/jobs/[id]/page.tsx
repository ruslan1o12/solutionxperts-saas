import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import Link from "next/link";
import JobActions from "./job-actions";
import JobPhotoGallery from "./job-photo-gallery";
import ResendNotifyButton from "./resend-notify-button";
import DeleteJobButton from "./delete-job-button";

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
        <div className={`text-xs font-extrabold uppercase mt-1 ${STATUS_LABEL_COLOR[job.status] ?? ""}`}>
          {job.status}
        </div>
      </div>

      <JobActions job={job} techName={techName} photoGateEnabled={photoGateEnabled} />

      {(role === "admin" || role === "salesman") && <ResendNotifyButton jobId={id} />}

      {role === "admin" && <JobPhotoGallery jobId={id} />}

      {role === "admin" && <DeleteJobButton jobId={id} />}
    </div>
  );
}
