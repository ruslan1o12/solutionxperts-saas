"use client";

import { useState } from "react";
import Link from "next/link";

type LeaderRow = { id: string; name: string; jobs: number; amount: number };

export default function Leaderboard({
  monthLabel,
  sales,
  tech,
}: {
  monthLabel: string;
  sales: LeaderRow[];
  tech: LeaderRow[];
}) {
  const [tab, setTab] = useState<"sales" | "tech">("sales");
  const rows = (tab === "sales" ? sales : tech).slice(0, 5);

  return (
    <div className="bg-white border border-line rounded-2xl p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-sm">{monthLabel} Leaderboard</div>
        <div className="flex bg-[#F4F7F2] rounded-full p-0.5">
          <button
            onClick={() => setTab("sales")}
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              tab === "sales" ? "bg-ink text-paper" : "text-neutral-500"
            }`}
          >
            Sales
          </button>
          <button
            onClick={() => setTab("tech")}
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              tab === "tech" ? "bg-ink text-paper" : "text-neutral-500"
            }`}
          >
            Tech
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-4">Nothing yet this month.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <div key={r.id} className="flex items-center gap-3">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                  i === 0 ? "bg-[#FFC423] text-ink" : "bg-[#F4F7F2] text-neutral-500"
                }`}
              >
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="font-semibold text-sm">{r.name}</div>
                <div className="text-[11px] text-neutral-500">{r.jobs} jobs</div>
              </div>
              <div className="font-extrabold text-sm">${r.amount.toFixed(0)}</div>
            </div>
          ))}
        </div>
      )}
      <Link href="/dashboard/payroll" className="block text-center text-steel font-bold text-xs mt-3">
        See full leaderboard →
      </Link>
    </div>
  );
}
