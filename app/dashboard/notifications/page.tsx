"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import EnablePushButton from "../enable-push-button";

type Notif = {
  id: string;
  title: string;
  message: string | null;
  job_id: string | null;
  read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return setLoading(false);

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      setItems(data ?? []);
      setLoading(false);

      const unreadIds = (data ?? []).filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
      }
    })();
  }, []);

  if (loading) return <p className="text-sm text-neutral-400 text-center py-10">Loading...</p>;

  return (
    <div>
      <div className="text-xl font-extrabold mb-4">Notifications</div>
      <EnablePushButton />
      {items.length === 0 && (
        <p className="text-sm text-neutral-500 text-center py-10">Nothing yet.</p>
      )}
      <div className="flex flex-col gap-2">
        {items.map((n) => {
          const content = (
            <div
              key={n.id}
              className={`bg-white border rounded-2xl p-4 ${
                n.read ? "border-line" : "border-signal"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="font-bold text-sm">{n.title}</div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-signal mt-1.5" />}
              </div>
              {n.message && <div className="text-sm text-neutral-600 mt-1">{n.message}</div>}
              <div className="text-[11px] text-neutral-400 mt-1.5">
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          );
          return n.job_id ? (
            <Link key={n.id} href={`/dashboard/jobs/${n.job_id}`}>
              {content}
            </Link>
          ) : (
            content
          );
        })}
      </div>
    </div>
  );
}
