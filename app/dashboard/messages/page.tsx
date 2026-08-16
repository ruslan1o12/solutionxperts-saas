"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export default function MessagesPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadNames() {
    const { data } = await supabase.from("profiles").select("id, full_name");
    const map: Record<string, string> = {};
    (data ?? []).forEach((p) => (map[p.id] = p.full_name || "Team member"));
    setNames(map);
  }

  async function loadMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMyId(user?.id ?? null);
    })();
    loadNames();
    loadMessages();

    const channel = supabase
      .channel("team-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!text.trim() || !myId) return;
    const body = text.trim();
    setText("");
    await supabase.from("messages").insert({ sender_id: myId, body });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)]">
      <div className="text-xl font-extrabold mb-3">Team chat</div>

      <div className="flex-1 overflow-y-auto bg-white border border-line rounded-2xl p-4 mb-3">
        {loading ? (
          <p className="text-sm text-neutral-400 text-center py-6">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-6">
            No messages yet — say hi to the team.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const mine = m.sender_id === myId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                    {!mine && (
                      <span className="text-[11px] font-bold text-neutral-500 mb-0.5">
                        {names[m.sender_id] || "Team member"}
                      </span>
                    )}
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-sm ${
                        mine ? "bg-signal text-white rounded-br-sm" : "bg-[#F4F7F2] text-ink rounded-bl-sm"
                      }`}
                    >
                      {m.body}
                    </div>
                    <span className="text-[10px] text-neutral-400 mt-0.5">
                      {new Date(m.created_at).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message the team..."
          className="flex-1 border border-line rounded-xl px-4 py-3 bg-white"
        />
        <button onClick={send} className="bg-signal text-white font-bold rounded-xl px-5">
          Send
        </button>
      </div>
    </div>
  );
}
