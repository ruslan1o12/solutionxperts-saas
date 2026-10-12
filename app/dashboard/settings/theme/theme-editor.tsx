"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FONT_OPTIONS, type FontKey } from "@/lib/theme-constants";

// WCAG-ish relative luminance check — anything above this is too light to
// reliably show white text on top of.
function isTooLight(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.6;
}

export default function ThemeEditor({
  initial,
}: {
  initial: { logoUrl: string | null; fontFamily: FontKey; primaryColor: string; inkColor: string };
}) {
  const router = useRouter();
  const supabase = createClient();
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [fontFamily, setFontFamily] = useState<FontKey>(initial.fontFamily);
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [inkColor, setInkColor] = useState(initial.inkColor);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogoUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("branding")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    }
    setUploading(false);
  }

  async function save() {
    setSaving(true);
    setError(null);

    // Buttons and your own chat messages show WHITE text on top of this color
    // throughout the app — if it's too light, that text becomes unreadable
    // everywhere at once. Block it here instead of letting it ship silently.
    if (isTooLight(primaryColor)) {
      setSaving(false);
      setError(
        "That primary color is too light — white button text would become invisible across the whole app. Pick something darker."
      );
      return;
    }
    if (isTooLight(inkColor)) {
      setSaving(false);
      setError(
        "That dark/header color is too light — white text in the header and elsewhere would become invisible. Pick something darker."
      );
      return;
    }

    const { error } = await supabase
      .from("theme_settings")
      .update({
        logo_url: logoUrl,
        font_family: fontFamily,
        primary_color: primaryColor,
        ink_color: inkColor,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) return setError(error.message);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="max-w-lg">
      <div className="bg-white border border-line rounded-2xl p-4 mb-4">
        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-2">
          Logo
        </label>
        <div className="flex items-center gap-4 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl || "/icon-192.png"}
            alt="Current logo"
            className="w-16 h-16 rounded-lg object-cover border border-line"
          />
          <label className="border border-dashed border-line rounded-xl px-4 py-2.5 text-steel font-bold text-sm cursor-pointer">
            {uploading ? "Uploading..." : "Upload new logo"}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => handleLogoUpload(e.target.files?.[0])}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-xs text-neutral-500">PNG with transparent background works best.</p>
      </div>

      <div className="bg-white border border-line rounded-2xl p-4 mb-4">
        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-2">
          Font
        </label>
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value as FontKey)}
          className="w-full border border-line rounded-lg px-3 py-2.5"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-line rounded-2xl p-4 mb-4">
        <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-2">
          Colors
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-neutral-500 block mb-1">Primary / buttons</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded border border-line"
              />
              <input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 border border-line rounded-lg px-2 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <span className="text-xs text-neutral-500 block mb-1">Dark / header</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={inkColor}
                onChange={(e) => setInkColor(e.target.value)}
                className="w-10 h-10 rounded border border-line"
              />
              <input
                value={inkColor}
                onChange={(e) => setInkColor(e.target.value)}
                className="flex-1 border border-line rounded-lg px-2 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-danger text-sm mb-3">{error}</p>}

      <button
        onClick={save}
        disabled={saving || uploading}
        className="w-full bg-signal text-white font-bold rounded-xl py-3 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save & apply site-wide"}
      </button>
      {saved && (
        <p className="text-good text-xs font-bold text-center mt-2">
          Saved ✓ Refresh to see it everywhere.
        </p>
      )}
    </div>
  );
}
