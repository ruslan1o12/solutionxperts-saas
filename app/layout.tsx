import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getThemeSettings } from "@/lib/getTheme";
import { FONT_OPTIONS } from "@/lib/theme-constants";

export const metadata: Metadata = {
  title: "SolutionXperts",
  description: "Team workspace — leads, quotes, and job tracking for SolutionXperts.",
};

export const viewport: Viewport = {
  themeColor: "#1C1C1E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getThemeSettings();
  const font = FONT_OPTIONS.find((f) => f.key === theme.fontFamily) || FONT_OPTIONS[0];

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {font.googleFont && (
          <link
            rel="stylesheet"
            href={`https://fonts.googleapis.com/css2?family=${font.googleFont}&display=swap`}
          />
        )}
        <style>{`
          :root {
            --color-signal: ${theme.primaryColor} !important;
            --color-ink: ${theme.inkColor} !important;
          }
          body { font-family: ${font.stack}; }
        `}</style>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
