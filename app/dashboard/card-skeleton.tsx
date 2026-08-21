export default function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white border border-line rounded-2xl p-4">
          <div className="skeleton h-4 w-1/3 mb-3" />
          <div className="skeleton h-3 w-2/3 mb-2" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
