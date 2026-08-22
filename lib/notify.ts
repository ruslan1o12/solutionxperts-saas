import { SupabaseClient } from "@supabase/supabase-js";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/**
 * Notifies admins plus whoever is flagged as "driver for the day" today.
 * Driver is a daily selection (My Day → "I'm driving today"), not a fixed role —
 * so this is computed fresh every time rather than read off a static role.
 */
export async function notifyOfficeStaff(
  supabase: SupabaseClient,
  { title, message, jobId }: { title: string; message: string; jobId?: string }
) {
  const [{ data: admins }, { data: driverLogs }] = await Promise.all([
    supabase.from("profiles").select("id").eq("role", "admin"),
    supabase.from("work_days").select("user_id").eq("work_date", todayStr()).eq("is_driver", true),
  ]);

  const recipientIds = new Set<string>();
  (admins ?? []).forEach((a) => recipientIds.add(a.id));
  (driverLogs ?? []).forEach((d) => recipientIds.add(d.user_id));

  if (recipientIds.size === 0) return;

  await supabase.from("notifications").insert(
    Array.from(recipientIds).map((id) => ({
      recipient_id: id,
      title,
      message,
      job_id: jobId || null,
    }))
  );

  // This helper is called from the browser (job-actions.tsx), which has no
  // access to the push private key — hand off to a server route to actually
  // send the device push. Fire-and-forget: don't block the UI on it.
  fetch("/api/send-push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userIds: Array.from(recipientIds),
      title,
      body: message,
      url: jobId ? `/dashboard/jobs/${jobId}` : "/dashboard/notifications",
    }),
  }).catch(() => {});
}
