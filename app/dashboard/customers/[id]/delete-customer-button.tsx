"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteCustomerButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const ok = confirm(
      "Delete this customer? This also deletes their notes, quotes/invoices, and any scheduled jobs. This can't be undone."
    );
    if (!ok) return;
    setWorking(true);
    setError(null);
    const { error } = await supabase.from("customers").delete().eq("id", customerId);
    setWorking(false);
    if (error) return setError(error.message);
    router.push("/dashboard/customers");
    router.refresh();
  }

  return (
    <div className="mt-6">
      {error && <p className="text-danger text-sm mb-2">{error}</p>}
      <button
        onClick={handleDelete}
        disabled={working}
        className="w-full border border-danger text-danger font-bold rounded-xl py-3 disabled:opacity-60"
      >
        {working ? "Deleting..." : "Delete customer"}
      </button>
    </div>
  );
}
