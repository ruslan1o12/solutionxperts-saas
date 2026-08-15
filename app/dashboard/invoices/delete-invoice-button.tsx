"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteInvoiceButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [working, setWorking] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this invoice? This can't be undone.")) return;
    setWorking(true);
    await supabase.from("quotes").delete().eq("id", quoteId);
    setWorking(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={working}
      className="text-xs font-bold text-danger"
    >
      {working ? "Deleting..." : "Delete"}
    </button>
  );
}
