"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Person = { id: string; label: string };

export default function NewChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data } = await supabase.from("profiles").select("id, full_name");
      setPeople(
        (data ?? [])
          .filter((p) => p.id !== user?.id)
          .map((p) => ({ id: p.id, label: p.full_name || "Team member" }))
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createChat() {
    if (selected.size < 1) return setError("Pick at least one other person.");
    setCreating(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: convo, error: convoError } = await supabase
      .from("conversations")
      .insert({
        name: name.trim() || null,
        is_group: true,
        is_general: false,
        created_by: user?.id,
      })
      .select()
      .single();

    if (convoError || !convo) {
      setCreating(false);
      return setError(convoError?.message || "Couldn't create the chat.");
    }

    const memberRows = [user?.id, ...Array.from(selected)].map((uid) => ({
      conversation_id: convo.id,
      user_id: uid,
    }));

    await supabase.from("conversation_participants").insert(memberRows);

    setCreating(false);
    router.push(`/dashboard/messages/${convo.id}`);
  }

  return (
    <div>
      <button onClick={() => router.back()} className="text-steel font-bold text-sm mb-3">
        ← Back
      </button>
      <div className="text-xl font-extrabold mb-1">New chat</div>
      <p className="text-sm text-neutral-500 mb-4">
        Pick 2 or more people to start a group chat — only they (and admins) can see it.
      </p>

      <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
        Chat name (optional)
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Job scheduling"
        className="w-full border border-line rounded-lg px-3 py-2.5 mb-4 bg-white"
      />

      <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-2">
        Members
      </label>
      <div className="flex flex-col gap-2 mb-4">
        {people.map((p) => (
          <label
            key={p.id}
            className={`border rounded-xl p-3 flex items-center gap-3 cursor-pointer ${
              selected.has(p.id) ? "border-signal bg-[#EAF6EC]" : "border-line bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() => toggle(p.id)}
              className="w-4 h-4"
            />
            <span className="font-semibold text-sm">{p.label}</span>
          </label>
        ))}
        {people.length === 0 && (
          <p className="text-sm text-neutral-500">No other team members yet.</p>
        )}
      </div>

      {error && <p className="text-danger text-sm mb-3">{error}</p>}

      <button
        onClick={createChat}
        disabled={creating}
        className="w-full bg-signal text-white font-bold rounded-xl py-3 disabled:opacity-60"
      >
        {creating ? "Creating..." : "Create chat"}
      </button>
    </div>
  );
}
