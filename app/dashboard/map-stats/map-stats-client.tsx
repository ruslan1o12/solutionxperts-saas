"use client";

import { useMemo, useState } from "react";
import { downloadCsv } from "@/lib/csv";

type DoorLog = { created_by: string | null; created_at: string; outcome: string };

const OUTCOME_KEYS = [
  "Answered - Interested",
  "Answered - Not Interested",
  "Not Home",
  "Callback",
  "No Soliciting",
] as const;

const OUTCOME_LABEL: Record<string, string> = {
  "Answered - Interested": "Interested",
  "Answered - Not Interested": "Not interested",
  "Not Home": "Not home",
  Callback: "Callback",
  "No Soliciting": "No soliciting",
};

type RankBy = "total" | (typeof OUTCOME_KEYS)[number];
type Timeframe = "7" | "30" | "all";

export default function MapStatsClient({
  logs,
  names,
}: {
  logs: DoorLog[];
  names: Record<string, string>;
}) {
  const [rankBy, setRankBy] = useState<RankBy>("total");
  const [timeframe, setTimeframe] = useState<Timeframe>("30");

  const filtered = useMemo(() => {
    if (timeframe === "all") return logs;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(timeframe));
    return logs.filter((l) => new Date(l.created_at) >= cutoff);
  }, [logs, timeframe]);

  const rows = useMemo(() => {
    const byUser: Record<string, Record<string, number>> = {};
    filtered.forEach((l) => {
      const id = l.created_by || "unknown";
      if (!byUser[id]) byUser[id] = {};
      byUser[id][l.outcome] = (byUser[id][l.outcome] || 0) + 1;
    });

    return Object.entries(byUser)
      .map(([id, counts]) => {
        const total = Object.values(counts).reduce((s, n) => s + n, 0);
        return { id, name: names[id] || "Unknown", total, counts };
      })
      .sort((a, b) => {
        const av = rankBy === "total" ? a.total : a.counts[rankBy] || 0;
        const bv = rankBy === "total" ? b.total : b.counts[rankBy] || 0;
        return bv - av;
      });
  }, [filtered, rankBy, names]);

  function exportCsv() {
    downloadCsv(
      `map-stats-${timeframe}-${new Date().toISOString().slice(0, 10)}`,
      rows.map((r) => ({
        Name: r.name,
        "Doors knocked": r.total,
        ...Object.fromEntries(OUTCOME_KEYS.map((k) => [OUTCOME_LABEL[k], r.counts[k] || 0])),
      }))
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={rankBy}
          onChange={(e) => setRankBy(e.target.value as RankBy)}
          className="border border-line rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="total">Rank by: Doors knocked</option>
          {OUTCOME_KEYS.map((k) => (
            <option key={k} value={k}>
              Rank by: {OUTCOME_LABEL[k]}
            </option>
          ))}
        </select>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as Timeframe)}
          className="border border-line rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="all">All time</option>
        </select>
        <button onClick={exportCsv} className="ml-auto text-steel font-bold text-sm">
          Export CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-10">No doors logged in this range.</p>
      ) : (
        <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F7F2] text-left text-[10px] font-bold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Doors</th>
                {OUTCOME_KEYS.map((k) => (
                  <th key={k} className="px-3 py-3 whitespace-nowrap">
                    {OUTCOME_LABEL[k]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-3 py-3 font-semibold whitespace-nowrap">
                    {i === 0 && "🥇 "}
                    {r.name}
                  </td>
                  <td className="px-3 py-3 font-bold">{r.total}</td>
                  {OUTCOME_KEYS.map((k) => (
                    <td key={k} className="px-3 py-3 text-neutral-600">
                      {r.counts[k] || 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
