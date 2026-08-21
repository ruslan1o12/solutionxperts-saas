"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { createClient } from "@/lib/supabase/client";
import AddressSearch from "../address-search";

type DoorLog = {
  id: string;
  lat: number;
  lng: number;
  outcome: string;
  note: string | null;
  created_at: string;
};

type WonCustomer = {
  id: string;
  name: string;
  service_type: string | null;
  lat: number;
  lng: number;
};

type Territory = {
  id: string;
  name: string;
  color: string;
  points: { lat: number; lng: number }[];
  assigned_to: string | null;
  scheduled_date: string | null;
  status: string;
};

type Option = { id: string; label: string };
type TeamLocation = { user_id: string; lat: number; lng: number; updated_at: string; name: string };

const OUTCOMES = [
  { key: "Answered - Interested", color: "#3A7D44" },
  { key: "Answered - Not Interested", color: "#B3261E" },
  { key: "Not Home", color: "#9C9994" },
  { key: "Callback", color: "#FF6B1A" },
  { key: "No Soliciting", color: "#1C1C1E" },
];

const TERRITORY_STATUS_ALPHA: Record<string, number> = {
  "Not Started": 0.12,
  "In Progress": 0.25,
  Completed: 0.35,
};

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

function houseIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:24px;height:24px;border-radius:6px;background:#2B4C6F;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:white;font-size:13px;">✓</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function meIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:22px;height:22px;">
             <div style="position:absolute;inset:0;border-radius:50%;background:#2B4C6F33;animation:sxpulse 2s infinite;"></div>
             <div style="position:absolute;top:5px;left:5px;width:12px;height:12px;border-radius:50%;background:#2B4C6F;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.5);"></div>
           </div>
           <style>@keyframes sxpulse{0%{transform:scale(0.6);opacity:1}100%{transform:scale(2.2);opacity:0}}</style>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function teamMemberIcon(initial: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;border-radius:50%;background:#FF6B1A;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:800;">${initial}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function vertexIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:10px;height:10px;border-radius:50%;background:#FF6B1A;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.5);"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

export default function MapView() {
  const supabase = createClient();
  const mapRef = useRef<L.Map | null>(null);
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const customersLayerRef = useRef<L.LayerGroup | null>(null);
  const territoriesLayerRef = useRef<L.LayerGroup | null>(null);
  const teamLocationsLayerRef = useRef<L.LayerGroup | null>(null);
  const drawLayerRef = useRef<L.LayerGroup | null>(null);
  const meMarkerRef = useRef<L.Marker | null>(null);
  const streetLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const followRef = useRef(false);
  const drawModeRef = useRef(false);
  const drawPointsRef = useRef<{ lat: number; lng: number }[]>([]);

  const [logs, setLogs] = useState<DoorLog[]>([]);
  const [wonCustomers, setWonCustomers] = useState<WonCustomer[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [showSocialProof, setShowSocialProof] = useState(true);
  const [showTerritories, setShowTerritories] = useState(true);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressQuery, setAddressQuery] = useState("");
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [layerMode, setLayerMode] = useState<"street" | "satellite">("street");
  const [following, setFollowing] = useState(false);
  const [isOfficeStaff, setIsOfficeStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [teamOptions, setTeamOptions] = useState<Option[]>([]);
  const [drawMode, setDrawMode] = useState(false);
  const [drawPointCount, setDrawPointCount] = useState(0);
  const [teamLocations, setTeamLocations] = useState<TeamLocation[]>([]);
  const [showTeamLocations, setShowTeamLocations] = useState(true);
  const [territoryForm, setTerritoryForm] = useState<{ points: { lat: number; lng: number }[] } | null>(null);
  const [territoryName, setTerritoryName] = useState("");
  const [territoryColor, setTerritoryColor] = useState("#2B4C6F");
  const [territoryAssignee, setTerritoryAssignee] = useState("");
  const [territoryDate, setTerritoryDate] = useState("");

  useEffect(() => {
    followRef.current = following;
  }, [following]);

  useEffect(() => {
    drawModeRef.current = drawMode;
  }, [drawMode]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const role = data?.role;
      setIsOfficeStaff(role === "admin" || role === "salesman");
      setIsAdmin(role === "admin");

      const { data: profiles } = await supabase.from("profiles").select("id, full_name");
      setTeamOptions((profiles ?? []).map((p) => ({ id: p.id, label: p.full_name || "Unnamed" })));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Broadcast a rough "last known location" every ~30s while this page is
  // open, so admins can see where the team is without needing "follow me" on.
  useEffect(() => {
    if (!navigator.geolocation) return;
    let cancelled = false;

    function broadcast() {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;
          await supabase.from("user_locations").upsert({
            user_id: user.id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            updated_at: new Date().toISOString(),
          });
        },
        () => {},
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
      );
    }

    broadcast();
    const interval = setInterval(broadcast, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Admin-only: poll everyone else's last known location.
  useEffect(() => {
    if (!isAdmin) return;

    async function loadTeamLocations() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const [{ data: locations }, { data: profiles }] = await Promise.all([
        supabase.from("user_locations").select("*"),
        supabase.from("profiles").select("id, full_name"),
      ]);
      const nameById: Record<string, string> = {};
      (profiles ?? []).forEach((p) => (nameById[p.id] = p.full_name || "Team member"));
      setTeamLocations(
        (locations ?? [])
          .filter((l) => l.user_id !== user?.id)
          .map((l) => ({ ...l, name: nameById[l.user_id] || "Team member" }))
      );
    }

    loadTeamLocations();
    const interval = setInterval(loadTeamLocations, 25000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (mapRef.current || !mapElRef.current) return;

    const map = L.map(mapElRef.current, { attributionControl: false }).setView([42.9834, -81.233], 12);

    streetLayerRef.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);
    satelliteLayerRef.current = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19 }
    );

    L.control.attribution({ position: "bottomleft", prefix: false }).addAttribution("© OpenStreetMap, Esri").addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    customersLayerRef.current = L.layerGroup().addTo(map);
    territoriesLayerRef.current = L.layerGroup().addTo(map);
    teamLocationsLayerRef.current = L.layerGroup().addTo(map);
    drawLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    navigator.geolocation?.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 16),
      () => {}
    );

    function handleMapClick(e: L.LeafletMouseEvent) {
      if (!drawModeRef.current) return;
      drawPointsRef.current = [...drawPointsRef.current, { lat: e.latlng.lat, lng: e.latlng.lng }];
      setDrawPointCount(drawPointsRef.current.length);
      redrawDraft();
    }

    function redrawDraft() {
      if (!drawLayerRef.current) return;
      drawLayerRef.current.clearLayers();
      const pts = drawPointsRef.current;
      pts.forEach((p) => {
        L.marker([p.lat, p.lng], { icon: vertexIcon() }).addTo(drawLayerRef.current!);
      });
      if (pts.length > 1) {
        L.polyline(
          pts.map((p) => [p.lat, p.lng]),
          { color: "#FF6B1A", weight: 3, dashArray: "6,6" }
        ).addTo(drawLayerRef.current!);
      }
    }

    // Long-press (mobile) or right-click (desktop) to manually log a door at that spot.
    // Leaflet fires "contextmenu" for both — reliable cross-platform long-press signal.
    function handleLongPress(e: L.LeafletMouseEvent) {
      if (drawModeRef.current) return;
      if (e.originalEvent) e.originalEvent.preventDefault();
      setPendingLabel(null);
      setPendingCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      setSelectedOutcome(null);
      setNote("");
    }
    map.on("contextmenu", handleLongPress);
    map.on("click", handleMapClick);

    // If the user drags the map manually, stop auto-following — same behavior as Google Maps
    map.on("dragstart", () => {
      if (followRef.current) setFollowing(false);
    });

    loadLogs();
    loadWonCustomers();
    loadTerritories();

    return () => {
      map.off("contextmenu", handleLongPress);
      map.off("click", handleMapClick);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow-me: live location tracking with a Google-Maps-style blue dot
  useEffect(() => {
    if (!mapRef.current) return;
    if (following) {
      if (!navigator.geolocation) {
        setError("This browser can't access GPS location.");
        setFollowing(false);
        return;
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          if (!meMarkerRef.current) {
            meMarkerRef.current = L.marker(latlng, { icon: meIcon(), zIndexOffset: 1000 }).addTo(mapRef.current!);
          } else {
            meMarkerRef.current.setLatLng(latlng);
          }
          if (followRef.current) {
            mapRef.current!.setView(latlng, mapRef.current!.getZoom() < 15 ? 17 : mapRef.current!.getZoom(), {
              animate: true,
            });
          }
        },
        () => setError("Couldn't get live location. Check location permissions."),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    } else if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [following]);

  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();
    logs.forEach((log) => {
      const marker = L.marker([log.lat, log.lng], { icon: dotIcon(colorFor(log.outcome)) });
      const container = document.createElement("div");
      container.innerHTML = `<b>${log.outcome}</b><br>${new Date(log.created_at).toLocaleString()}${
        log.note ? `<br>${log.note}` : ""
      }<br>`;
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete this pin";
      delBtn.style.cssText =
        "margin-top:6px;color:#B3261E;font-weight:700;font-size:12px;background:none;border:none;cursor:pointer;padding:0;";
      delBtn.onclick = async () => {
        if (!confirm("Delete this door log pin?")) return;
        await supabase.from("door_logs").delete().eq("id", log.id);
        loadLogs();
        marker.closePopup();
      };
      container.appendChild(delBtn);
      marker.bindPopup(container);
      marker.addTo(markersLayerRef.current!);
    });
  }, [logs]);

  useEffect(() => {
    if (!customersLayerRef.current) return;
    customersLayerRef.current.clearLayers();
    if (!showSocialProof) return;
    wonCustomers.forEach((c) => {
      L.marker([c.lat, c.lng], { icon: houseIcon() })
        .bindPopup(
          `<b>${c.name}</b><br>${c.service_type || "Completed job"}<br><span style="color:#2F8F4E">✓ Happy customer nearby</span>`
        )
        .addTo(customersLayerRef.current!);
    });
  }, [wonCustomers, showSocialProof]);

  useEffect(() => {
    if (!territoriesLayerRef.current) return;
    territoriesLayerRef.current.clearLayers();
    if (!showTerritories) return;
    territories.forEach((t) => {
      if (t.points.length < 3) return;
      const assigneeName = teamOptions.find((o) => o.id === t.assigned_to)?.label;
      const polygon = L.polygon(
        t.points.map((p) => [p.lat, p.lng]),
        {
          color: t.color,
          weight: 2,
          fillColor: t.color,
          fillOpacity: TERRITORY_STATUS_ALPHA[t.status] ?? 0.15,
        }
      );

      const container = document.createElement("div");
      container.innerHTML = `<b>${t.name}</b><br>Status: ${t.status}<br>${
        assigneeName ? `Assigned: ${assigneeName}<br>` : "Unassigned<br>"
      }${t.scheduled_date ? `Scheduled: ${t.scheduled_date}<br>` : ""}`;

      const cycleBtn = document.createElement("button");
      const nextStatus: Record<string, string> = {
        "Not Started": "In Progress",
        "In Progress": "Completed",
        Completed: "Not Started",
      };
      cycleBtn.textContent = `Mark as ${nextStatus[t.status]}`;
      cycleBtn.style.cssText =
        "margin-top:6px;margin-right:10px;color:#2B4C6F;font-weight:700;font-size:12px;background:none;border:none;cursor:pointer;padding:0;";
      cycleBtn.onclick = async () => {
        await supabase.from("territories").update({ status: nextStatus[t.status] }).eq("id", t.id);
        loadTerritories();
        polygon.closePopup();
      };
      container.appendChild(cycleBtn);

      if (isAdmin) {
        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete area";
        delBtn.style.cssText =
          "margin-top:6px;color:#B3261E;font-weight:700;font-size:12px;background:none;border:none;cursor:pointer;padding:0;";
        delBtn.onclick = async () => {
          if (!confirm(`Delete the "${t.name}" area?`)) return;
          await supabase.from("territories").delete().eq("id", t.id);
          loadTerritories();
          polygon.closePopup();
        };
        container.appendChild(delBtn);
      }

      polygon.bindPopup(container);
      polygon.addTo(territoriesLayerRef.current!);
    });
  }, [territories, showTerritories, teamOptions, isAdmin]);

  useEffect(() => {
    if (!teamLocationsLayerRef.current) return;
    teamLocationsLayerRef.current.clearLayers();
    if (!isAdmin || !showTeamLocations) return;
    teamLocations.forEach((loc) => {
      const minsAgo = Math.round((Date.now() - new Date(loc.updated_at).getTime()) / 60000);
      const initial = loc.name.charAt(0).toUpperCase();
      L.marker([loc.lat, loc.lng], { icon: teamMemberIcon(initial), zIndexOffset: 900 })
        .bindPopup(
          `<b>${loc.name}</b><br>Last seen ${minsAgo < 1 ? "just now" : `${minsAgo} min ago`}`
        )
        .addTo(teamLocationsLayerRef.current!);
    });
  }, [teamLocations, showTeamLocations, isAdmin]);

  async function loadLogs() {
    const { data } = await supabase
      .from("door_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLogs(data ?? []);
  }

  async function loadWonCustomers() {
    const { data } = await supabase
      .from("customers")
      .select("id, name, service_type, lat, lng")
      .eq("status", "Done")
      .not("lat", "is", null)
      .not("lng", "is", null)
      .limit(500);
    setWonCustomers((data ?? []) as WonCustomer[]);
  }

  async function loadTerritories() {
    const { data } = await supabase.from("territories").select("*").limit(200);
    setTerritories((data ?? []) as Territory[]);
  }

  function toggleLayer() {
    if (!mapRef.current || !streetLayerRef.current || !satelliteLayerRef.current) return;
    if (layerMode === "street") {
      mapRef.current.removeLayer(streetLayerRef.current);
      satelliteLayerRef.current.addTo(mapRef.current);
      setLayerMode("satellite");
    } else {
      mapRef.current.removeLayer(satelliteLayerRef.current);
      streetLayerRef.current.addTo(mapRef.current);
      setLayerMode("street");
    }
  }

  function toggleFollow() {
    setError(null);
    setFollowing((f) => !f);
  }

  function startLoggingGps() {
    setError(null);
    if (!navigator.geolocation) {
      setError("This browser can't access GPS location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setPendingLabel(null);
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

  function selectSearchedAddress(r: { label: string; lat: number; lng: number }) {
    mapRef.current?.setView([r.lat, r.lng], 18);
    setPendingLabel(r.label);
    setPendingCoords({ lat: r.lat, lng: r.lng });
    setSelectedOutcome(null);
    setNote("");
    setShowAddressSearch(false);
    setAddressQuery("");
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
      note: pendingLabel ? `${pendingLabel}${note ? " — " + note : ""}` : note.trim() || null,
      created_by: user?.id,
    });

    setPendingCoords(null);
    setPendingLabel(null);
    setSelectedOutcome(null);
    setNote("");
    loadLogs();
  }

  function startDrawing() {
    drawPointsRef.current = [];
    setDrawPointCount(0);
    setDrawMode(true);
    drawLayerRef.current?.clearLayers();
  }

  function cancelDrawing() {
    setDrawMode(false);
    drawPointsRef.current = [];
    setDrawPointCount(0);
    drawLayerRef.current?.clearLayers();
  }

  function finishDrawing() {
    if (drawPointsRef.current.length < 3) {
      setError("Tap at least 3 points to outline an area.");
      return;
    }
    setTerritoryForm({ points: drawPointsRef.current });
    setTerritoryName("");
    setTerritoryColor("#2B4C6F");
    setTerritoryAssignee("");
    setTerritoryDate("");
    setDrawMode(false);
  }

  async function saveTerritory() {
    if (!territoryForm || !territoryName.trim()) {
      setError("Give the area a name.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("territories").insert({
      name: territoryName.trim(),
      color: territoryColor,
      points: territoryForm.points,
      assigned_to: territoryAssignee || null,
      scheduled_date: territoryDate || null,
      status: "Not Started",
      created_by: user?.id,
    });

    setTerritoryForm(null);
    drawPointsRef.current = [];
    setDrawPointCount(0);
    drawLayerRef.current?.clearLayers();
    loadTerritories();
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
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: o.color }} />
            {o.key}
          </span>
        ))}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showSocialProof}
            onChange={(e) => setShowSocialProof(e.target.checked)}
            className="w-3.5 h-3.5"
          />
          <span className="w-2.5 h-2.5 rounded bg-steel inline-block" />
          Happy customers ({wonCustomers.length})
        </label>
        <label className="flex items-center gap-1.5 ml-auto cursor-pointer">
          <input
            type="checkbox"
            checked={showTerritories}
            onChange={(e) => setShowTerritories(e.target.checked)}
            className="w-3.5 h-3.5"
          />
          Areas ({territories.length})
        </label>
        {isAdmin && (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showTeamLocations}
              onChange={(e) => setShowTeamLocations(e.target.checked)}
              className="w-3.5 h-3.5"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B1A] inline-block" />
            Team ({teamLocations.length})
          </label>
        )}
      </div>

      {showAddressSearch && (
        <div className="px-4 py-2.5 bg-white border-b border-line">
          <AddressSearch
            value={addressQuery}
            onChange={setAddressQuery}
            onSelect={selectSearchedAddress}
            placeholder="Search an address to log manually..."
          />
        </div>
      )}

      <div className="relative">
        <div ref={mapElRef} className="h-[calc(100vh-320px)] min-h-[340px] w-full" />

        {drawMode ? (
          <p className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-signal text-white text-[11px] font-bold px-3 py-1.5 rounded-full max-w-[90%] text-center pointer-events-none whitespace-nowrap">
            Tap points to outline the area ({drawPointCount} placed)
          </p>
        ) : (
          <p className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-black/70 text-white text-[10px] font-semibold px-3 py-1.5 rounded-full max-w-[85%] text-center pointer-events-none whitespace-nowrap">
            Tap &amp; hold the map to log a door
          </p>
        )}

        <div className="absolute right-3 top-3 z-[400] flex flex-col gap-2 items-end">
          <button
            onClick={toggleLayer}
            className="bg-white border border-line text-ink font-bold text-xs rounded-full px-3 py-2 shadow-lg"
          >
            {layerMode === "street" ? "🛰️ Satellite" : "🗺️ Streets"}
          </button>
          <button
            onClick={toggleFollow}
            className={`font-bold text-xs rounded-full px-3 py-2 shadow-lg ${
              following ? "bg-signal text-white" : "bg-white border border-line text-ink"
            }`}
          >
            {following ? "📍 Following" : "📍 Follow me"}
          </button>
        </div>

        {isOfficeStaff && !drawMode && (
          <div className="absolute left-3 bottom-8 z-[400]">
            <button
              onClick={startDrawing}
              className="bg-ink text-paper font-bold text-xs rounded-full px-4 py-2.5 shadow-lg"
            >
              + Draw new area
            </button>
          </div>
        )}

        {drawMode && (
          <div className="absolute left-3 bottom-8 z-[400] flex gap-2">
            <button onClick={cancelDrawing} className="bg-white border border-line text-ink font-bold text-xs rounded-full px-4 py-2.5 shadow-lg">
              Cancel
            </button>
            <button onClick={finishDrawing} className="bg-signal text-white font-bold text-xs rounded-full px-4 py-2.5 shadow-lg">
              Finish area
            </button>
          </div>
        )}

        <div className="absolute right-3 bottom-8 z-[400] flex flex-col gap-2 items-end">
          <button
            onClick={() => setShowAddressSearch((v) => !v)}
            className="bg-white border border-line text-ink font-bold text-xs rounded-full px-4 py-2.5 shadow-lg"
          >
            {showAddressSearch ? "Hide address search" : "Search address"}
          </button>
          <button
            onClick={startLoggingGps}
            disabled={locating}
            className="bg-signal text-white font-extrabold text-sm rounded-full px-5 py-3.5 shadow-lg disabled:opacity-70"
          >
            {locating ? "Finding you..." : "+ Log door here"}
          </button>
        </div>
      </div>

      {error && <p className="text-danger text-sm px-4 py-2">{error}</p>}

      {pendingCoords && (
        <div className="fixed inset-0 bg-black/45 z-[500] flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-8 max-h-[80vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg mb-1">What happened at this door?</h3>
            {pendingLabel && <p className="text-xs text-neutral-500 mb-3">{pendingLabel}</p>}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {OUTCOMES.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setSelectedOutcome(o.key)}
                  className={`border-2 rounded-lg py-3 px-2 text-sm font-bold text-center ${
                    selectedOutcome === o.key ? "border-signal bg-[#FFF1DF]" : "border-line bg-white"
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
                onClick={() => { setPendingCoords(null); setPendingLabel(null); }}
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

      {territoryForm && (
        <div className="fixed inset-0 bg-black/45 z-[500] flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-8 max-h-[80vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg mb-3">New area</h3>

            <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">Name</label>
            <input
              value={territoryName}
              onChange={(e) => setTerritoryName(e.target.value)}
              placeholder="e.g. Oakridge — West block"
              className="w-full border border-line rounded-lg px-3 py-2.5 mb-3"
            />

            <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">Color</label>
            <input
              type="color"
              value={territoryColor}
              onChange={(e) => setTerritoryColor(e.target.value)}
              className="w-16 h-10 rounded border border-line mb-3"
            />

            <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
              Assign to (optional)
            </label>
            <select
              value={territoryAssignee}
              onChange={(e) => setTerritoryAssignee(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2.5 mb-3"
            >
              <option value="">Unassigned</option>
              {teamOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>

            <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
              Scheduled date (optional)
            </label>
            <input
              type="date"
              value={territoryDate}
              onChange={(e) => setTerritoryDate(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2.5 mb-4"
            />

            {error && <p className="text-danger text-sm mb-2">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setTerritoryForm(null)}
                className="flex-1 border border-line font-bold rounded-xl py-3"
              >
                Cancel
              </button>
              <button onClick={saveTerritory} className="flex-1 bg-signal text-white font-bold rounded-xl py-3">
                Save area
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
