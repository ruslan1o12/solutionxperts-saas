import Link from "next/link";
import Logo from "./logo";
import { getThemeSettings } from "@/lib/getTheme";

export default async function Home() {
  const theme = await getThemeSettings();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <Logo logoUrl={theme.logoUrl} size={88} className="mb-4" />
      <h1 className="text-2xl font-extrabold mb-1">SolutionXperts</h1>
      <p className="text-sm font-semibold text-steel mb-1">Property Improvement</p>
      <p className="text-neutral-500 mb-6">Team workspace — leads, quotes, and job tracking.</p>
      <Link href="/login" className="bg-signal text-white font-bold rounded-xl px-6 py-3">
        Sign in
      </Link>
    </div>
  );
}
