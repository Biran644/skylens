"use client";

import type { MapViewState } from "@deck.gl/core";
import { PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import DeckGL from "@deck.gl/react";
import { luma } from "@luma.gl/core";
import { webgl2Adapter } from "@luma.gl/webgl";
import { useEffect, useMemo, useState } from "react";
import { Map } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  TrajectoryMapConflictPoint,
  TrajectoryMapData,
  TrajectoryMapPath,
} from "../../backend/types/domain";

export type LayerKey = "Trajectories" | "Conflicts" | "Hotspots";

type TrajectoryDeckMapProps = {
  mapData?: TrajectoryMapData | null;
  activeLayers: LayerKey[];
  activeMinute?: number | null;
};

let webglConfigured = false;

const ensureWebGL = () => {
  if (webglConfigured || typeof window === "undefined") {
    return;
  }

  luma.registerAdapters([webgl2Adapter]);
  luma.setDefaultDeviceProps({ type: "webgl", adapters: [webgl2Adapter] });
  webglConfigured = true;
};

if (typeof window !== "undefined") {
  ensureWebGL();
}

const BASEMAP_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const DEFAULT_VIEW_STATE: MapViewState = {
  longitude: -95,
  latitude: 55,
  zoom: 3.5,
  pitch: 0,
  bearing: 0,
};

const clampZoom = (zoom: number) => Math.min(Math.max(zoom, 2.2), 14);

const isPath = (value: unknown): value is TrajectoryMapPath => {
  return Array.isArray((value as TrajectoryMapPath | undefined)?.coordinates);
};

const isConflict = (value: unknown): value is TrajectoryMapConflictPoint => {
  return Array.isArray(
    (value as TrajectoryMapConflictPoint | undefined)?.flights,
  );
};

export function TrajectoryDeckMap({
  mapData,
  activeLayers,
  activeMinute,
}: TrajectoryDeckMapProps) {
  ensureWebGL();

  const initialView = useMemo<MapViewState>(() => {
    const source = mapData?.viewState ?? DEFAULT_VIEW_STATE;
    return {
      longitude: source.longitude,
      latitude: source.latitude,
      zoom: source.zoom,
      pitch: source.pitch,
      bearing: source.bearing,
    };
  }, [mapData?.viewState]);

  const [viewState, setViewState] = useState<MapViewState>(initialView);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setViewState(initialView);
  }, [initialView]);

  const paths = useMemo(() => mapData?.paths ?? [], [mapData?.paths]);
  const allMarkers = useMemo(
    () => mapData?.conflictMarkers ?? [],
    [mapData?.conflictMarkers],
  );

  const focusMarkers = useMemo(() => {
    if (activeMinute === null || activeMinute === undefined) {
      return allMarkers;
    }
    return allMarkers.filter((marker) => marker.minute === activeMinute);
  }, [allMarkers, activeMinute]);

  const showTrajectories = activeLayers.includes("Trajectories");
  const showConflicts = activeLayers.includes("Conflicts");
  const showHotspots = activeLayers.includes("Hotspots");

  // Séparer les vols en conflit des vols normaux
  const { conflictPaths, normalPaths } = useMemo(() => {
    const conflict = paths.filter(p => (p as any).highlightColor);
    const normal = paths.filter(p => !(p as any).highlightColor);
    return { conflictPaths: conflict, normalPaths: normal };
  }, [paths]);

  // Layer pour les trajectoires normales
  const trajectoryLayer = useMemo(() => {
    if (!showTrajectories || normalPaths.length === 0) {
      return null;
    }

    return new PathLayer<TrajectoryMapPath>({
      id: "trajectory-paths",
      data: normalPaths,
      getPath: (flight) => flight.coordinates,
      getColor: (flight) =>
        flight.isCargo ? [250, 140, 20, 220] : [0, 159, 223, 220],
      widthUnits: "pixels",
      getWidth: (flight) => {
        const baseline = Math.log10(Math.max(flight.passengers, 1));
        return 1.6 + baseline * 1.5;
      },
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 255],
    });
  }, [normalPaths, showTrajectories]);

  // Layers séparés pour les deux vols en conflit (pour bien les distinguer)
  const conflictFlightLayers = useMemo(() => {
    if (!showTrajectories || conflictPaths.length === 0) {
      return [];
    }

    return conflictPaths.map((flight, index) => {
      return new PathLayer<TrajectoryMapPath>({
        id: `conflict-flight-${index}`,
        data: [flight],
        getPath: (f) => f.coordinates,
        getColor: (f) => (f as any).highlightColor,
        widthUnits: "pixels",
        getWidth: 5, // Ligne fine mais visible
        pickable: true,
        autoHighlight: false,
      });
    });
  }, [conflictPaths, showTrajectories]);

  const conflictLayer = useMemo(() => {
    if (!showConflicts || focusMarkers.length === 0) {
      return null;
    }

    return new ScatterplotLayer<TrajectoryMapConflictPoint>({
      id: "conflict-markers",
      data: focusMarkers,
      getPosition: (point) => point.coordinate,
      getFillColor: (point) => {
        const severity = Math.max(0, 1 - point.horizontalNm / 5);
        const alpha = 120 + severity * 80;
        return [255, 207, 106, alpha];
      },
      getRadius: (point) => 6000 + Math.max(0, 4 - point.horizontalNm) * 4500,
      radiusUnits: "meters",
      pickable: true,
      stroked: true,
      getLineColor: [15, 23, 42, 220],
      lineWidthUnits: "pixels",
      lineWidthMinPixels: 1.5,
    });
  }, [focusMarkers, showConflicts]);

  const hotspotLayer = useMemo(() => {
    if (!showHotspots || allMarkers.length === 0) {
      return null;
    }

    return new ScatterplotLayer<TrajectoryMapConflictPoint>({
      id: "conflict-hotspots",
      data: allMarkers,
      getPosition: (point) => point.coordinate,
      getFillColor: [45, 197, 253, 60],
      getRadius: 25000,
      radiusUnits: "meters",
      pickable: false,
    });
  }, [allMarkers, showHotspots]);

  const layers = useMemo(
    () =>
      [trajectoryLayer, ...conflictFlightLayers, hotspotLayer, conflictLayer].filter(
        (layer): layer is NonNullable<typeof layer> => Boolean(layer),
      ),
    [trajectoryLayer, conflictFlightLayers, hotspotLayer, conflictLayer],
  );

  const zoomBy = (delta: number) => {
    setViewState((prev) => ({
      ...prev,
      zoom: clampZoom((prev.zoom ?? initialView.zoom) + delta),
    }));
  };

  const resetView = () => {
    setViewState(initialView);
  };

  if (!isMounted) {
    return <div className="relative h-full w-full" />;
  }

  return (
    <div className="relative h-full w-full">
      <DeckGL
        deviceProps={{ type: "webgl" }}
        viewState={viewState}
        controller={{ doubleClickZoom: false }}
        layers={layers}
        getTooltip={({ object }) => {
          if (!object) {
            return null;
          }
          if (isConflict(object)) {
            const timeLabel = new Date(object.tSec * 1000)
              .toISOString()
              .slice(11, 19);
            return {
              text: `${object.flights[0]} ↔ ${object.flights[1]}
${object.horizontalNm.toFixed(2)} nm • ${object.verticalFt.toFixed(0)} ft • ${timeLabel}Z`,
            };
          }
          if (isPath(object)) {
            return {
              text: `${object.callsign}
${object.passengers.toLocaleString("en-US")} pax • ${
                object.isCargo ? "Cargo" : "Passenger"
              }`,
            };
          }
          return null;
        }}
        onViewStateChange={(event) =>
          setViewState(event.viewState as MapViewState)
        }
        style={{ position: "absolute", inset: "0" }}
      >
        <Map reuseMaps mapStyle={BASEMAP_STYLE} />
      </DeckGL>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-[rgba(2,25,48,0.78)] px-3 py-1 text-[11px] text-[var(--color-muted)]">
        Scroll to pan/zoom • Double-click container to toggle full screen
      </div>

      <div className="absolute bottom-3 right-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => zoomBy(0.7)}
          className="rounded bg-[rgba(4,47,94,0.9)] px-2 py-1 text-sm font-semibold text-white transition hover:bg-[rgba(0,159,223,0.9)]"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomBy(-0.7)}
          className="rounded bg-[rgba(4,47,94,0.9)] px-2 py-1 text-sm font-semibold text-white transition hover:bg-[rgba(0,159,223,0.9)]"
        >
          −
        </button>
        <button
          type="button"
          onClick={resetView}
          className="mt-1 rounded bg-[rgba(4,47,94,0.9)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white transition hover:bg-[rgba(0,159,223,0.9)]"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
