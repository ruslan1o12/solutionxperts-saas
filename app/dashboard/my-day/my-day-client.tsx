"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type WorkDay = {
  id: string;
  work_date: string;
  started_at: string | null;
  ended_at: string | null;
  doors_knocked: number | null;
  notes: string | null;
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function fmtTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function hoursBetween(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return (ms / 3600000).toFixed(1);
}

export default function MyDayPage() {
  const supabase = createClient();
  const [today, setToday] = useState<WorkDay | null>(null);
  const [history, setHistory] = useState<WorkDay[]>([]);
  const [autoDoorCount, setAutoDoorCount] = useState(0);
  const [doorsInput, setDoorsInput] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  async function load() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return setLoading(false);

    const date = todayStr();
    const [{ data: todayRow }, { data: hist }, { count }] = await Promise.all([
      supabase.from("work_days").select("*").eq("user_id", user.id).eq("work_date", date).maybeSingle(),
      supabase
        .from("work_days")
        .select("*")
        .eq("user_id", user.id)
        .order("work_date", { ascending: false })
        .limit(7),
      supabase
        .from("door_logs")
        .select("id", { count: "exact", head: true })
        .eq("created_by", user.id)
        .gte("created_at", `${date}T00:00:00`)
        .lt("created_at", `${date}T23:59:59`),
    ]);

    setToday(todayRow ?? null);
    setHistory((hist ?? []).filter((h) => h.work_date !== date));
    setAutoDoorCount(count ?? 0);
    setDoorsInput(todayRow?.doors_knocked != null ? String(todayRow.doors_knocked) : "");
    setNotes(todayRow?.notes ?? "");
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startDay() {
    setWorking(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("work_days")
      .upsert(
        { user_id: user?.id, work_date: todayStr(), started_at: new Date().toISOString() },
        { onConflict: "user_id,work_date" }
      );
    setWorking(false);
    load();
  }

  async function endDay() {
    setWorking(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("work_days")
      .update({ ended_at: new Date().toISOString() })
      .eq("user_id", user?.id)
      .eq("work_date", todayStr());
    setWorking(false);
    load();
  }

  async function saveDetails() {
    setWorking(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("work_days").upsert(
      {
        user_id: user?.id,
        work_date: todayStr(),
        doors_knocked: doorsInput === "" ? null : Number(doorsInput),
        notes: notes.trim() || null,
      },
      { onConflict: "user_id,work_date" }
    );
    setWorking(false);
    load();
  }

  if (loading) return <p className="text-sm text-neutral-400 text-center py-10">Loading...</p>;

  return (
    <div>
      <div className="text-xl font-extrabold mb-1">My day</div>
      <p className="text-sm text-neutral-500 mb-4">
        Log when you head out and how many doors you knocked — helps the team see who&apos;s
        active and where the day went.
      </p>

      <div className="bg-white border border-line rounded-2xl p-4 mb-4">
        {!today?.started_at ? (
          <button
            onClick={startDay}
            disabled={working}
            className="w-full bg-signal text-white font-bold rounded-xl py-3 disabled:opacity-60"
          >
            {working ? "Starting..." : "Start my day"}
          </button>
        ) : !today?.ended_at ? (
          <>
            <div className="text-sm text-neutral-600 mb-3">
              Started at <b>{fmtTime(today.started_at)}</b>
            </div>
            <button
              onClick={endDay}
              disabled={working}
              className="w-full bg-ink text-paper font-bold rounded-xl py-3 disabled:opacity-60"
            >
              {working ? "Ending..." : "End my day"}
            </button>
          </>
        ) : (
          <div className="text-sm text-neutral-600">
            <b>{fmtTime(today.started_at)}</b> – <b>{fmtTime(today.ended_at)}</b> (
            {hoursBetween(today.started_at, today.ended_at)} hrs) — day complete.
          </div>
        )}
      </div>

      <div className="bg-white border border-line rounded-2xl p-4 mb-4">
        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
          Doors knocked today
        </label>
        {autoDoorCount > 0 && (
          <p className="text-xs text-neutral-500 mb-2">
            Map shows {autoDoorCount} logged automatically — add to it or override below if you
            counted differently.
          </p>
        )}
        <input
          value={doorsInput}
          onChange={(e) => setDoorsInput(e.target.value)}
          inputMode="numeric"
          placeholder="0"
          className="w-full border border-line rounded-lg px-3 py-2.5 mb-3"
        />
        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How'd the day go?"
          className="w-full border border-line rounded-lg px-3 py-2.5 mb-3 min-h-20"
        />
        <button
          onClick={saveDetails}
          disabled={working}
          className="w-full bg-signal text-white font-bold rounded-xl py-2.5 disabled:opacity-60"
        >
          {working ? "Saving..." : "Save"}
        </button>
      </div>

      {history.length > 0 && (
        <div>
          <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-2">
            Recent days
          </div>
          <div className="flex flex-col gap-2">
            {history.map((h) => (
              <div key={h.id} className="bg-white border border-line rounded-xl p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-bold">{h.work_date}</span>
                  <span className="text-neutral-500">
                    {h.started_at && h.ended_at
                      ? `${hoursBetween(h.started_at, h.ended_at)} hrs`
                      : h.started_at
                      ? "In progress"
                      : "—"}
                  </span>
                </div>
                {h.doors_knocked != null && (
                  <div className="text-xs text-neutral-500 mt-1">
                    {h.doors_knocked} doors knocked
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
