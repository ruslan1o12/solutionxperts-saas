"use client";

import { useState } from "react";
import { downloadCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/client";
import AnimatedNumber from "../animated-number";

type Profile = {
  id: string;
  full_name: string | null;
  role: string;
  commission_rate: number | null;
  pay_type: string | null;
  pay_rate: number | null;
};
type PaidQuote = { id: string; total: number; sold_by: string | null; created_by: string | null; paid_at: string };
type CompletedJob = { id: string; assigned_to: string | null; completed_at: string; quotes: { total: number }[] | { total: number } | null };
type WorkDay = { user_id: string; work_date: string; started_at: string | null; ended_at: string | null; is_driver: boolean | null };

type RangeKey = "week" | "month" | "90";

function rangeStart(key: RangeKey): string {
  const d = new Date();
  if (key === "week") {
    d.setDate(d.getDate() - 7);
  } else if (key === "month") {
    d.setDate(1);
  } else {
    d.setDate(d.getDate() - 90);
  }
  return d.toISOString().slice(0, 10);
}

function hours(start: string | null, end: string | null) {
  if (!start || !end) return 0;
  return (new Date(end).getTime() - new Date(start).getTime()) / 3600000;
}

export default function PayrollClient({
  profiles,
  paidQuotes,
  completedJobs,
  workDays,
  initialDriverRate,
}: {
  profiles: Profile[];
  paidQuotes: PaidQuote[];
  completedJobs: CompletedJob[];
  workDays: WorkDay[];
  initialDriverRate: number;
}) {
  const supabase = createClient();
  const [range, setRange] = useState<RangeKey>("week");
  const [driverRate, setDriverRate] = useState(initialDriverRate.toString());
  const [savingRate, setSavingRate] = useState(false);
  const start = rangeStart(range);

  async function saveDriverRate() {
    setSavingRate(true);
    await supabase.from("business_settings").update({ driver_day_rate: Number(driverRate) || 0 }).eq("id", 1);
    setSavingRate(false);
  }

  const rows = profiles.map((p) => {
    const mySales = paidQuotes.filter((q) => (q.sold_by || q.created_by) === p.id && q.paid_at >= start);
    const salesCount = mySales.length;
    const salesTotal = mySales.reduce((s, q) => s + Number(q.total || 0), 0);
    const commissionEarned = salesTotal * ((p.commission_rate || 0) / 100);

    const myJobs = completedJobs.filter((j) => j.assigned_to === p.id && j.completed_at >= start);
    const myDays = workDays.filter((d) => d.user_id === p.id && d.work_date >= start);
    const hoursWorked = myDays.reduce((s, d) => s + hours(d.started_at, d.ended_at), 0);
    const daysWorked = myDays.filter((d) => d.started_at).length;
    const driverDays = myDays.filter((d) => d.is_driver).length;
    const driverPay = driverDays * (Number(driverRate) || 0);

    let techPay = 0;
    if (p.pay_type === "hourly") techPay = hoursWorked * (p.pay_rate || 0);
    else if (p.pay_type === "daily") techPay = daysWorked * (p.pay_rate || 0);
    else if (p.pay_type === "percentage") {
      const jobRevenue = myJobs.reduce((s, j) => {
        const q = Array.isArray(j.quotes) ? j.quotes[0] : j.quotes;
        return s + Number(q?.total || 0);
      }, 0);
      techPay = jobRevenue * ((p.pay_rate || 0) / 100);
    } else if (p.pay_type === "flat") techPay = myJobs.length * (p.pay_rate || 0);

    return {
      name: p.full_name || "Unnamed",
      role: p.role,
      salesCount,
      salesTotal,
      commissionEarned,
      jobsCompleted: myJobs.length,
      hoursWorked: hoursWorked.toFixed(1),
      payType: p.pay_type || "hourly",
      techPay,
      driverDays,
      driverPay,
      total: commissionEarned + techPay + driverPay,
    };
  });

  function exportCsv() {
    downloadCsv(
      `payroll-${range}-${new Date().toISOString().slice(0, 10)}`,
      rows.map((r) => ({
        Name: r.name,
        Role: r.role,
        "Sales made": r.salesCount,
        "Sales total $": r.salesTotal.toFixed(2),
        "Commission earned $": r.commissionEarned.toFixed(2),
        "Jobs completed": r.jobsCompleted,
        "Hours worked": r.hoursWorked,
        "Pay type": r.payType,
        "Tech pay $": r.techPay.toFixed(2),
        "Driver days": r.driverDays,
        "Driver pay $": r.driverPay.toFixed(2),
        "Total owed $": r.total.toFixed(2),
      }))
    );
  }

  return (
    <div>
      <div className="bg-white border border-line rounded-2xl p-4 mb-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="text-[10px] font-bold text-neutral-500 uppercase">
            Driver flat rate (per day driven)
          </label>
          <input
            value={driverRate}
            onChange={(e) => setDriverRate(e.target.value)}
            inputMode="decimal"
            className="w-full border border-line rounded-lg px-2.5 py-2 text-sm mt-1"
          />
        </div>
        <button
          onClick={saveDriverRate}
          disabled={savingRate}
          className="bg-signal text-white font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-60"
        >
          {savingRate ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(["week", "month", "90"] as RangeKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setRange(k)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                range === k ? "bg-ink text-paper border-ink" : "border-line text-neutral-500"
              }`}
            >
              {k === "week" ? "This week" : k === "month" ? "This month" : "Last 90 days"}
            </button>
          ))}
        </div>
        <button onClick={exportCsv} className="text-steel font-bold text-sm">
          Export CSV
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.name} className="bg-white border border-line rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold">{r.name}</div>
                <div className="text-[11px] text-neutral-500 uppercase font-semibold">{r.role}</div>
              </div>
              <div className="text-xl font-extrabold text-signal">$<AnimatedNumber value={Math.round(r.total)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600">
              {r.salesCount > 0 && (
                <>
                  <div>{r.salesCount} sales · ${r.salesTotal.toFixed(0)} total</div>
                  <div>Commission: ${r.commissionEarned.toFixed(2)}</div>
                </>
              )}
              {(r.jobsCompleted > 0 || Number(r.hoursWorked) > 0) && (
                <>
                  <div>{r.jobsCompleted} jobs completed</div>
                  <div>
                    {r.payType === "hourly"
                      ? `${r.hoursWorked} hrs worked`
                      : r.payType === "daily"
                      ? "Daily rate"
                      : r.payType === "percentage"
                      ? "% of job value"
                      : "Flat per job"}{" "}
                    → ${r.techPay.toFixed(2)}
                  </div>
                </>
              )}
              {r.driverDays > 0 && (
                <>
                  <div>{r.driverDays} day(s) driving</div>
                  <div>Driver pay: ${r.driverPay.toFixed(2)}</div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
