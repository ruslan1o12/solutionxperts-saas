import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/getProfile";
import EstimateClient from "./estimate-client";

export default async function EstimatePageWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { role, aiEstimatorEnabled } = await getCurrentProfile();
  if (role === "technician") redirect("/dashboard/jobs");
  if (!aiEstimatorEnabled) redirect(`/dashboard/customers/${id}/quote`);
  return <EstimateClient />;
}
