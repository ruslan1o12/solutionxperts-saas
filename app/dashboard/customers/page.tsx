import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const PILL: Record<string, string> = {
  New: "bg-[#E7EEF5] text-steel",
  Contacted: "bg-[#FFF1DF] text-[#8A5A17]",
  Quoted: "bg-[#FFE9CC] text-[#B45F0A]",
  Won: "bg-[#E4F1E5] text-good",
  Lost: "bg-[#F1E7E6] text-neutral-500",
};

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  const list = customers ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-extrabold uppercase tracking-wide text-steel">
          Customers ({list.length})
        </div>
        <Link href="/dashboard/customers/new" className="text-signal font-bold text-sm">
          + Add
        </Link>
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

      <div className="flex flex-col gap-2">
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
          </Link>
        ))}
      </div>
    </div>
  );
}
