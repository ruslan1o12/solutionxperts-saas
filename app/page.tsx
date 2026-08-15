import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <Image src="/icon-192.png" alt="SolutionXperts" width={88} height={88} className="mb-4" />
      <h1 className="text-2xl font-extrabold mb-1">SolutionXperts</h1>
      <p className="text-sm font-semibold text-steel mb-1">Property Improvement</p>
      <p className="text-neutral-500 mb-6">Team workspace — leads, quotes, and job tracking.</p>
      <Link href="/login" className="bg-signal text-white font-bold rounded-xl px-6 py-3">
        Sign in
      </Link>
    </div>
  );
}
