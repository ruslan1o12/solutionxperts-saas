import { createClient } from "@/lib/supabase/server";

export default async function JobPhotoGallery({ jobId }: { jobId: string }) {
  const supabase = await createClient();
  const { data: photos } = await supabase
    .from("job_photos")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  // RLS returns nothing for non-admins, so this section naturally disappears for them.
  if (!photos || photos.length === 0) return null;

  const withUrls = await Promise.all(
    photos.map(async (p) => {
      const { data } = await supabase.storage
        .from("job-photos")
        .createSignedUrl(p.storage_path, 60 * 60);
      return { ...p, url: data?.signedUrl };
    })
  );

  const before = withUrls.filter((p) => p.phase === "before");
  const after = withUrls.filter((p) => p.phase === "after");

  return (
    <div className="bg-white border border-line rounded-2xl p-4 mt-4">
      <div className="text-xs font-extrabold uppercase tracking-wide text-steel mb-3">
        Job photos (admin only)
      </div>
      {before.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] font-bold text-neutral-500 uppercase mb-1.5">Before</div>
          <div className="grid grid-cols-3 gap-2">
            {before.map((p) =>
              p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.url} alt="Before" className="aspect-square object-cover rounded-lg border border-line" />
              ) : null
            )}
          </div>
        </div>
      )}
      {after.length > 0 && (
        <div>
          <div className="text-[11px] font-bold text-neutral-500 uppercase mb-1.5">After</div>
          <div className="grid grid-cols-3 gap-2">
            {after.map((p) =>
              p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.url} alt="After" className="aspect-square object-cover rounded-lg border border-line" />
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}
