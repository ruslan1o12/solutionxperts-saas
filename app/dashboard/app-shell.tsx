"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/app/logo";
import { usePathname } from "next/navigation";
import SignOutButton from "./sign-out-button";
import NotificationBell from "./notification-bell";

type Role = "admin" | "salesman" | "technician" | null;
type NavItem = { href: string; label: string; icon: IconName };
type IconName = "camera" | "map" | "calendar" | "grid" | "users" | "invoice" | "team" | "chart" | "clock" | "cash" | "bell" | "chat" | "gear";

export default function AppShell({
  role,
  fullName,
  logoUrl,
  children,
}: {
  role: Role;
  fullName: string | null;
  logoUrl: string | null;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const isOfficeStaff = role === "admin" || role === "salesman";
  const isAdmin = role === "admin";

  const primaryLinks: NavItem[] = [
    isOfficeStaff && { href: "/dashboard/estimator", label: "Estimator", icon: "camera" },
    isOfficeStaff && { href: "/dashboard/map", label: "Map", icon: "map" },
    { href: "/dashboard/jobs", label: "Schedule", icon: "calendar" },
  ].filter(Boolean) as NavItem[];

  const personalLinks: NavItem[] = [
    { href: "/dashboard/notifications", label: "Notifications", icon: "bell" },
    { href: "/dashboard/messages", label: "Team Chat", icon: "chat" },
    { href: "/dashboard/my-day", label: "My Day", icon: "clock" },
    { href: "/dashboard/profile", label: "My Profile", icon: "users" },
  ];

  const businessLinks: NavItem[] = [
    { href: "/dashboard", label: "Overview", icon: "grid" },
    { href: "/dashboard/customers", label: "Customers", icon: "users" },
    { href: "/dashboard/invoices", label: "Invoices", icon: "invoice" },
  ];

  const settingsLink: NavItem = { href: "/dashboard/settings", label: "Settings", icon: "gear" };

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:left-0 bg-ink z-20">
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <Logo logoUrl={logoUrl} size={38} />
          <div className="flex-1">
            <div className="text-paper font-extrabold text-base leading-tight">SolutionXperts</div>
            <div className="text-mint text-[10px] font-semibold uppercase tracking-wider">
              {fullName || "Team Workspace"} · {role ?? ""}
            </div>
          </div>
          <NotificationBell light />
        </div>
        <div className="hazard-strip" />
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Main
          </div>
          {primaryLinks.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
          <div className="px-4 pt-5 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Personal
          </div>
          {personalLinks.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
          {isOfficeStaff && (
            <>
              <div className="px-4 pt-5 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Business
              </div>
              {businessLinks.map((item) => (
                <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </>
          )}
          {isAdmin && (
            <>
              <div className="px-4 pt-5 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Admin
              </div>
              <SidebarLink item={settingsLink} active={isActive(settingsLink.href)} />
            </>
          )}
        </nav>
        <div className="p-4 border-t border-white/10">
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden bg-ink px-4 pt-5 pb-4 sticky top-0 z-20 flex items-center gap-3">
        <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="text-paper p-1 -ml-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <Logo logoUrl={logoUrl} size={34} />
        <div className="flex-1">
          <div className="text-paper font-extrabold text-base leading-tight">SolutionXperts</div>
          <div className="text-mint text-[10px] font-semibold uppercase tracking-wider">
            {fullName || "Team Workspace"} · {role ?? ""}
          </div>
        </div>
        <NotificationBell light />
      </header>
      <div className="hazard-strip sticky top-[68px] z-20 md:hidden" />

      <main className="flex-1 md:ml-64 pb-20 md:pb-10">
        <div className="max-w-3xl md:max-w-6xl mx-auto px-4 md:px-8 pt-4 md:pt-8">{children}</div>
      </main>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-line flex z-20">
        {primaryLinks.map((item) => (
          <MobileTab
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={item.href === "/dashboard/estimator" ? isActive(item.href) || pathname.includes("/estimate") : isActive(item.href)}
          />
        ))}
      </nav>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-72 max-w-[80vw] bg-white h-full flex flex-col">
            <div className="bg-ink px-5 pt-6 pb-4 flex items-center gap-3">
              <Logo logoUrl={logoUrl} size={34} />
              <div>
                <div className="text-paper font-extrabold text-sm">{fullName || "Team member"}</div>
                <div className="text-mint text-[10px] font-semibold uppercase tracking-wider">{role ?? ""}</div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="ml-auto text-paper p-1" aria-label="Close menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex-1 py-2 overflow-y-auto">
              <div className="px-5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Personal
              </div>
              {personalLinks.map((link) => (
                <DrawerLink key={link.href} link={link} active={isActive(link.href)} onClick={() => setDrawerOpen(false)} />
              ))}
              {isOfficeStaff && (
                <>
                  <div className="px-5 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Business
                  </div>
                  {businessLinks.map((link) => (
                    <DrawerLink key={link.href} link={link} active={isActive(link.href)} onClick={() => setDrawerOpen(false)} />
                  ))}
                </>
              )}
              {isAdmin && (
                <>
                  <div className="px-5 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Admin
                  </div>
                  <DrawerLink link={settingsLink} active={isActive(settingsLink.href)} onClick={() => setDrawerOpen(false)} />
                </>
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

function DrawerLink({
  link,
  active,
  onClick,
}: {
  link: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={link.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-5 py-3 font-semibold text-sm ${
        active ? "text-signal bg-[#EAF6EC]" : "text-ink"
      }`}
    >
      <NavIcon name={link.icon} />
      {link.label}
    </Link>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-semibold ${
        active ? "bg-white/10 text-white" : "text-neutral-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      <NavIcon name={item.icon} />
      {item.label}
    </Link>
  );
}

function MobileTab({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: IconName;
}) {
  return (
    <Link
      href={href}
      className={`flex-1 flex flex-col items-center gap-1 py-2.5 ${
        active ? "text-signal" : "text-neutral-400"
      }`}
    >
      <NavIcon name={icon} />
      <span className="text-[11px] font-bold">{label}</span>
    </Link>
  );
}

function NavIcon({ name }: { name: IconName }) {
  const s = "currentColor";
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none" };
  switch (name) {
    case "camera":
      return (
        <svg {...common}>
          <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" stroke={s} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="12" cy="13" r="3.5" stroke={s} strokeWidth="2" />
        </svg>
      );
    case "map":
      return (
        <svg {...common}>
          <path d="M12 21s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12Z" stroke={s} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="12" cy="9" r="2.5" stroke={s} strokeWidth="2" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" stroke={s} strokeWidth="2" />
          <path d="M3 10h18M8 3v4M16 3v4" stroke={s} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" stroke={s} strokeWidth="2" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" stroke={s} strokeWidth="2" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" stroke={s} strokeWidth="2" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" stroke={s} strokeWidth="2" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" stroke={s} strokeWidth="2" />
          <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" stroke={s} strokeWidth="2" strokeLinecap="round" />
          <path d="M16.5 4.5a3.5 3.5 0 0 1 0 7M20 20a5.5 5.5 0 0 0-4-5.3" stroke={s} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "invoice":
      return (
        <svg {...common}>
          <path d="M6 3h9l4 4v14H6z" stroke={s} strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 10h7M9 14h7M9 18h4" stroke={s} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "cash":
      return (
        <svg {...common}>
          <rect x="2.5" y="6" width="19" height="12" rx="2" stroke={s} strokeWidth="2" />
          <circle cx="12" cy="12" r="3" stroke={s} strokeWidth="2" />
        </svg>
      );
    case "team":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="3" stroke={s} strokeWidth="2" />
          <circle cx="16" cy="8" r="3" stroke={s} strokeWidth="2" />
          <path d="M2.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5M12.5 20c0-3 2.3-5.5 5.5-5.5s5.5 2.5 5.5 5.5" stroke={s} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 20V10M11 20V4M18 20v-7" stroke={s} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" stroke={s} strokeWidth="2" />
          <path d="M12 7v5l3.5 2" stroke={s} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" stroke={s} strokeWidth="2" strokeLinejoin="round" />
          <path d="M9.5 17a2.5 2.5 0 0 0 5 0" stroke={s} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M4 5h16v11H8l-4 4V5Z" stroke={s} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "gear":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" stroke={s} strokeWidth="2" />
          <path
            d="M19.4 13a7.97 7.97 0 0 0 0-2l2.1-1.6-2-3.4-2.5 1a8 8 0 0 0-1.7-1L14.9 3h-4l-.4 2.9a8 8 0 0 0-1.7 1l-2.5-1-2 3.4L6.5 11a7.97 7.97 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1a8 8 0 0 0 1.7 1l.4 2.9h4l.4-2.9a8 8 0 0 0 1.7-1l2.5 1 2-3.4L19.4 13Z"
            stroke={s}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}
