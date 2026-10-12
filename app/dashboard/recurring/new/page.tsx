"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AddressSearch from "../../address-search";
import ContractFields, { ContractValues, emptyContract, Field } from "../contract-fields";

type Cust = { id: string; name: string; contact: string | null; address: string | null };
const input = "w-full border border-line rounded-lg px-3 py-2.5 bg-white";

export default function NewRecurringPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [customers, setCustomers] = useState<Cust[]>([]);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Cust | null>(null);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [values, setValues] = useState<ContractValues>(emptyContract);
  const [sendNow, setSendNow] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("customers")
      .select("id, name, contact, address")
      .order("name")
      .then(({ data }) => setCustomers((data ?? []) as Cust[]));
  }, [supabase]);

  const filtered = customers
    .filter((c) => `${c.name} ${c.address ?? ""} ${c.contact ?? ""}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 30);

  const contactForSend = mode === "existing" ? picked?.contact ?? "" : contact;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "existing" && !picked) return setError("Pick a customer from the list.");
    if (mode === "new" && !name.trim()) return setError("Enter the customer's name.");
    if (!values.job_description.trim()) return setError("Enter the job that will be done.");
    if (!(Number(values.price) >= 0) || values.price === "") return setError("Enter the price per visit.");
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let customerId = picked?.id;
    if (mode === "new") {
      const { data: c, error: cErr } = await supabase
        .from("customers")
        .insert({
          name: name.trim(),
          contact: contact.trim(),
          address: address.trim(),
          lat,
          lng,
          service_type: "Cleaning",
          created_by: user?.id,
        })
        .select("id")
        .single();
      if (cErr || !c) {
        setSaving(false);
        return setError(cErr?.message || "Couldn't create the customer.");
      }
      customerId = c.id;
    }

    const { data: contract, error: kErr } = await supabase
      .from("recurring_contracts")
      .insert({
        customer_id: customerId,
        job_description: values.job_description.trim(),
        frequency: values.frequency,
        price: Number(values.price),
        agreement_text: values.agreement_text,
        start_date: values.start_date || null,
        next_service_date: values.start_date || null,
        created_by: user?.id,
      })
      .select("id")
      .single();

    if (kErr || !contract) {
      setSaving(false);
      return setError(kErr?.message || "Couldn't save the contract.");
    }

    let note = "";
    if (sendNow) {
      try {
        const res = await fetch("/api/send-agreement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contractId: contract.id }),
        });
        const data = await res.json();
        if (res.ok) {
          const r = data.results;
          note = data.delivered
            ? `sent=${r.email === "sent" ? "email" : "sms"}`
            : `notsent=${encodeURIComponent(r.email !== "skipped" ? r.email : r.sms)}`;
        } else {
          note = `notsent=${encodeURIComponent(data.error || "failed")}`;
        }
      } catch {
        note = "notsent=network";
      }
    }
    router.push(`/dashboard/recurring/${contract.id}${note ? `?${note}` : ""}`);
    router.refresh();
  }

  return (
    <form onSubmit={save}>
      <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-3">New recurring customer</div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {(["existing", "new"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-xl py-2.5 font-bold text-sm border-2 ${
              mode === m ? "bg-ink text-white border-ink" : "bg-white border-line text-neutral-700"
            }`}
          >
            {m === "existing" ? "Existing customer" : "New customer"}
          </button>
        ))}
      </div>

      {mode === "existing" ? (
        <Field label="Choose a customer">
          {picked ? (
            <div className="flex items-center justify-between bg-[#E4F1E5] border border-good rounded-lg px-3 py-2.5">
              <div className="min-w-0">
                <div className="font-bold truncate">{picked.name}</div>
                <div className="text-xs text-neutral-600 truncate">{[picked.contact, picked.address].filter(Boolean).join(" · ")}</div>
              </div>
              <button type="button" onClick={() => setPicked(null)} className="text-xs font-bold text-steel ml-3">
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={input}
                placeholder="Search your customers..."
              />
              <div className="mt-2 max-h-56 overflow-y-auto border border-line rounded-lg bg-white divide-y divide-line">
                {filtered.length === 0 && <div className="p-3 text-sm text-neutral-500">No customers match.</div>}
                {filtered.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setPicked(c)}
                    className="block w-full text-left px-3 py-2 hover:bg-neutral-50"
                  >
                    <div className="font-bold text-sm">{c.name}</div>
                    <div className="text-xs text-neutral-500 truncate">{[c.contact, c.address].filter(Boolean).join(" · ")}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </Field>
      ) : (
        <>
          <Field label="Name / business">
            <input value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="e.g. Dana Smith" />
          </Field>
          <Field label="Email or phone" hint="The agreement is sent here — email works best.">
            <input value={contact} onChange={(e) => setContact(e.target.value)} className={input} placeholder="name@email.com or 519-555-0100" />
          </Field>
          <Field label="Address">
            <AddressSearch
              value={address}
              onChange={(v) => {
                setAddress(v);
                setLat(null);
                setLng(null);
              }}
              onSelect={(r) => {
                setAddress(r.label);
                setLat(r.lat);
                setLng(r.lng);
              }}
            />
          </Field>
        </>
      )}

      <div className="border-t border-line my-4" />
      <ContractFields values={values} onChange={setValues} />

      <label className="flex items-start gap-2 bg-white border border-line rounded-xl p-3 mb-4 text-sm">
        <input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} className="mt-1" />
        <span>
          <b>Send the agreement to the customer now</b>
          <span className="block text-xs text-neutral-500">
            {contactForSend
              ? contactForSend.includes("@")
                ? `Emails ${contactForSend} with the job, price and a link to accept.`
                : `Texts ${contactForSend} a link to review and accept.`
              : "This customer has no email or phone on file — you'll get a link to share yourself."}
          </span>
        </span>
      </label>

      {error && <p className="text-danger text-sm mb-2">{error}</p>}
      <button disabled={saving} className="w-full bg-signal text-white font-bold rounded-xl py-3 disabled:opacity-60">
        {saving ? "Saving..." : sendNow ? "Save & send agreement" : "Save contract"}
      </button>
    </form>
  );
}
