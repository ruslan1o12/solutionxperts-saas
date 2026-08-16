export type FontKey = "system" | "inter" | "roboto" | "poppins" | "merriweather" | "montserrat";

export const FONT_OPTIONS: { key: FontKey; label: string; googleFont: string | null; stack: string }[] = [
  { key: "system", label: "System default", googleFont: null, stack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  { key: "inter", label: "Inter (modern)", googleFont: "Inter:wght@400;600;700;800", stack: "'Inter', sans-serif" },
  { key: "roboto", label: "Roboto (clean)", googleFont: "Roboto:wght@400;500;700;900", stack: "'Roboto', sans-serif" },
  { key: "poppins", label: "Poppins (friendly)", googleFont: "Poppins:wght@400;600;700;800", stack: "'Poppins', sans-serif" },
  { key: "montserrat", label: "Montserrat (bold)", googleFont: "Montserrat:wght@400;600;700;800", stack: "'Montserrat', sans-serif" },
  { key: "merriweather", label: "Merriweather (serif)", googleFont: "Merriweather:wght@400;700;900", stack: "'Merriweather', serif" },
];
