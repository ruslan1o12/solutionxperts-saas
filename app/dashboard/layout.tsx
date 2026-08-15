import { getCurrentProfile } from "@/lib/getProfile";
import AppShell from "./app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, fullName } = await getCurrentProfile();
  return (
    <AppShell role={role} fullName={fullName}>
      {children}
    </AppShell>
  );
}
