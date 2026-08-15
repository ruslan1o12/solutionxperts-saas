import Link from "next/link";
import SignOutButton from "./sign-out-button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      <header className="bg-ink px-5 pt-5 pb-4 sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-ink border border-signal/40 flex items-center justify-center text-paper font-black text-sm">
            SX
          </div>
          <div>
            <div className="text-paper font-extrabold text-base leading-tight">SolutionXperts</div>
            <div className="text-neutral-400 text-[10px] font-semibold uppercase tracking-wider">
              Team Workspace
            </div>
          </div>
        </div>
        <SignOutButton />
      </header>
      <div className="hazard-strip sticky top-[68px] z-20" />

      <main className="max-w-3xl mx-auto px-4 pt-4">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-line flex z-20">
        <NavTab href="/dashboard" label="Overview" />
        <NavTab href="/dashboard/customers" label="Customers" />
        <NavTab href="/dashboard/map" label="Map" />
      </nav>
    </div>
  );
}

function NavTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex-1 text-center py-3 text-xs font-bold text-neutral-500 hover:text-ink"
    >
      {label}
    </Link>
  );
}
