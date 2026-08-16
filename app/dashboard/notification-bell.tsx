"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NotificationBell({ light = false }: { light?: boolean }) {
  const supabase = createClient();
  const [count, setCount] = useState(0);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { count: c } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("read", false);
    setCount(c ?? 0);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Link href="/dashboard/notifications" className="relative p-1" aria-label="Notifications">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z"
          stroke={light ? "#F4F7F2" : "currentColor"}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M9.5 17a2.5 2.5 0 0 0 5 0" stroke={light ? "#F4F7F2" : "currentColor"} strokeWidth="2" strokeLinecap="round" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
