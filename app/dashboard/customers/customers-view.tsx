"use client";

import Link from "next/link";
import { downloadCsv } from "@/lib/csv";

type Customer = {
  id: string;
  name: string;
  contact: string | null;
  address: string | null;
  service_type: string | null;
  status: string;
  follow_up: string | null;
  created_at?: string;
  added_by_name?: string | null;
};

const PILL: Record<string, string> = {
  New: "bg-[#E7EEF5] text-steel",
  Contacted: "bg-[#FFF1DF] text-[#8A5A17]",
  Quoted: "bg-[#FFE9CC] text-[#B45F0A]",
  Won: "bg-[#E4F1E5] text-good",
  Lost: "bg-[#F1E7E6] text-neutral-500",
};

export default function CustomersView({ list }: { list: Customer[] }) {
  function exportCsv() {
    downloadCsv(
      `customers-${new Date().toISOString().slice(0, 10)}`,
      list.map((c) => ({
        Name: c.name,
        Contact: c.contact,
        Address: c.address,
        "Service type": c.service_type,
        Status: c.status,
        "Follow up": c.follow_up,
      }))
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="text-xs font-extrabold uppercase tracking-wide text-steel">
          Customers ({list.length})
        </div>
        <div className="flex items-center gap-4">
          {list.length > 0 && (
            <button onClick={exportCsv} className="text-steel font-bold text-sm">
              Export CSV
            </button>
          )}
          <Link href="/dashboard/customers/new" className="text-signal font-bold text-sm">
            + Add
          </Link>
        </div>
      </div>

      {list.length === 0 && (
        <div className="text-center py-16 text-neutral-500">
          <p className="mb-4">No customers yet.</p>
          <Link
            href="/dashboard/customers/new"
            className="inline-block bg-signal text-white font-bold rounded-xl px-5 py-3"
          >
            Add your first customer
          </Link>
        </div>
      )}

      {/* Mobile: cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {list.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/customers/${c.id}`}
            className="bg-white border border-line rounded-2xl p-4 block"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold">{c.name}</div>
                <div className="text-xs text-neutral-500">{c.service_type}</div>
              </div>
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                  PILL[c.status] ?? PILL.New
                }`}
              >
                {c.status}
              </span>
            </div>
            {c.follow_up && (
              <div className="text-xs text-neutral-500 mt-1">Follow up: {c.follow_up}</div>
            )}
            {c.added_by_name && (
              <div className="text-[11px] text-neutral-400 mt-1">
                Added by {c.added_by_name}
                {c.created_at ? ` · ${new Date(c.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Desktop: table */}
      {list.length > 0 && (
        <div className="hidden md:block bg-white border border-line rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F7F2] text-left text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Follow up</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-t border-line hover:bg-[#FAFAF8]">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/customers/${c.id}`} className="font-bold text-ink">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{c.contact || "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{c.address || "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{c.service_type}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                        PILL[c.status] ?? PILL.New
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{c.follow_up || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
