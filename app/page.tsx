import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-14 h-14 rounded-xl bg-ink border border-signal/40 flex items-center justify-center text-paper font-black text-xl mb-4">
        SX
      </div>
      <h1 className="text-2xl font-extrabold mb-2">SolutionXperts</h1>
      <p className="text-neutral-500 mb-6">Team workspace — leads, quotes, and job tracking.</p>
      <Link href="/login" className="bg-signal text-white font-bold rounded-xl px-6 py-3">
        Sign in
      </Link>
    </div>
  );
}
