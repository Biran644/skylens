"use client";

import type { MapViewState } from "@deck.gl/core";
import { PathLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import DeckGL from "@deck.gl/react";
import { Component, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibreMap, type MapRef } from "react-map-gl/maplibre";
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
  showOnlyFocused?: boolean;
  enableHoverFocus?: boolean;
  showAllConflicts?: boolean;
  focusedConflict?: {
    conflictId: string;
    flights: [string, string];
    window: { start: number; end: number };
    location?: [number, number];
  } | null;
  resolutionPreview?: {
    flightId: string;
    deltaAltitudeFt: number;
    deltaSpeedKt: number;
    deltaTimeSec: number;
    resolvesConflict: boolean;
  } | null;
};

const canUseWebGL = () => {
  if (typeof window === "undefined") {
    return false;
  }
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
};

const BASEMAP_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const DEFAULT_VIEW_STATE: MapViewState = {
  longitude: -95,
  latitude: 55,
  zoom: 4.2,
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

type MapErrorBoundaryProps = {
  children: ReactNode;
};

type MapErrorBoundaryState = {
  hasError: boolean;
};

class MapErrorBoundary extends Component<
  MapErrorBoundaryProps,
  MapErrorBoundaryState
> {
  state: MapErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-6 text-center text-xs text-[var(--color-subtle)]">
          Map rendering is unavailable right now.
        </div>
      );
    }
    return this.props.children;
  }
}

export function TrajectoryDeckMap({
  mapData,
  activeLayers,
  activeMinute,
  showOnlyFocused = false,
  enableHoverFocus = false,
  showAllConflicts = false,
  focusedConflict,
  resolutionPreview,
}: TrajectoryDeckMapProps) {
  const [webglAvailable, setWebglAvailable] = useState(true);

  useEffect(() => {
    setWebglAvailable(canUseWebGL());
  }, []);

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
  const mapRef = useRef<MapRef | null>(null);
  const [hoveredConflict, setHoveredConflict] = useState<{
    conflictId: string;
    flights: [string, string];
    location?: [number, number];
  } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || typeof window === "undefined") {
      return;
    }

    const triggerResize = () => {
      window.dispatchEvent(new Event("resize"));
      mapRef.current?.resize();
    };

    const raf = window.requestAnimationFrame(triggerResize);
    const timeout = window.setTimeout(triggerResize, 150);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [isMounted]);

  useEffect(() => {
    setViewState(initialView);
  }, [initialView]);

  const paths = useMemo(() => mapData?.paths ?? [], [mapData?.paths]);
  const allMarkers = useMemo(
    () => mapData?.conflictMarkers ?? [],
    [mapData?.conflictMarkers],
  );

  const effectiveConflict = useMemo(() => {
    if (focusedConflict) {
      return focusedConflict;
    }
    if (enableHoverFocus && hoveredConflict) {
      return {
        conflictId: hoveredConflict.conflictId,
        flights: hoveredConflict.flights,
        window: { start: 0, end: 0 },
        location: hoveredConflict.location,
      } as const;
    }
    return null;
  }, [enableHoverFocus, focusedConflict, hoveredConflict]);

  const effectiveResolution = focusedConflict ? resolutionPreview : null;

  const focusCenter = useMemo(() => {
    if (!effectiveConflict?.location) {
      return null;
    }
    return effectiveConflict.location;
  }, [effectiveConflict?.location]);

  const highlightedFlights = useMemo(() => {
    const flightIds = new Set<string>();
    if (effectiveConflict) {
      effectiveConflict.flights.forEach((flightId) => flightIds.add(flightId));
    }
    if (effectiveResolution) {
      flightIds.add(effectiveResolution.flightId);
    }
    return flightIds;
  }, [effectiveConflict, effectiveResolution]);

  const focusedPaths = useMemo(() => {
    const getPathForFlight = (flightId: string) =>
      paths.find(
        (path) => path.id === flightId || path.callsign === flightId,
      ) ?? null;

    const conflictPaths = (effectiveConflict?.flights ?? [])
      .map((flightId) => getPathForFlight(flightId))
      .filter((path): path is TrajectoryMapPath => Boolean(path));

    const resolutionPath = effectiveResolution
      ? getPathForFlight(effectiveResolution.flightId)
      : null;

    const offsetMagnitude = effectiveResolution
      ? Math.min(
          0.25,
          Math.max(
            0.06,
            Math.abs(effectiveResolution.deltaAltitudeFt) / 45000 +
              Math.abs(effectiveResolution.deltaSpeedKt) / 600 +
              Math.abs(effectiveResolution.deltaTimeSec) / 2200,
          ),
        )
      : 0.08;
    const hashSeed = effectiveResolution?.flightId ?? "focus";
    const hashValue = hashSeed
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const sign = hashValue % 2 === 0 ? 1 : -1;
    const offset = {
      lon: offsetMagnitude * sign,
      lat: offsetMagnitude * 0.65 * -sign,
    };

    const redirectedPath = resolutionPath
      ? {
          id: `${resolutionPath.id}-redirected`,
          callsign: resolutionPath.callsign,
          passengers: resolutionPath.passengers,
          isCargo: resolutionPath.isCargo,
          coordinates: resolutionPath.coordinates.map(
            ([lon, lat]): [number, number] => [
              lon + offset.lon,
              lat + offset.lat,
            ],
          ),
        }
      : null;

    return {
      conflictPaths,
      resolutionPath,
      redirectedPath,
    };
  }, [paths, effectiveConflict, effectiveResolution]);

  const focusedDisplayPaths = useMemo(() => {
    if (!focusedPaths.conflictPaths.length) {
      return [] as TrajectoryMapPath[];
    }
    if (
      !showOnlyFocused &&
      !(enableHoverFocus && hoveredConflict && !focusedConflict)
    ) {
      return focusedPaths.conflictPaths;
    }
    const offsets: [number, number][] = [
      [-0.03, -0.02],
      [0.03, 0.02],
    ];
    return focusedPaths.conflictPaths.map((path, index) => {
      const [lonOffset, latOffset] = offsets[index % offsets.length];
      return {
        ...path,
        coordinates: path.coordinates.map(([lon, lat]): [number, number] => [
          lon + lonOffset,
          lat + latOffset,
        ]),
      };
    });
  }, [
    focusedPaths.conflictPaths,
    showOnlyFocused,
    enableHoverFocus,
    hoveredConflict,
    focusedConflict,
  ]);

  const focusedFlightColors = useMemo(() => {
    const palette: [number, number, number, number][] = [
      [64, 220, 255, 255],
      [255, 92, 92, 255],
    ];
    const mapping = new Map<string, [number, number, number, number]>();
    focusedPaths.conflictPaths.forEach((path, index) => {
      mapping.set(path.id, palette[index % palette.length]);
    });
    return mapping;
  }, [focusedPaths.conflictPaths]);

  const flightLegend = useMemo(() => {
    if (!effectiveConflict) {
      return [] as {
        id: string;
        color: [number, number, number, number];
        label: string;
      }[];
    }
    const fallbackPalette: [number, number, number, number][] = [
      [64, 220, 255, 255],
      [255, 92, 92, 255],
    ];
    return effectiveConflict.flights.map((flightId, index) => {
      const match = focusedPaths.conflictPaths.find(
        (path) => path.id === flightId || path.callsign === flightId,
      );
      const color =
        (match ? focusedFlightColors.get(match.id) : null) ??
        fallbackPalette[index % fallbackPalette.length];
      const label = index === 0 ? "Flight A" : "Flight B";
      return { id: flightId, color, label };
    });
  }, [effectiveConflict, focusedPaths.conflictPaths, focusedFlightColors]);

  const focusMarkers = useMemo(() => {
    if (effectiveConflict) {
      const windowStartMinute = Math.floor(effectiveConflict.window.start / 60);
      const windowEndMinute = Math.floor(effectiveConflict.window.end / 60);
      return allMarkers.filter((marker) => {
        if (marker.id !== effectiveConflict.conflictId) {
          return false;
        }
        if (activeMinute === null || activeMinute === undefined) {
          return (
            marker.minute >= windowStartMinute &&
            marker.minute <= windowEndMinute
          );
        }
        return marker.minute === activeMinute;
      });
    }
    if (showAllConflicts) {
      return allMarkers;
    }
    if (activeMinute === null || activeMinute === undefined) {
      return allMarkers;
    }
    return allMarkers.filter((marker) => marker.minute === activeMinute);
  }, [allMarkers, activeMinute, effectiveConflict, showAllConflicts]);

  const isClusteredConflict = useMemo(() => {
    if (!focusMarkers || focusMarkers.length < 2) {
      return false;
    }

    let minDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < focusMarkers.length; i += 1) {
      for (let j = i + 1; j < focusMarkers.length; j += 1) {
        const a = focusMarkers[i].coordinate;
        const b = focusMarkers[j].coordinate;
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        minDistance = Math.min(minDistance, distance);
      }
    }

    return minDistance < 0.08;
  }, [focusMarkers]);

  useEffect(() => {
    if (!focusCenter) {
      return;
    }
    setViewState((prev) => ({
      ...prev,
      zoom: Math.max(
        prev.zoom ?? initialView.zoom,
        isClusteredConflict ? 7.8 : 6,
      ),
      pitch: Math.max(prev.pitch ?? initialView.pitch ?? 0, 25),
    }));
  }, [focusCenter, initialView.zoom, initialView.pitch, isClusteredConflict]);

  const showTrajectories = activeLayers.includes("Trajectories");
  const showConflicts = activeLayers.includes("Conflicts");
  const showHotspots = activeLayers.includes("Hotspots");

  const trajectoryLayer = useMemo(() => {
    if (!showTrajectories || showOnlyFocused || paths.length === 0) {
      return null;
    }

    return new PathLayer<TrajectoryMapPath>({
      id: "trajectory-paths",
      data: paths,
      getPath: (flight) => flight.coordinates,
      getColor: (flight) => {
        if (highlightedFlights.has(flight.id)) {
          return [255, 255, 255, 255];
        }
        return flight.isCargo ? [250, 140, 20, 220] : [0, 159, 223, 220];
      },
      widthUnits: "pixels",
      getWidth: (flight) => {
        const baseline = Math.log10(Math.max(flight.passengers, 1));
        const width = 1.6 + baseline * 1.5;
        return highlightedFlights.has(flight.id) ? width + 2 : width;
      },
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 255],
    });
  }, [paths, showTrajectories, showOnlyFocused, highlightedFlights]);

  const focusedPathLayer = useMemo(() => {
    if (!showTrajectories || focusedDisplayPaths.length === 0) {
      return null;
    }

    return new PathLayer<TrajectoryMapPath>({
      id: "focused-conflict-paths",
      data: focusedDisplayPaths,
      getPath: (flight) => flight.coordinates,
      getColor: (flight) =>
        focusedFlightColors.get(flight.id) ?? [18, 197, 176, 230],
      widthUnits: "pixels",
      getWidth: 2.5,
      pickable: false,
    });
  }, [focusedDisplayPaths, focusedFlightColors, showTrajectories]);

  const redirectedPathLayer = useMemo(() => {
    if (!showTrajectories || !focusedPaths.redirectedPath) {
      return null;
    }

    return new PathLayer<TrajectoryMapPath>({
      id: "redirected-path",
      data: [focusedPaths.redirectedPath],
      getPath: (flight) => flight.coordinates,
      getColor: [116, 255, 163, 230],
      widthUnits: "pixels",
      getWidth: 2.5,
      pickable: false,
    });
  }, [focusedPaths.redirectedPath, showTrajectories]);

  const focusHaloLayer = useMemo(() => {
    if (!focusCenter || !showConflicts) {
      return null;
    }
    return new ScatterplotLayer<{ coordinate: [number, number] }>({
      id: "conflict-focus-halo",
      data: [{ coordinate: focusCenter }],
      getPosition: (point) => point.coordinate,
      getFillColor: [255, 255, 255, 0],
      getLineColor: [255, 109, 0, 220],
      lineWidthUnits: "pixels",
      lineWidthMinPixels: 2,
      stroked: true,
      filled: false,
      getRadius: 20000,
      radiusUnits: "meters",
      pickable: false,
    });
  }, [focusCenter, showConflicts]);

  const focusIconLayer = useMemo(() => {
    if (!focusCenter || !showConflicts) {
      return null;
    }

    return new TextLayer<{ position: [number, number] }>({
      id: "conflict-focus-icon",
      data: [{ position: focusCenter }],
      getPosition: (point) => point.position,
      getText: () => "⚠️",
      sizeUnits: "pixels",
      getSize: 22,
      getColor: [255, 140, 0, 255],
      background: false,
      billboard: true,
    });
  }, [focusCenter, showConflicts]);

  const planeMarkerLayer = useMemo(() => {
    if (!showTrajectories) {
      return null;
    }

    const markers: {
      id: string;
      position: [number, number];
      color: [number, number, number, number];
      label: string;
    }[] = [];

    const addMarkers = (
      path: TrajectoryMapPath,
      color: [number, number, number, number],
      labelPrefix: string,
    ) => {
      const coords = path.coordinates;
      if (!coords.length) {
        return;
      }
      const start = coords[0];
      const end = coords[coords.length - 1];
      markers.push({
        id: `${labelPrefix}-${path.id}-start`,
        position: start,
        color,
        label: "✈️",
      });
      markers.push({
        id: `${labelPrefix}-${path.id}-end`,
        position: end,
        color,
        label: "✈️",
      });
    };

    focusedDisplayPaths.forEach((path) => {
      const color = focusedFlightColors.get(path.id) ?? [18, 197, 176, 255];
      addMarkers(path, color, "orig");
    });
    if (focusedPaths.redirectedPath) {
      addMarkers(focusedPaths.redirectedPath, [116, 255, 163, 255], "redir");
    }

    if (markers.length === 0) {
      return null;
    }

    return new TextLayer({
      id: "plane-emoji-markers",
      data: markers,
      getPosition: (marker) => marker.position,
      getText: (marker) => marker.label,
      getColor: (marker) => marker.color,
      sizeUnits: "pixels",
      getSize: 18,
      background: false,
      billboard: true,
    });
  }, [
    focusedDisplayPaths,
    focusedPaths.redirectedPath,
    focusedFlightColors,
    showTrajectories,
  ]);

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
        const isFocused = point.id === effectiveConflict?.conflictId;
        return isFocused ? [255, 109, 0, 240] : [247, 201, 72, alpha];
      },
      getRadius: (point) => {
        const baseRadius = 3800 + Math.max(0, 4 - point.horizontalNm) * 2500;
        const isFocused = point.id === effectiveConflict?.conflictId;
        return isFocused ? baseRadius * 1.15 : baseRadius;
      },
      radiusUnits: "meters",
      pickable: true,
      stroked: true,
      getLineColor: [15, 23, 42, 220],
      lineWidthUnits: "pixels",
      lineWidthMinPixels: 1.5,
    });
  }, [focusMarkers, showConflicts, effectiveConflict?.conflictId]);

  const hotspotLayer = useMemo(() => {
    if (!showHotspots || showOnlyFocused || allMarkers.length === 0) {
      return null;
    }

    return new ScatterplotLayer<TrajectoryMapConflictPoint>({
      id: "conflict-hotspots",
      data: allMarkers,
      getPosition: (point) => point.coordinate,
      getFillColor: [0, 159, 223, 70],
      getRadius: 22000,
      radiusUnits: "meters",
      pickable: false,
    });
  }, [allMarkers, showHotspots, showOnlyFocused]);

  const layers = useMemo(
    () =>
      [
        trajectoryLayer,
        redirectedPathLayer,
        focusedPathLayer,
        hotspotLayer,
        conflictLayer,
        focusHaloLayer,
        focusIconLayer,
        planeMarkerLayer,
      ].filter((layer): layer is NonNullable<typeof layer> => Boolean(layer)),
    [
      trajectoryLayer,
      redirectedPathLayer,
      focusedPathLayer,
      hotspotLayer,
      conflictLayer,
      focusHaloLayer,
      focusIconLayer,
      planeMarkerLayer,
    ],
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

  if (!webglAvailable) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-6 text-center text-xs text-[var(--color-subtle)]">
        WebGL is unavailable. The trajectory map can’t render on this device.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapErrorBoundary>
        <DeckGL
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
          onHover={({ object }) => {
            if (!enableHoverFocus || showOnlyFocused) {
              return;
            }
            if (object && isConflict(object)) {
              setHoveredConflict({
                conflictId: object.id,
                flights: object.flights,
                location: object.coordinate,
              });
              return;
            }
            setHoveredConflict(null);
          }}
          onViewStateChange={(event) =>
            setViewState(event.viewState as MapViewState)
          }
          style={{ position: "absolute", inset: "0" }}
        >
          <MapLibreMap
            ref={mapRef}
            reuseMaps
            mapStyle={BASEMAP_STYLE}
            onLoad={() => mapRef.current?.resize()}
          />
        </DeckGL>
      </MapErrorBoundary>

      {effectiveConflict ? (
        <div className="pointer-events-none absolute top-3 left-3 rounded bg-[rgba(2,25,48,0.78)] px-3 py-2 text-[11px] text-[var(--color-muted)]">
          <p className="text-[var(--color-subtle)]">Focused conflict</p>
          <p className="text-sm font-semibold text-white">
            {effectiveConflict.flights[0]} ↔ {effectiveConflict.flights[1]}
          </p>
          {(showOnlyFocused || enableHoverFocus) && flightLegend.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {flightLegend.map((flight) => (
                <span
                  key={flight.id}
                  className="inline-flex items-center gap-1 rounded-full border border-[rgba(255,255,255,0.08)] px-2 py-1 text-[10px]"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: `rgba(${flight.color[0]}, ${flight.color[1]}, ${flight.color[2]}, ${flight.color[3] / 255})`,
                    }}
                  />
                  {flight.label}: {flight.id}
                </span>
              ))}
              {effectiveResolution ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(255,255,255,0.08)] px-2 py-1 text-[10px] text-[#8cffb4]">
                  <span className="h-2 w-2 rounded-full bg-[#8cffb4]" />
                  Redirected
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {effectiveResolution ? (
        <div className="pointer-events-none absolute top-3 right-3 rounded bg-[rgba(32,78,45,0.78)] px-3 py-2 text-[11px] text-[var(--color-muted)]">
          <p className="text-[var(--color-subtle)]">Resolution</p>
          <p className="text-sm font-semibold text-[#8cffb4]">
            Flight {effectiveResolution.flightId}
          </p>
          <p>Δ Alt {effectiveResolution.deltaAltitudeFt} ft</p>
          <p>Δ Spd {effectiveResolution.deltaSpeedKt} kt</p>
          <p>Δ Time {effectiveResolution.deltaTimeSec}s</p>
          <p>
            {effectiveResolution.resolvesConflict
              ? "Expected to resolve"
              : "Review required"}
          </p>
        </div>
      ) : null}

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
