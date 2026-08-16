"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Job = {
  id: string;
  status: string;
  scheduled_at: string | null;
  customers: { name: string } | null;
  quotes: { total: number } | null;
};

const START_HOUR = 7;
const END_HOUR = 19;
const HOUR_HEIGHT = 64; // px

const STATUS_COLOR: Record<string, string> = {
  Scheduled: "#2B4C6F",
  "On The Way": "#B45F0A",
  Arrived: "#8A5A17",
  "In Progress": "#B45F0A",
  Completed: "#2F8F4E",
  Cancelled: "#9C9994",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export default function ScheduleView() {
  const supabase = createClient();
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const dayStart = startOfDay(date);
    const dayEnd = addDays(dayStart, 1);

    supabase
      .from("jobs")
      .select("id, status, scheduled_at, customers(name), quotes(total)")
      .gte("scheduled_at", dayStart.toISOString())
      .lt("scheduled_at", dayEnd.toISOString())
      .order("scheduled_at", { ascending: true })
      .then(({ data }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setJobs((data as any) ?? []);
        setLoading(false);
      });
  }, [date]);

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const today = new Date();

  function topFor(job: Job) {
    if (!job.scheduled_at) return 0;
    const d = new Date(job.scheduled_at);
    const minutesFromStart = (d.getHours() - START_HOUR) * 60 + d.getMinutes();
    return Math.max(0, (minutesFromStart / 60) * HOUR_HEIGHT);
  }

  return (
    <div className="-mx-4 -mt-4">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-line">
        <button onClick={() => setDate(addDays(date, -1))} className="p-2 text-steel font-bold">
          ‹
        </button>
        <div className="text-center">
          <div className="font-extrabold text-sm">
            {date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </div>
          {!isSameDay(date, today) && (
            <button
              onClick={() => setDate(startOfDay(today))}
              className="text-[11px] text-signal font-bold"
            >
              Jump to today
            </button>
          )}
        </div>
        <button onClick={() => setDate(addDays(date, 1))} className="p-2 text-steel font-bold">
          ›
        </button>
      </div>

      <div className="flex justify-end px-4 py-2 bg-white border-b border-line">
        <Link href="/dashboard/jobs/new" className="text-signal font-bold text-sm">
          + Schedule job
        </Link>
      </div>

      {loading ? (
        <p className="text-center text-sm text-neutral-400 py-10">Loading...</p>
      ) : (
        <div className="relative px-4 py-2" style={{ height: hours.length * HOUR_HEIGHT }}>
          {hours.map((h, i) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-line flex"
              style={{ top: i * HOUR_HEIGHT }}
            >
              <span className="text-[10px] text-neutral-400 font-semibold -mt-2 bg-[var(--background)] pr-1">
                {h % 12 === 0 ? 12 : h % 12}
                {h < 12 ? "am" : "pm"}
              </span>
            </div>
          ))}

          <div className="ml-10 relative" style={{ height: hours.length * HOUR_HEIGHT }}>
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/dashboard/jobs/${job.id}`}
                className="absolute left-0 right-2 bg-white rounded-lg shadow-sm border-l-4 px-3 py-2"
                style={{
                  top: topFor(job),
                  borderLeftColor: STATUS_COLOR[job.status] ?? STATUS_COLOR.Scheduled,
                  minHeight: 52,
                }}
              >
                <div className="font-bold text-sm truncate">{job.customers?.name ?? "Customer"}</div>
                <div className="text-[11px] text-neutral-500">
                  {job.scheduled_at &&
                    new Date(job.scheduled_at).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                  · {job.status}
                  {job.quotes && ` · $${Number(job.quotes.total).toFixed(0)}`}
                </div>
              </Link>
            ))}
          </div>

          {jobs.length === 0 && (
            <p className="text-center text-sm text-neutral-400 pt-16 ml-10">
              Nothing scheduled this day.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
