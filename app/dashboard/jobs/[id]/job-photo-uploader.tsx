"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function resizeImage(file: File, maxWidth = 1280, quality = 0.8): Promise<{ blob: Blob; dataUrl: string }> {
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
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        canvas.toBlob((blob) => (blob ? resolve({ blob, dataUrl }) : reject(new Error("toBlob failed"))), "image/jpeg", quality);
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function JobPhotoUploader({
  jobId,
  phase,
  onVerifiedCountChange,
}: {
  jobId: string;
  phase: "before" | "after";
  onVerifiedCountChange?: (count: number) => void;
}) {
  const supabase = createClient();
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [lastResult, setLastResult] = useState<{ verified: boolean; reason: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("job_photos")
        .select("id", { count: "exact", head: true })
        .eq("job_id", jobId)
        .eq("phase", phase)
        .eq("ai_verified", true);
      const c = count ?? 0;
      setVerifiedCount(c);
      onVerifiedCountChange?.(c);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, phase]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    setLastResult(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    try {
      for (const file of Array.from(files)) {
        const { blob, dataUrl } = await resizeImage(file);
        const path = `${jobId}/${phase}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("job-photos")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;

        const { data: photoRow, error: insertError } = await supabase
          .from("job_photos")
          .insert({ job_id: jobId, phase, storage_path: path, uploaded_by: user?.id })
          .select()
          .single();
        if (insertError) throw insertError;

        const verifyRes = await fetch("/api/verify-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: dataUrl, phase }),
        });
        const verifyData = await verifyRes.json();
        setLastResult(verifyData);

        await supabase
          .from("job_photos")
          .update({ ai_verified: !!verifyData.verified, ai_note: verifyData.reason })
          .eq("id", photoRow.id);

        if (verifyData.verified) {
          setVerifiedCount((c) => {
            const next = c + 1;
            onVerifiedCountChange?.(next);
            return next;
          });
        } else {
          setRejectedCount((c) => c + 1);
        }
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
        {verifiedCount > 0 && <span className="text-xs font-bold text-good">{verifiedCount} verified ✓</span>}
      </div>
      <p className="text-xs text-neutral-500 mb-3">
        Take 1–2 minimum, {phase === "before" ? "wide shots of the area before starting" : "the same angles as your before photos"}.
        Each photo is checked automatically.
      </p>
      <label className="block text-center border-2 border-dashed border-line rounded-xl py-4 text-steel font-bold text-sm cursor-pointer">
        {uploading ? "Checking photo..." : `+ Add ${phase} photos`}
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
      {lastResult && !lastResult.verified && (
        <p className="text-danger text-xs mt-2">
          Last photo rejected: {lastResult.reason} — try again.
        </p>
      )}
      {rejectedCount > 0 && lastResult?.verified && (
        <p className="text-neutral-500 text-xs mt-2">{rejectedCount} earlier photo(s) didn&apos;t pass.</p>
      )}
      {error && <p className="text-danger text-xs mt-2">{error}</p>}
    </div>
  );
}
