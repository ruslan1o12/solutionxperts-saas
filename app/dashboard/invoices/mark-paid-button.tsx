"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MarkPaidButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);

  async function markPaid() {
    setSaving(true);
    await supabase
      .from("quotes")
      .update({ status: "Paid", paid_at: new Date().toISOString() })
      .eq("id", quoteId);
    setSaving(false);
    router.refresh();
  }

  return (
    <button
      onClick={markPaid}
      disabled={saving}
      className="text-xs font-bold bg-good text-white rounded-full px-3 py-1.5 disabled:opacity-60"
    >
      {saving ? "Saving..." : "Mark paid (cash/check)"}
    </button>
  );
}
