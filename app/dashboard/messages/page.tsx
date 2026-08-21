"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Conversation = {
  id: string;
  name: string | null;
  is_group: boolean;
  is_general: boolean;
};

export default function MessagesListPage() {
  const supabase = createClient();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [memberNames, setMemberNames] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMyId(user?.id ?? null);

      const { data: convos } = await supabase
        .from("conversations")
        .select("id, name, is_group, is_general")
        .order("is_general", { ascending: false })
        .order("created_at", { ascending: false });

      setConversations(convos ?? []);

      // For group chats without a custom name, show the other members' names instead
      const groupIds = (convos ?? []).filter((c) => c.is_group && !c.is_general).map((c) => c.id);
      if (groupIds.length > 0) {
        const { data: participants } = await supabase
          .from("conversation_participants")
          .select("conversation_id, user_id")
          .in("conversation_id", groupIds);

        const { data: profiles } = await supabase.from("profiles").select("id, full_name");
        const nameById: Record<string, string> = {};
        (profiles ?? []).forEach((p) => (nameById[p.id] = p.full_name || "Team member"));

        const namesByConvo: Record<string, string[]> = {};
        (participants ?? []).forEach((p) => {
          if (p.user_id === user?.id) return;
          if (!namesByConvo[p.conversation_id]) namesByConvo[p.conversation_id] = [];
          namesByConvo[p.conversation_id].push(nameById[p.user_id] || "Team member");
        });
        setMemberNames(namesByConvo);
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-sm text-neutral-400 text-center py-10">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xl font-extrabold">Team Chat</div>
        <Link href="/dashboard/messages/new" className="text-signal font-bold text-sm">
          + New chat
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {conversations.map((c) => {
          const label = c.is_general
            ? "General"
            : c.name || memberNames[c.id]?.join(", ") || "Group chat";
          return (
            <Link
              key={c.id}
              href={`/dashboard/messages/${c.id}`}
              className="bg-white border border-line rounded-2xl p-4 flex items-center gap-3"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  c.is_general ? "bg-ink text-paper" : "bg-[#EAF6EC] text-steel"
                }`}
              >
                {c.is_general ? "#" : label.charAt(0).toUpperCase()}
              </div>
              <div className="font-bold text-sm">{label}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
