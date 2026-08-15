"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Customer = { id: string; name: string; address: string | null };

export default function EstimatorHub() {
  const router = useRouter();
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("customers")
      .select("id, name, address")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setCustomers(data ?? []));
  }, []);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  async function createAndGo() {
    if (!newName.trim()) return setError("Enter a name.");
    setCreating(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: newName.trim(),
        contact: newContact.trim(),
        address: newAddress.trim(),
        created_by: user?.id,
      })
      .select()
      .single();

    setCreating(false);
    if (error) return setError(error.message);
    router.push(`/dashboard/customers/${data.id}/estimate`);
  }

  return (
    <div>
      <div className="text-xl font-extrabold mb-1">AI Estimator</div>
      <p className="text-sm text-neutral-500 mb-4">
        Pick who this is for, then snap photos on site to get a draft price range.
      </p>

      {!showNew ? (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers..."
            className="w-full border border-line rounded-xl px-4 py-3 bg-white mb-3"
          />

          <button
            onClick={() => setShowNew(true)}
            className="w-full bg-signal text-white font-bold rounded-xl py-3 mb-4"
          >
            + New customer / property
          </button>

          <div className="flex flex-col gap-2">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/dashboard/customers/${c.id}/estimate`)}
                className="text-left bg-white border border-line rounded-2xl p-4"
              >
                <div className="font-bold">{c.name}</div>
                {c.address && <div className="text-xs text-neutral-500">{c.address}</div>}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-neutral-400 text-center py-8">No matches.</p>
            )}
          </div>
        </>
      ) : (
        <div>
          <button
            onClick={() => setShowNew(false)}
            className="text-steel font-bold text-sm mb-3"
          >
            ← Back to search
          </button>
          <div className="bg-white border border-line rounded-2xl p-4">
            <Field label="Name / business">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border border-line rounded-lg px-3 py-2.5"
                placeholder="e.g. Riverside Plaza — Dana (PM)"
              />
            </Field>
            <Field label="Phone or email">
              <input
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                className="w-full border border-line rounded-lg px-3 py-2.5"
              />
            </Field>
            <Field label="Address">
              <input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full border border-line rounded-lg px-3 py-2.5"
              />
            </Field>
            {error && <p className="text-danger text-sm mb-2">{error}</p>}
            <button
              onClick={createAndGo}
              disabled={creating}
              className="w-full bg-signal text-white font-bold rounded-xl py-3 disabled:opacity-60"
            >
              {creating ? "Creating..." : "Continue to photos"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
