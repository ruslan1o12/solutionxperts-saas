"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import SignOutButton from "./sign-out-button";

type Role = "admin" | "salesman" | "technician" | null;

export default function AppShell({
  role,
  fullName,
  children,
}: {
  role: Role;
  fullName: string | null;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const isOfficeStaff = role === "admin" || role === "salesman";
  const isAdmin = role === "admin";

  const secondaryLinks = [
    isOfficeStaff && { href: "/dashboard", label: "Overview" },
    isOfficeStaff && { href: "/dashboard/customers", label: "Customers" },
    isOfficeStaff && { href: "/dashboard/invoices", label: "Invoices" },
    isAdmin && { href: "/dashboard/team", label: "Team & rate card" },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-ink px-4 pt-5 pb-4 sticky top-0 z-20 flex items-center gap-3">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="text-paper p-1 -ml-1"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <Image src="/icon-96.png" alt="" width={34} height={34} className="rounded-md" />
        <div className="flex-1">
          <div className="text-paper font-extrabold text-base leading-tight">SolutionXperts</div>
          <div className="text-mint text-[10px] font-semibold uppercase tracking-wider">
            {fullName || "Team Workspace"} · {role ?? ""}
          </div>
        </div>
      </header>
      <div className="hazard-strip sticky top-[68px] z-20" />

      <main className="max-w-3xl mx-auto px-4 pt-4">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-line flex z-20">
        {isOfficeStaff && (
          <PrimaryTab href="/dashboard/estimator" label="Estimator" active={pathname.startsWith("/dashboard/estimator") || pathname.includes("/estimate")} icon="camera" />
        )}
        {isOfficeStaff && (
          <PrimaryTab href="/dashboard/map" label="Map" active={pathname.startsWith("/dashboard/map")} icon="map" />
        )}
        <PrimaryTab href="/dashboard/jobs" label="Schedule" active={pathname.startsWith("/dashboard/jobs")} icon="calendar" />
      </nav>

      {drawerOpen && (
        <div className="fixed inset-0 z-30 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-white h-full flex flex-col">
            <div className="bg-ink px-5 pt-6 pb-4 flex items-center gap-3">
              <Image src="/icon-96.png" alt="" width={34} height={34} className="rounded-md" />
              <div>
                <div className="text-paper font-extrabold text-sm">{fullName || "Team member"}</div>
                <div className="text-mint text-[10px] font-semibold uppercase tracking-wider">
                  {role ?? ""}
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="ml-auto text-paper p-1"
                aria-label="Close menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 py-2">
              {secondaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`block px-5 py-3.5 font-semibold text-sm ${
                    pathname === link.href ? "text-signal bg-[#EAF6EC]" : "text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {secondaryLinks.length === 0 && (
                <p className="px-5 py-3 text-sm text-neutral-400">Nothing here for your role.</p>
              )}
            </div>

            <div className="p-4 border-t border-line">
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PrimaryTab({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: "camera" | "map" | "calendar";
}) {
  return (
    <Link
      href={href}
      className={`flex-1 flex flex-col items-center gap-1 py-2.5 ${
        active ? "text-signal" : "text-neutral-400"
      }`}
    >
      <TabIcon name={icon} />
      <span className="text-[11px] font-bold">{label}</span>
    </Link>
  );
}

function TabIcon({ name }: { name: "camera" | "map" | "calendar" }) {
  const stroke = "currentColor";
  if (name === "camera") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="13" r="3.5" stroke={stroke} strokeWidth="2" />
      </svg>
    );
  }
  if (name === "map") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 21s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="9" r="2.5" stroke={stroke} strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke={stroke} strokeWidth="2" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
