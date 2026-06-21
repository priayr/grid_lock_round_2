"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Circle, CircleMarker, Polyline, Tooltip, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import type { CongestionSegment, DispatchEntry, Diversion, GreenWaveSignal, Incident, Route } from "@/lib/types";

export interface MapCircle {
  id: string;
  lat: number;
  lng: number;
  color: string;
  radius_m: number;
  label?: string;
  risk?: number;
}

interface Props {
  center: [number, number];
  zoom?: number;
  circles: MapCircle[];
  congestion?: CongestionSegment[];
  incidents?: Incident[];
  selected?: Incident | null;
  diversion?: Diversion | null;
  epicenter?: { lat: number; lng: number } | null;
  activeRoute?: number;
  quarantineZone?: { lat: number; lng: number; radius_m: number } | null;
  greenWaveSignals?: GreenWaveSignal[];
  dispatchMarkers?: DispatchEntry[];
  onSelect?: (i: Incident) => void;
  onRouteSelect?: (i: number) => void;
}

const ROUTE_COLORS = ["#4f8bff", "#34c759", "#ff9f0a"];

/** A small DivIcon badge (like Google's ETA pill on a route). */
function badgeIcon(text: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      transform:translate(-50%,-50%);
      background:${color};color:#fff;font:600 11px/1 ui-sans-serif,system-ui;
      padding:5px 9px;border-radius:999px;white-space:nowrap;
      box-shadow:0 2px 10px rgba(0,0,0,.5);border:1.5px solid rgba(255,255,255,.85)">
      ${text}</div>`,
    iconSize: [0, 0],
  });
}

function pinIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;
      width:22px;height:22px;border-radius:50%;background:${color};
      border:3px solid #0a0a0c;box-shadow:0 0 0 2px ${color}88,0 0 16px ${color}">
      <span style="color:#fff;font:700 10px/1 system-ui">${label}</span></div>`,
    iconSize: [0, 0],
  });
}

function signalIcon(index: number) {
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;
      width:20px;height:20px;border-radius:6px;background:rgba(34,197,94,0.25);
      border:2px solid rgba(34,197,94,0.6);box-shadow:0 0 12px rgba(34,197,94,0.4)">
      <span style="color:#4ade80;font:700 9px/1 system-ui">${index}</span></div>`,
    iconSize: [0, 0],
  });
}

const DISPATCH_EMOJI: Record<string, string> = {
  tow_truck: "🚛",
  ambulance: "🚑",
  patrol: "🚔",
};

function dispatchIcon(resources: { type: string; count: number }[]) {
  const label = resources.map((r) => `${DISPATCH_EMOJI[r.type] || "📍"}${r.count}`).join("");
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-50%);display:flex;align-items:center;gap:2px;
      background:rgba(59,130,246,0.2);backdrop-filter:blur(4px);
      border:1.5px solid rgba(59,130,246,0.5);border-radius:999px;
      padding:4px 8px;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,.4)">
      <span style="font:600 11px/1 system-ui">${label}</span></div>`,
    iconSize: [0, 0],
  });
}

function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [center, zoom, map]);
  return null;
}

function midpoint(poly: [number, number][]): [number, number] {
  return poly[Math.floor(poly.length / 2)] ?? poly[0];
}

export default function MapView({
  center,
  zoom = 12,
  circles,
  congestion = [],
  incidents = [],
  selected,
  diversion,
  epicenter,
  activeRoute = 0,
  quarantineZone,
  greenWaveSignals = [],
  dispatchMarkers = [],
  onSelect,
  onRouteSelect,
}: Props) {
  const div = diversion ?? selected?.recommendation.diversion;
  const epi = epicenter ?? (selected ? { lat: selected.lat, lng: selected.lng } : null);

  return (
    <MapContainer center={center} zoom={zoom} zoomControl={false} attributionControl className="h-full w-full" style={{ background: "#0a0a0c" }}>
      <TileLayer 
        url={process.env.NEXT_PUBLIC_MAPPLS_KEY ? `https://apis.mappls.com/advancedmaps/v1/${process.env.NEXT_PUBLIC_MAPPLS_KEY}/still_map/{z}/{x}/{y}.png` : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}
        attribution={process.env.NEXT_PUBLIC_MAPPLS_KEY ? '&copy; Mappls, &copy; MapmyIndia' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'}
        maxZoom={18}
      />
      <Recenter center={center} zoom={zoom} />

      {/* faint risk halo */}
      {circles.map((c) => (
        <Circle
          key={c.id}
          center={[c.lat, c.lng]}
          radius={c.radius_m}
          pathOptions={{ color: c.color, fillColor: c.color, fillOpacity: 0.1, weight: 1, opacity: 0.4 }}
        >
          {(c.label || c.risk != null) && (
            <Tooltip direction="top" opacity={1} className="!border-0 !bg-transparent !shadow-none">
              <div className="rounded-lg bg-ink-800/95 px-2.5 py-1.5 text-xs text-white shadow-soft backdrop-blur">
                {c.label && <div className="font-medium">{c.label}</div>}
                {c.risk != null && <div className="text-white/60">Risk {c.risk}</div>}
              </div>
            </Tooltip>
          )}
        </Circle>
      ))}

      {/* CONGESTED ROADS — Google-traffic style: dark casing + colored road */}
      {congestion.map((s, i) => (
        <Polyline key={`cg-cas-${i}`} positions={s.polyline} pathOptions={{ color: "#000", opacity: 0.35, weight: s.weight + 3 }} />
      ))}
      {congestion.map((s, i) => (
        <Polyline key={`cg-${i}`} positions={s.polyline} pathOptions={{ color: s.color, opacity: 0.95, weight: s.weight, lineCap: "round" }} />
      ))}

      {/* DIVERSION ROUTES — bold highlighted, active one on top (Google nav style) */}
      {div?.routes.map((r: Route, i) => {
        const active = i === activeRoute;
        const col = ROUTE_COLORS[i % ROUTE_COLORS.length];
        return (
          <Polyline
            key={`rt-cas-${i}`}
            positions={r.polyline}
            pathOptions={{ color: "#ffffff", opacity: active ? 0.9 : 0.25, weight: active ? 11 : 7 }}
            eventHandlers={{ click: () => onRouteSelect?.(i) }}
          />
        );
      })}
      {div?.routes.map((r: Route, i) => {
        const active = i === activeRoute;
        const col = ROUTE_COLORS[i % ROUTE_COLORS.length];
        return (
          <Polyline
            key={`rt-${i}`}
            positions={r.polyline}
            pathOptions={{ color: col, opacity: active ? 1 : 0.5, weight: active ? 6 : 4, lineCap: "round" }}
            eventHandlers={{ click: () => onRouteSelect?.(i) }}
          >
            <Tooltip sticky opacity={1} className="!border-0 !bg-transparent !shadow-none">
              <div className="rounded-lg bg-ink-800/95 px-2.5 py-1.5 text-xs text-white shadow-soft backdrop-blur">
                Route {r.rank} · {(r.distance_m / 1000).toFixed(1)} km · {r.eta_min} min
              </div>
            </Tooltip>
          </Polyline>
        );
      })}

      {/* ETA badge on the ACTIVE diversion route */}
      {div?.routes[activeRoute] && (
        <Marker
          position={midpoint(div.routes[activeRoute].polyline)}
          icon={badgeIcon(`${div.routes[activeRoute].eta_min} min`, ROUTE_COLORS[activeRoute % ROUTE_COLORS.length])}
          interactive={false}
        />
      )}

      {/* GREEN WAVE — adaptive signal points timed along the active diversion */}
      {div?.routes[activeRoute]?.signal_plan?.signals.map((s, i) => (
        <CircleMarker
          key={`sig-${i}`}
          center={[s.lat, s.lng]}
          radius={4}
          pathOptions={{ color: "#0a0a0c", fillColor: "#34c759", fillOpacity: 1, weight: 2 }}
        >
          <Tooltip direction="top" opacity={1} className="!border-0 !bg-transparent !shadow-none">
            <div className="rounded-lg bg-ink-800/95 px-2.5 py-1.5 text-xs text-white shadow-soft backdrop-blur">
              <div className="font-medium">{s.name}</div>
              <div className="text-white/60">offset {s.offset_s}s · green {s.green_s}s</div>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}

      {/* diversion START / END pins */}
      {div && (
        <>
          <Marker position={[div.src.lat, div.src.lng]} icon={pinIcon("#34c759", "A")} interactive={false} />
          <Marker position={[div.dst.lat, div.dst.lng]} icon={pinIcon("#4f8bff", "B")} interactive={false} />
        </>
      )}

      {/* affected junctions for selected incident */}
      {selected?.affected_junctions.map((j, i) => (
        <CircleMarker key={`j-${i}`} center={[j.lat, j.lng]} radius={5} pathOptions={{ color: j.color, fillColor: j.color, fillOpacity: 0.5, weight: 1, dashArray: "2 3" }}>
          <Tooltip direction="top" opacity={1} className="!border-0 !bg-transparent !shadow-none">
            <div className="rounded-lg bg-ink-800/95 px-2.5 py-1.5 text-xs text-white shadow-soft backdrop-blur">{j.name} · risk {j.risk}</div>
          </Tooltip>
        </CircleMarker>
      ))}

      {/* live incident markers */}
      {incidents.map((inc) => {
        const active = selected?.id === inc.id;
        return (
          <CircleMarker
            key={inc.id}
            center={[inc.lat, inc.lng]}
            radius={active ? 11 : 7}
            pathOptions={{ color: "#ffffff", weight: active ? 2 : 1, fillColor: inc.color, fillOpacity: 0.95 }}
            eventHandlers={{ click: () => onSelect?.(inc) }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1} className="!border-0 !bg-transparent !shadow-none">
              <div className="rounded-lg bg-ink-800/95 px-2.5 py-1.5 text-xs text-white shadow-soft backdrop-blur">
                <div className="font-medium capitalize">{inc.cause.replace(/_/g, " ")}</div>
                <div className="text-white/60">{inc.predicted_priority} · risk {inc.risk_score}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* epicenter marker (the blockage / event point) */}
      {epi && <Marker position={[epi.lat, epi.lng]} icon={pinIcon("#e0301e", "✕")} interactive={false} />}

      {/* FLEET QUARANTINE ZONE — dashed orange circle */}
      {quarantineZone && (
        <Circle
          center={[quarantineZone.lat, quarantineZone.lng]}
          radius={quarantineZone.radius_m}
          pathOptions={{
            color: "#f97316",
            fillColor: "#f97316",
            fillOpacity: 0.06,
            weight: 2,
            opacity: 0.7,
            dashArray: "8 6",
          }}
        >
          <Tooltip direction="top" opacity={1} className="!border-0 !bg-transparent !shadow-none">
            <div className="rounded-lg bg-orange-950/90 px-2.5 py-1.5 text-xs text-orange-200 shadow-soft backdrop-blur">
              <div className="font-medium">⚠ Fleet Quarantine Zone</div>
              <div className="text-orange-300/60">{quarantineZone.radius_m}m radius · Commercial fleets rerouted</div>
            </div>
          </Tooltip>
        </Circle>
      )}

      {/* GREEN WAVE SIGNAL MARKERS — traffic light dots along the diversion */}
      {greenWaveSignals.map((sig, i) => (
        <Marker
          key={`gw-${i}`}
          position={[sig.lat, sig.lng]}
          icon={signalIcon(sig.signal_index)}
          interactive={true}
        >
          <Tooltip direction="top" opacity={1} className="!border-0 !bg-transparent !shadow-none">
            <div className="rounded-lg bg-ink-800/95 px-2.5 py-1.5 text-xs text-white shadow-soft backdrop-blur">
              <div className="font-medium text-green-300">{sig.junction_name}</div>
              <div className="text-white/60">Green: {sig.current_green_sec}s → {sig.recommended_green_sec}s (+{sig.green_extension_sec}s)</div>
            </div>
          </Tooltip>
        </Marker>
      ))}

      {/* DISPATCH RESOURCE MARKERS — staged units at high-risk corridors */}
      {dispatchMarkers.map((entry) => (
        <Marker
          key={`dp-${entry.corridor}`}
          position={[entry.lat, entry.lng]}
          icon={dispatchIcon(entry.resources)}
          interactive={true}
        >
          <Tooltip direction="top" opacity={1} className="!border-0 !bg-transparent !shadow-none">
            <div className="rounded-lg bg-ink-800/95 px-2.5 py-1.5 text-xs text-white shadow-soft backdrop-blur">
              <div className="font-medium text-blue-300">{entry.corridor}</div>
              <div className="text-white/60">Risk {entry.risk_score} · Pre-positioned resources</div>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
