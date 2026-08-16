"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("theme_settings")
      .select("logo_url")
      .eq("id", 1)
      .single()
      .then(({ data }) => setLogoUrl(data?.logo_url ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      setLoading(false);
      if (error) return setError(error.message);
      router.push("/dashboard");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setError(error.message);
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-ink px-6 pt-10 pb-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl || "/icon-192.png"} alt="" width={40} height={40} className="rounded-lg" style={{ width: 40, height: 40 }} />
          <div>
            <div className="text-paper font-extrabold text-lg leading-tight">SolutionXperts</div>
            <div className="text-mint text-[11px] font-semibold uppercase tracking-wider">
              Team Portal
            </div>
          </div>
        </div>
      </div>
      <div className="hazard-strip" />

      <div className="flex-1 flex items-start justify-center px-6 pt-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <h1 className="text-xl font-extrabold mb-1">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h1>
          <p className="text-sm text-neutral-500 mb-6">
            {mode === "signin"
              ? "Access the shared SolutionXperts workspace."
              : "New team members join the same shared workspace."}
          </p>

          {mode === "signup" && (
            <>
              <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
                Full name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-line rounded-lg px-3 py-2.5 mb-4 bg-white"
                placeholder="Your name"
              />
            </>
          )}

          <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
            Email
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-line rounded-lg px-3 py-2.5 mb-4 bg-white"
            placeholder="you@solutionxperts.com"
          />

          <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
            Password
          </label>
          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-line rounded-lg px-3 py-2.5 mb-2 bg-white"
            placeholder="At least 6 characters"
          />

          {error && <p className="text-danger text-sm mt-2">{error}</p>}

          <button
            disabled={loading}
            className="w-full mt-4 bg-signal text-white font-bold rounded-lg py-3 disabled:opacity-60"
          >
            {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full mt-3 text-steel text-sm font-semibold py-2"
          >
            {mode === "signin"
              ? "New team member? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
