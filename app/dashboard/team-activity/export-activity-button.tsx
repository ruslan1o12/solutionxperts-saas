"use client";

import { downloadCsv } from "@/lib/csv";

type Row = {
  name: string;
  date: string;
  isDriver: boolean;
  hours: string;
  doorsKnocked: number;
  salesMade: number;
  housesCleaned: number;
};

export default function ExportActivityButton({ rows }: { rows: Row[] }) {
  function exportCsv() {
    downloadCsv(
      `team-activity-${new Date().toISOString().slice(0, 10)}`,
      rows.map((r) => ({
        Name: r.name,
        Date: r.date,
        "Driver for the day": r.isDriver ? "Yes" : "No",
        "Hours worked": r.hours,
        "Doors knocked": r.doorsKnocked,
        "Sales made": r.salesMade,
        "Houses cleaned": r.housesCleaned,
      }))
    );
  }

  if (rows.length === 0) return null;
  return (
    <button onClick={exportCsv} className="text-steel font-bold text-sm">
      Export CSV
    </button>
  );
}
