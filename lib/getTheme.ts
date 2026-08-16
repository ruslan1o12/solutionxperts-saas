import { createClient } from "@/lib/supabase/server";

export async function getThemeSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("theme_settings").select("*").eq("id", 1).single();

  return {
    logoUrl: data?.logo_url || null,
    fontFamily: (data?.font_family as import("./theme-constants").FontKey) || "system",
    primaryColor: data?.primary_color || "#3D8B4C",
    inkColor: data?.ink_color || "#1B4332",
  };
}
