"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { createClient } from "@/lib/supabase/client";

type DoorLog = {
  id: string;
  lat: number;
  lng: number;
  outcome: string;
  note: string | null;
  created_at: string;
};

const OUTCOMES = [
  { key: "Answered - Interested", color: "#3A7D44" },
  { key: "Answered - Not Interested", color: "#B3261E" },
  { key: "Not Home", color: "#9C9994" },
  { key: "Callback", color: "#FF6B1A" },
  { key: "No Soliciting", color: "#1C1C1E" },
];

function colorFor(outcome: string) {
  return OUTCOMES.find((o) => o.key === outcome)?.color ?? "#9C9994";
}

function dotIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export default function MapView() {
  const supabase = createClient();
  const mapRef = useRef<L.Map | null>(null);
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [logs, setLogs] = useState<DoorLog[]>([]);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // init map once
  useEffect(() => {
    if (mapRef.current || !mapElRef.current) return;

    const map = L.map(mapElRef.current).setView([42.9834, -81.233], 12); // London, ON default
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    navigator.geolocation?.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 16),
      () => {}
    );

    loadLogs();

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // redraw markers when logs change
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();
    logs.forEach((log) => {
      L.marker([log.lat, log.lng], { icon: dotIcon(colorFor(log.outcome)) })
        .bindPopup(
          `<b>${log.outcome}</b><br>${new Date(log.created_at).toLocaleString()}${
            log.note ? `<br>${log.note}` : ""
          }`
        )
        .addTo(markersLayerRef.current!);
    });
  }, [logs]);

  async function loadLogs() {
    const { data } = await supabase
      .from("door_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLogs(data ?? []);
  }

  function startLogging() {
    setError(null);
    if (!navigator.geolocation) {
      setError("This browser can't access GPS location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setPendingCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSelectedOutcome(null);
        setNote("");
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. Check location permissions.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function confirmLog() {
    if (!pendingCoords || !selectedOutcome) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("door_logs").insert({
      lat: pendingCoords.lat,
      lng: pendingCoords.lng,
      outcome: selectedOutcome,
      note: note.trim() || null,
      created_by: user?.id,
    });

    setPendingCoords(null);
    setSelectedOutcome(null);
    setNote("");
    loadLogs();
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const doorsToday = logs.filter((l) => new Date(l.created_at) >= today).length;
  const interestedTotal = logs.filter((l) => l.outcome === "Answered - Interested").length;

  return (
    <div className="-mx-4 -mt-4">
      <div className="flex px-4 py-3 bg-white border-b border-line gap-3">
        <MiniStat label="Doors today" value={doorsToday} />
        <MiniStat label="Interested" value={interestedTotal} />
        <MiniStat label="Total logged" value={logs.length} />
      </div>
      <div className="flex flex-wrap gap-3 px-4 py-2.5 bg-white border-b border-line text-[11px] font-semibold">
        {OUTCOMES.map((o) => (
          <span key={o.key} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ background: o.color }}
            />
            {o.key}
          </span>
        ))}
      </div>

      <div className="relative">
        <div ref={mapElRef} className="h-[calc(100vh-320px)] min-h-[340px] w-full" />
        <button
          onClick={startLogging}
          disabled={locating}
          className="absolute right-4 bottom-4 z-[400] bg-signal text-white font-extrabold text-sm rounded-full px-5 py-3.5 shadow-lg disabled:opacity-70"
        >
          {locating ? "Finding you..." : "+ Log door here"}
        </button>
      </div>

      {error && <p className="text-danger text-sm px-4 py-2">{error}</p>}

      {pendingCoords && (
        <div className="fixed inset-0 bg-black/45 z-[500] flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-8 max-h-[80vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg mb-3">What happened at this door?</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {OUTCOMES.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setSelectedOutcome(o.key)}
                  className={`border-2 rounded-lg py-3 px-2 text-sm font-bold text-center ${
                    selectedOutcome === o.key
                      ? "border-signal bg-[#FFF1DF]"
                      : "border-line bg-white"
                  }`}
                >
                  {o.key}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
              className="w-full border border-line rounded-lg px-3 py-2.5 mb-3 min-h-16 bg-white"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setPendingCoords(null)}
                className="flex-1 border border-line font-bold rounded-xl py-3"
              >
                Cancel
              </button>
              <button
                onClick={confirmLog}
                disabled={!selectedOutcome}
                className="flex-1 bg-signal text-white font-bold rounded-xl py-3 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 text-center">
      <div className="text-lg font-extrabold">{value}</div>
      <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}
