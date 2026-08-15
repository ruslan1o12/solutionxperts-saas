import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/getProfile";
import MapClient from "./map-client";

export default async function MapPage() {
  const { role } = await getCurrentProfile();
  if (role === "technician") redirect("/dashboard/jobs");
  return <MapClient />;
}
