import { getCurrentProfile } from "@/lib/getProfile";
import { getThemeSettings } from "@/lib/getTheme";
import AppShell from "./app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, fullName } = await getCurrentProfile();
  const theme = await getThemeSettings();
  return (
    <AppShell role={role} fullName={fullName} logoUrl={theme.logoUrl}>
      {children}
    </AppShell>
  );
}
