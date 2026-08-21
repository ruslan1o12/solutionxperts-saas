"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  redacted: boolean;
  created_at: string;
};

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [myId, setMyId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [convoName, setConvoName] = useState("Chat");
  const [loading, setLoading] = useState(true);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
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
      .eq("conversation_id", params.id)
      .order("created_at", { ascending: true })
      .limit(300);
    setMessages(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMyId(user?.id ?? null);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        setIsAdmin(profile?.role === "admin");
      }

      const { data: convo } = await supabase
        .from("conversations")
        .select("name, is_general")
        .eq("id", params.id)
        .single();
      if (convo) setConvoName(convo.is_general ? "General" : convo.name || "Group chat");
    })();

    loadNames();
    loadMessages();

    const channel = supabase
      .channel(`convo-${params.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${params.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev, payload.new as Message]);
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? (payload.new as Message) : m)));
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!text.trim() || !myId) return;
    const body = text.trim();
    setText("");
    await supabase.from("messages").insert({ sender_id: myId, body, conversation_id: params.id });
  }

  async function deleteMessage(id: string) {
    if (!confirm("Delete this message? This can't be undone.")) return;
    await supabase.from("messages").delete().eq("id", id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setOpenMenuFor(null);
  }

  async function redactMessage(id: string) {
    if (!confirm("Redact this message? It'll show as removed to everyone, but stay logged.")) return;
    await supabase.from("messages").update({ redacted: true }).eq("id", id);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, redacted: true } : m)));
    setOpenMenuFor(null);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)]">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => router.push("/dashboard/messages")} className="text-steel font-bold text-sm">
          ← Chats
        </button>
        <div className="text-lg font-extrabold ml-2">{convoName}</div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white border border-line rounded-2xl p-4 mb-3">
        {loading ? (
          <p className="text-sm text-neutral-400 text-center py-6">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-6">No messages yet — say hi.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const mine = m.sender_id === myId;
              const canModerate = mine || isAdmin;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col relative`}>
                    {!mine && (
                      <span className="text-[11px] font-bold text-neutral-500 mb-0.5">
                        {names[m.sender_id] || "Team member"}
                      </span>
                    )}
                    <div
                      onClick={() => canModerate && !m.redacted && setOpenMenuFor(openMenuFor === m.id ? null : m.id)}
                      className={`rounded-2xl px-3.5 py-2 text-sm ${canModerate && !m.redacted ? "cursor-pointer" : ""} ${
                        m.redacted
                          ? "bg-neutral-100 text-neutral-400 italic"
                          : mine
                          ? "bg-signal text-white rounded-br-sm"
                          : "bg-[#F4F7F2] text-ink rounded-bl-sm"
                      }`}
                    >
                      {m.redacted ? "This message was redacted" : m.body}
                    </div>
                    <span className="text-[10px] text-neutral-400 mt-0.5">
                      {new Date(m.created_at).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    {openMenuFor === m.id && (
                      <div className="absolute top-full mt-1 bg-white border border-line rounded-xl shadow-lg overflow-hidden z-10 text-xs font-bold">
                        <button
                          onClick={() => deleteMessage(m.id)}
                          className="block w-full text-left px-4 py-2 text-danger hover:bg-[#F4F7F2]"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => redactMessage(m.id)}
                          className="block w-full text-left px-4 py-2 text-steel hover:bg-[#F4F7F2]"
                        >
                          Redact
                        </button>
                      </div>
                    )}
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
          placeholder="Message..."
          className="flex-1 border border-line rounded-xl px-4 py-3 bg-white"
        />
        <button onClick={send} className="bg-signal text-white font-bold rounded-xl px-5">
          Send
        </button>
      </div>
    </div>
  );
}
