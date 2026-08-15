import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/getProfile";
import EstimatorHub from "./estimator-hub";

export default async function EstimatorPage() {
  const { role } = await getCurrentProfile();
  if (role === "technician") redirect("/dashboard/jobs");
  return <EstimatorHub />;
}
