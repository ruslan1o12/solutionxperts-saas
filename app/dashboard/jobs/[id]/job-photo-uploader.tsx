"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function resizeImage(file: File, maxWidth = 1280, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/jpeg", quality);
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function JobPhotoUploader({ jobId, phase }: { jobId: string; phase: "before" | "after" }) {
  const supabase = createClient();
  const [count, setCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    try {
      for (const file of Array.from(files)) {
        const blob = await resizeImage(file);
        const path = `${jobId}/${phase}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("job-photos")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase.from("job_photos").insert({
          job_id: jobId,
          phase,
          storage_path: path,
          uploaded_by: user?.id,
        });
        if (insertError) throw insertError;

        setCount((c) => c + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed — try again.");
    }
    setUploading(false);
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-sm capitalize">{phase} photos</div>
        {count > 0 && <span className="text-xs font-bold text-good">{count} uploaded ✓</span>}
      </div>
      <p className="text-xs text-neutral-500 mb-3">
        Take 1–2 minimum, {phase === "before" ? "wide shots of the area before starting" : "the same angles as your before photos"}.
      </p>
      <label className="block text-center border-2 border-dashed border-line rounded-xl py-4 text-steel font-bold text-sm cursor-pointer">
        {uploading ? "Uploading..." : `+ Add ${phase} photos`}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </label>
      {error && <p className="text-danger text-xs mt-2">{error}</p>}
    </div>
  );
}
