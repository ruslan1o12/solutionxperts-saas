import { getCurrentProfile } from "@/lib/getProfile";
import { getThemeSettings } from "@/lib/getTheme";
import { redirect } from "next/navigation";
import Link from "next/link";
import ThemeEditor from "./theme-editor";

export default async function ThemeSettingsPage() {
  const { role } = await getCurrentProfile();
  if (role !== "admin") redirect("/dashboard");

  const theme = await getThemeSettings();

  return (
    <div>
      <Link href="/dashboard/team" className="text-steel font-bold text-sm">
        ← Back to Team
      </Link>
      <div className="text-xl font-extrabold mt-3 mb-1">Branding & theme</div>
      <p className="text-sm text-neutral-500 mb-4">Changes apply across the whole site instantly.</p>
      <ThemeEditor initial={theme} />
    </div>
  );
}
