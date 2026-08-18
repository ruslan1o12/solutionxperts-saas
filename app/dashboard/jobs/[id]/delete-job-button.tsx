"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [working, setWorking] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this job? This can't be undone.")) return;
    setWorking(true);
    await supabase.from("jobs").delete().eq("id", jobId);
    router.push("/dashboard/jobs");
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={working}
      className="w-full border border-danger text-danger font-bold rounded-xl py-3 mt-3 disabled:opacity-60"
    >
      {working ? "Deleting..." : "Delete job"}
    </button>
  );
}
