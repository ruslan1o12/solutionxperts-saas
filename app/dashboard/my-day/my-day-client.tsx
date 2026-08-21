"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DoorEvent = { delta: 1 | -1; note: string; time: string };

type WorkDay = {
  id: string;
  work_date: string;
  started_at: string | null;
  ended_at: string | null;
  doors_knocked: number | null;
  notes: string | null;
  is_driver: boolean | null;
  door_events: DoorEvent[] | null;
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
  const [events, setEvents] = useState<DoorEvent[]>([]);
  const [pendingDelta, setPendingDelta] = useState<1 | -1 | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [notes, setNotes] = useState("");
  const [isDriver, setIsDriver] = useState(false);
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
    setEvents((todayRow?.door_events as DoorEvent[]) ?? []);
    setNotes(todayRow?.notes ?? "");
    setIsDriver(todayRow?.is_driver ?? false);
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

  async function saveDoorEvent() {
    if (pendingDelta === null) return;
    setWorking(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const newEvent: DoorEvent = {
      delta: pendingDelta,
      note: noteInput.trim(),
      time: new Date().toISOString(),
    };
    const nextEvents = [...events, newEvent];
    const doorsKnocked = nextEvents.reduce((s, e) => s + e.delta, 0);

    await supabase.from("work_days").upsert(
      {
        user_id: user?.id,
        work_date: todayStr(),
        door_events: nextEvents,
        doors_knocked: doorsKnocked,
      },
      { onConflict: "user_id,work_date" }
    );

    setEvents(nextEvents);
    setPendingDelta(null);
    setNoteInput("");
    setWorking(false);
  }

  async function saveNotesAndDriver() {
    setWorking(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("work_days").upsert(
      {
        user_id: user?.id,
        work_date: todayStr(),
        notes: notes.trim() || null,
        is_driver: isDriver,
      },
      { onConflict: "user_id,work_date" }
    );
    setWorking(false);
    load();
  }

  if (loading) return <p className="text-sm text-neutral-400 text-center py-10">Loading...</p>;

  const doorCount = events.reduce((s, e) => s + e.delta, 0);

  return (
    <div>
      <div className="text-xl font-extrabold mb-1">My day</div>
      <p className="text-sm text-neutral-500 mb-4">
        Log when you head out and what happens door to door — helps the team see who&apos;s active
        and where the day went.
      </p>

      <div className="bg-white border border-line rounded-2xl p-4 mb-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <span
            className={`w-9 h-5 rounded-full relative transition-colors ${isDriver ? "bg-signal" : "bg-neutral-300"}`}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: isDriver ? 18 : 2 }}
            />
          </span>
          <input
            type="checkbox"
            checked={isDriver}
            onChange={(e) => {
              setIsDriver(e.target.checked);
              setTimeout(saveNotesAndDriver, 0);
            }}
            className="hidden"
          />
          <span className="text-sm font-bold">I&apos;m driving today</span>
        </label>
        <p className="text-xs text-neutral-500 mt-1.5 ml-12">
          Job assignment and completion alerts get sent to you today, alongside admins.
        </p>
      </div>

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
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            Doors knocked today
          </label>
          <div className="text-3xl font-extrabold text-signal">{doorCount}</div>
        </div>
        {autoDoorCount > 0 && (
          <p className="text-xs text-neutral-500 mb-3">
            Map shows {autoDoorCount} logged automatically from pins you dropped there — this
            counter is separate, for quick manual tallying.
          </p>
        )}

        <div className="flex gap-3 mb-3">
          <button
            onClick={() => setPendingDelta(-1)}
            className="flex-1 border-2 border-line rounded-xl py-4 text-2xl font-bold text-neutral-500"
          >
            −
          </button>
          <button
            onClick={() => setPendingDelta(1)}
            className="flex-1 bg-signal text-white rounded-xl py-4 text-2xl font-bold"
          >
            +
          </button>
        </div>

        {pendingDelta !== null && (
          <div className="border border-line rounded-xl p-3 mb-3 bg-[#F4F7F2]">
            <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
              Quick note — what happened?
            </label>
            <input
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder={pendingDelta > 0 ? "e.g. Interested, wants a callback Friday" : "e.g. Miscounted, backing one out"}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-2 bg-white"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setPendingDelta(null); setNoteInput(""); }}
                className="flex-1 border border-line font-bold rounded-lg py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveDoorEvent}
                disabled={working}
                className="flex-1 bg-signal text-white font-bold rounded-lg py-2 text-sm disabled:opacity-60"
              >
                {working ? "Logging..." : "Log it"}
              </button>
            </div>
          </div>
        )}

        {events.length > 0 && (
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
            {events.slice().reverse().map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-neutral-600 border-t border-line pt-1.5 first:border-t-0 first:pt-0">
                <span className={`font-bold ${e.delta > 0 ? "text-good" : "text-danger"}`}>
                  {e.delta > 0 ? "+1" : "−1"}
                </span>
                <span className="text-neutral-400">{fmtTime(e.time)}</span>
                {e.note && <span className="flex-1 truncate">{e.note}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-line rounded-2xl p-4 mb-4">
        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
          End-of-day notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How'd the day go?"
          className="w-full border border-line rounded-lg px-3 py-2.5 mb-3 min-h-20"
        />
        <button
          onClick={saveNotesAndDriver}
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
