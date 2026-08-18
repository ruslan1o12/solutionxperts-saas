"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type WorkDay = {
  id: string;
  user_id: string;
  work_date: string;
  started_at: string | null;
  ended_at: string | null;
  doors_knocked: number | null;
  notes: string | null;
};

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function hoursBetween(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return (ms / 3600000).toFixed(1);
}

export default function DayLogRow({ day, name }: { day: WorkDay; name: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [startedAt, setStartedAt] = useState(toLocalInput(day.started_at));
  const [endedAt, setEndedAt] = useState(toLocalInput(day.ended_at));
  const [doors, setDoors] = useState(day.doors_knocked?.toString() ?? "");
  const [notes, setNotes] = useState(day.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save(field: string, value: unknown) {
    setSaving(true);
    await supabase.from("work_days").update({ [field]: value }).eq("id", day.id);
    setSaving(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this day log entry?")) return;
    await supabase.from("work_days").delete().eq("id", day.id);
    router.refresh();
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-bold">{name}</div>
          <div className="text-xs text-neutral-500">{day.work_date}</div>
        </div>
        <div className="text-xs font-bold text-neutral-500">
          {hoursBetween(day.started_at, day.ended_at)
            ? `${hoursBetween(day.started_at, day.ended_at)} hrs`
            : "—"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-[10px] font-bold text-neutral-500 uppercase">Started</label>
          <input
            type="datetime-local"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
            onBlur={() => save("started_at", startedAt ? new Date(startedAt).toISOString() : null)}
            className="w-full border border-line rounded-lg px-2 py-1.5 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-neutral-500 uppercase">Ended</label>
          <input
            type="datetime-local"
            value={endedAt}
            onChange={(e) => setEndedAt(e.target.value)}
            onBlur={() => save("ended_at", endedAt ? new Date(endedAt).toISOString() : null)}
            className="w-full border border-line rounded-lg px-2 py-1.5 text-xs"
          />
        </div>
      </div>

      <div className="mb-2">
        <label className="text-[10px] font-bold text-neutral-500 uppercase">Doors knocked</label>
        <input
          value={doors}
          onChange={(e) => setDoors(e.target.value)}
          onBlur={() => save("doors_knocked", doors === "" ? null : Number(doors))}
          inputMode="numeric"
          className="w-full border border-line rounded-lg px-2 py-1.5 text-xs"
        />
      </div>

      <div className="mb-2">
        <label className="text-[10px] font-bold text-neutral-500 uppercase">Notes</label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => save("notes", notes.trim() || null)}
          className="w-full border border-line rounded-lg px-2 py-1.5 text-xs"
        />
      </div>

      <div className="flex items-center justify-between">
        {saving && <span className="text-[10px] text-neutral-400">Saving...</span>}
        <button onClick={remove} className="text-danger text-xs font-bold ml-auto">
          Delete entry
        </button>
      </div>
    </div>
  );
}
