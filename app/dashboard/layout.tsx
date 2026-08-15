import Link from "next/link";
import Image from "next/image";
import SignOutButton from "./sign-out-button";
import { getCurrentProfile } from "@/lib/getProfile";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, fullName } = await getCurrentProfile();
  const isAdmin = role === "admin";
  const isOfficeStaff = role === "admin" || role === "salesman";

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-ink px-5 pt-5 pb-4 sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/icon-96.png" alt="" width={36} height={36} className="rounded-md" />
          <div>
            <div className="text-paper font-extrabold text-base leading-tight">SolutionXperts</div>
            <div className="text-mint text-[10px] font-semibold uppercase tracking-wider">
              {fullName ? fullName : "Team Workspace"} · {role ?? ""}
            </div>
          </div>
        </div>
        <SignOutButton />
      </header>
      <div className="hazard-strip sticky top-[68px] z-20" />

      <main className="max-w-3xl mx-auto px-4 pt-4">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-line flex z-20 overflow-x-auto">
        {isOfficeStaff && <NavTab href="/dashboard" label="Overview" />}
        {isOfficeStaff && <NavTab href="/dashboard/customers" label="Customers" />}
        {isOfficeStaff && <NavTab href="/dashboard/invoices" label="Invoices" />}
        <NavTab href="/dashboard/jobs" label="Jobs" />
        {isOfficeStaff && <NavTab href="/dashboard/map" label="Map" />}
        {isAdmin && <NavTab href="/dashboard/team" label="Team" />}
      </nav>
    </div>
  );
}

function NavTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex-1 min-w-[64px] text-center py-3 text-[11px] font-bold text-neutral-500 hover:text-ink whitespace-nowrap px-1"
    >
      {label}
    </Link>
  );
}
