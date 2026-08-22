import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:support@example.com",
    publicKey,
    privateKey
  );
  configured = true;
}

/**
 * Sends a real device push notification to every device a user has registered
 * (via "Enable notifications" in the app). Silently does nothing if push
 * isn't configured (missing VAPID keys) or the user has no devices — the
 * in-app notification and any email/SMS still go out regardless.
 */
export async function sendPushToUsers(
  userIds: string[],
  { title, body, url }: { title: string; body: string; url?: string }
) {
  ensureConfigured();
  if (!configured || userIds.length === 0) return;

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);

  if (!subs || subs.length === 0) return;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({ title, body, url })
        );
      } catch (err) {
        // 410/404 means the device unsubscribed or the registration is stale — clean it up.
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Push send failed", err);
        }
      }
    })
  );
}
