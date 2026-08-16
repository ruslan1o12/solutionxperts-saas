import { SupabaseClient } from "@supabase/supabase-js";

export async function notifyOfficeStaff(
  supabase: SupabaseClient,
  { title, message, jobId }: { title: string; message: string; jobId?: string }
) {
  const { data: staff } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "salesman"]);

  if (!staff || staff.length === 0) return;

  await supabase.from("notifications").insert(
    staff.map((s) => ({
      recipient_id: s.id,
      title,
      message,
      job_id: jobId || null,
    }))
  );
}
