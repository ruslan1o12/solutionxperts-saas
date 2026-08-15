import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/getProfile";
import FinancesClient from "./finances-client";

export default async function FinancesPage() {
  const { role } = await getCurrentProfile();
  if (role !== "admin") redirect("/dashboard");
  return <FinancesClient />;
}
