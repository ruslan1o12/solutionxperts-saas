import { getCurrentProfile } from "@/lib/getProfile";
import { redirect } from "next/navigation";
import Link from "next/link";

const SECTIONS = [
  {
    href: "/dashboard/team",
    title: "Team & roles",
    desc: "Manage who's admin, salesman, or technician, and per-tech photo requirements.",
  },
  {
    href: "/dashboard/settings/rate-card",
    title: "Rate card",
    desc: "Prices the AI estimator is allowed to use.",
  },
  {
    href: "/dashboard/settings/business",
    title: "Business info",
    desc: "Legal name, tax number, business number — shown on invoice PDFs.",
  },
  {
    href: "/dashboard/settings/theme",
    title: "Branding & theme",
    desc: "Logo, font, and color scheme for the whole site.",
  },
  {
    href: "/dashboard/finances",
    title: "Finances",
    desc: "Revenue, expenses, and net profit.",
  },
  {
    href: "/dashboard/team-activity",
    title: "Team activity",
    desc: "Hours worked and doors knocked, by person.",
  },
];

export default async function SettingsHubPage() {
  const { role } = await getCurrentProfile();
  if (role !== "admin") redirect("/dashboard");

  return (
    <div>
      <div className="text-xl font-extrabold mb-1">Settings</div>
      <p className="text-sm text-neutral-500 mb-4">Everything admin-only lives here.</p>

      <div className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white border border-line rounded-2xl p-4 hover:shadow-sm"
          >
            <div className="font-bold text-ink mb-1">{s.title}</div>
            <div className="text-xs text-neutral-500">{s.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
