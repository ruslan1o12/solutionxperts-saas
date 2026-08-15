"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[60vh] text-neutral-400 text-sm">
      Loading map...
    </div>
  ),
});

export default function MapPage() {
  return <MapView />;
}
