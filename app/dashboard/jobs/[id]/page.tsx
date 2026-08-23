import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/getProfile";
import Link from "next/link";
import JobActions from "./job-actions";
import JobPhotoGallery from "./job-photo-gallery";
import ResendNotifyButton from "./resend-notify-button";
import DeleteJobButton from "./delete-job-button";
import PrivateNotes from "./private-notes";
import ReviewRequestButton from "./review-request-button";
import MapLink from "../../map-link";

const STATUS_COLOR: Record<string, string> = {
  Scheduled: "bg-[#E7EEF5] text-steel",
  "On The Way": "bg-[#FFF1DF] text-[#8A5A17]",
  Arrived: "bg-[#FFE9CC] text-[#B45F0A]",
  "In Progress": "bg-[#FFE9CC] text-[#B45F0A]",
  Completed: "bg-[#E4F1E5] text-good",
};

type LineItem = { desc: string; qty: string; price: string };

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { role } = await getCurrentProfile();
  const isOfficeStaff = role === "admin" || role === "salesman";
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select(
      "*, customers(name, contact, address), quotes(id, total, tax_rate, line_items, status, due_date, paid_at, stripe_payment_link)"
    )
    .eq("id", id)
    .single();

  if (!job) {
    return <p className="text-neutral-500">Job not found.</p>;
  }

  let techName: string | null = null;
  let techPhone: string | null = null;
  let photoGateEnabled = true;
  if (job.assigned_to) {
    const { data: tech } = await supabase
      .from("profiles")
      .select("full_name, phone, photo_gate_enabled")
      .eq("id", job.assigned_to)
      .single();
    techName = tech?.full_name ?? null;
    techPhone = tech?.phone ?? null;
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

  const { data: business } = await supabase.from("business_settings").select("review_link").eq("id", 1).single();

  const quote = job.quotes as {
    id: string;
    total: number;
    tax_rate: number;
    line_items: LineItem[];
    status: string;
    due_date: string | null;
    paid_at: string | null;
    stripe_payment_link: string | null;
  } | null;

  const startDate = job.scheduled_at ? new Date(job.scheduled_at) : null;
  const endDate = startDate ? new Date(startDate.getTime() + (job.duration_minutes || 60) * 60000) : null;
  const dateFmt: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

  const subtotal = (quote?.line_items || []).reduce(
    (s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0),
    0
  );
  const taxAmount = subtotal * ((quote?.tax_rate || 0) / 100);
  const contact = job.customers?.contact ?? "";
  const looksLikePhone = /\d{7,}/.test(contact);

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/jobs" className="text-steel font-bold text-sm">
        ← Back to jobs
      </Link>

      {/* Quick actions */}
      <div className="flex gap-2 mt-3 mb-4">
        <QuickAction href="#photos" label="Photos" icon="camera" />
        <QuickAction href={quote ? `/api/invoice-pdf/${quote.id}` : "#"} label="Invoice" icon="invoice" disabled={!quote} external />
        <QuickAction href="#payment" label="Pay" icon="cash" />
      </div>

      {/* Status */}
      <div className={`rounded-2xl p-4 mb-3 ${STATUS_COLOR[job.status] ?? "bg-white border border-line"}`}>
        <div className="text-[10px] font-extrabold uppercase tracking-wide opacity-70">Job status</div>
        <div className="text-xl font-extrabold">{job.status}</div>
      </div>

      {/* Schedule */}
      {startDate && (
        <div className="bg-white border border-line rounded-2xl p-4 mb-3">
          <div className="flex justify-between items-center">
            <div className="text-xs font-extrabold uppercase tracking-wide text-steel">Schedule</div>
            {isOfficeStaff && (
              <Link href={`/dashboard/jobs/${id}/edit`} className="text-steel font-bold text-xs">
                Edit
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
            <div>
              <div className="text-[10px] font-bold text-neutral-500 uppercase">Start</div>
              <div className="font-semibold">
                {startDate.toLocaleDateString(undefined, dateFmt)}, {startDate.toLocaleTimeString(undefined, timeFmt)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-neutral-500 uppercase">End</div>
              <div className="font-semibold">
                {endDate!.toLocaleDateString(undefined, dateFmt)}, {endDate!.toLocaleTimeString(undefined, timeFmt)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job details / what to do */}
      {job.job_description && (
        <div className="bg-white border border-line rounded-2xl p-4 mb-3">
          <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-1.5">
            Job details — what to do
          </div>
          <p className="text-sm">{job.job_description}</p>
        </div>
      )}

      {/* Line items */}
      {quote && (
        <div className="bg-white border border-line rounded-2xl p-4 mb-3">
          <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-2">Line items</div>
          {(quote.line_items || []).map((l, i) => (
            <div key={i} className="flex justify-between text-sm py-1.5 border-t border-line first:border-t-0 first:pt-0">
              <span>
                {l.qty}x {l.desc}
              </span>
              <span className="font-semibold">${((Number(l.qty) || 0) * (Number(l.price) || 0)).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-line mt-2 pt-2 flex flex-col gap-1 text-sm">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>Tax ({quote.tax_rate || 0}%)</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-base">
              <span>Total</span>
              <span>${Number(quote.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch */}
      <div className="bg-white border border-line rounded-2xl p-4 mb-3">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs font-extrabold uppercase tracking-wide text-steel">Dispatch to</div>
          {isOfficeStaff && (
            <Link href={`/dashboard/jobs/${id}/edit`} className="text-steel font-bold text-xs">
              {techName ? "Reassign" : "+ Assign"}
            </Link>
          )}
        </div>
        {techName ? (
          <div className="flex items-center gap-2 bg-[#F4F7F2] rounded-full px-3 py-2 w-fit">
            <span className="w-2.5 h-2.5 rounded-full bg-signal" />
            <span className="font-semibold text-sm">{techName}</span>
            {techPhone && <span className="text-neutral-500 text-sm">· {techPhone}</span>}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Nobody assigned yet.</p>
        )}
        {(salesmanName || createdByName) && (
          <p className="text-[11px] text-neutral-400 mt-2">
            {salesmanName && <>Sold by {salesmanName}</>}
            {salesmanName && createdByName && salesmanName !== createdByName ? " · " : ""}
            {createdByName && (!salesmanName || salesmanName !== createdByName) && `Scheduled by ${createdByName}`}
            {job.created_at &&
              ` · ${new Date(job.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
          </p>
        )}
      </div>

      {/* Customer */}
      <div className="bg-white border border-line rounded-2xl p-4 mb-3">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs font-extrabold uppercase tracking-wide text-steel">Customer</div>
          {isOfficeStaff && (
            <Link href={`/dashboard/customers/${job.customer_id}/edit`} className="text-steel font-bold text-xs">
              Edit
            </Link>
          )}
        </div>
        <div className="font-bold">{job.customers?.name ?? "Customer"}</div>
        {job.customers?.address && (
          <div className="text-sm mt-0.5">
            <MapLink address={job.customers.address} className="text-steel underline" />
          </div>
        )}
        {job.customers?.contact && <div className="text-sm text-neutral-600 mt-0.5">{job.customers.contact}</div>}
        {job.customers?.contact && (
          <div className="flex gap-2 mt-3">
            {looksLikePhone && (
              <>
                <a href={`tel:${contact.replace(/\D/g, "")}`} className="flex-1 text-center bg-signal text-white font-bold rounded-lg py-2 text-xs">
                  Call
                </a>
                <a href={`sms:${contact.replace(/\D/g, "")}`} className="flex-1 text-center bg-white border border-line font-bold rounded-lg py-2 text-xs">
                  Text
                </a>
              </>
            )}
            {job.customers?.address && (
              <MapLink
                address={job.customers.address}
                label="Directions"
                className="flex-1 text-center bg-white border border-line font-bold rounded-lg py-2 text-xs block"
              />
            )}
          </div>
        )}
      </div>

      <div id="photos">
        <JobActions job={job} techName={techName} photoGateEnabled={photoGateEnabled} />
      </div>

      {job.status === "Completed" && (
        <div className="bg-white border border-line rounded-2xl p-4 mt-3">
          <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-2">
            Ask for a review
          </div>
          <ReviewRequestButton
            customerName={job.customers?.name ?? "there"}
            customerContact={contact}
            reviewLink={business?.review_link ?? null}
          />
        </div>
      )}

      {isOfficeStaff && (
        <div id="payment" className="bg-white border border-line rounded-2xl p-4 mt-3">
          <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-2">Private notes</div>
          <PrivateNotes jobId={id} initialNotes={job.private_notes} />
        </div>
      )}

      {isOfficeStaff && <ResendNotifyButton jobId={id} />}

      {role === "admin" && <JobPhotoGallery jobId={id} />}

      {role === "admin" && <DeleteJobButton jobId={id} />}
    </div>
  );
}

function QuickAction({
  href,
  label,
  icon,
  disabled,
  external,
}: {
  href: string;
  label: string;
  icon: "camera" | "invoice" | "cash";
  disabled?: boolean;
  external?: boolean;
}) {
  const inner = (
    <div className={`flex flex-col items-center gap-1.5 ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      <div className="w-11 h-11 rounded-full bg-white border border-line flex items-center justify-center">
        <QuickIcon name={icon} />
      </div>
      <span className="text-[11px] font-bold">{label}</span>
    </div>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex-1">
      {inner}
    </a>
  ) : (
    <Link href={href} className="flex-1">
      {inner}
    </Link>
  );
}

function QuickIcon({ name }: { name: "camera" | "invoice" | "cash" }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "#235240", strokeWidth: 2 } as const;
  if (name === "camera")
    return (
      <svg {...common}>
        <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    );
  if (name === "invoice")
    return (
      <svg {...common}>
        <path d="M6 3h9l4 4v14H6z" strokeLinejoin="round" />
        <path d="M9 10h7M9 14h7M9 18h4" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
