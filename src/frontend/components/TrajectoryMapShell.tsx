"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AnalysisSummary,
  Conflict,
  Flight,
  ResolutionCandidate,
  TrajectoryMapData,
} from "../../backend/types/domain";
import { TrajectoryDeckMap, type LayerKey } from "./TrajectoryDeckMap";

const ALL_LAYERS: LayerKey[] = ["Trajectories", "Conflicts", "Hotspots"];

const formatUtcTime = (tSec: number) => {
  const minutes = Math.floor(tSec / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(tSec % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}Z`;
};

const formatMinuteLabel = (minute: number) => {
  const hours = Math.floor(minute / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minute % 60).toString().padStart(2, "0");
  return `${hours}:${mins}Z`;
};

type TrajectoryMapShellProps = {
  flights?: Flight[] | null;
  summary?: AnalysisSummary | null;
  conflicts?: Conflict[] | null;
  mapData?: TrajectoryMapData | null;
  timelinePoints?: { minute: number; count: number }[];
  timelineMax?: number;
  focusedConflict?: Conflict | null;
  focusedResolution?: ResolutionCandidate | null;
};

export function TrajectoryMapShell({
  flights,
  summary,
  conflicts,
  mapData,
  timelinePoints,
  timelineMax = 0,
  focusedConflict,
  focusedResolution,
}: TrajectoryMapShellProps) {
  const [activeLayers, setActiveLayers] = useState<LayerKey[]>(ALL_LAYERS);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerHeight, setContainerHeight] = useState<number>(480);
  const [cursorMinute, setCursorMinute] = useState<number | null>(null);
  const [playbackState, setPlaybackState] = useState<{
    key: string;
    playing: boolean;
  }>({ key: "none", playing: false });
  const allLayersActive = useMemo(
    () => ALL_LAYERS.every((layer) => activeLayers.includes(layer)),
    [activeLayers],
  );

  const toggleLayer = useCallback((layer: LayerKey) => {
    setActiveLayers((prev) =>
      prev.includes(layer)
        ? prev.filter((item) => item !== layer)
        : [...prev, layer],
    );
  }, []);

  const activateAllLayers = useCallback(() => {
    setActiveLayers(ALL_LAYERS);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      const height = Math.max(360, Math.floor(window.innerHeight * 0.55));
      setContainerHeight(height);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen || typeof window === "undefined") {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  const totalFlights = flights?.length ?? 0;
  const totalSegments = summary?.segments ?? 0;
  const totalSamples = summary?.samples ?? 0;
  const conflictCount = summary?.conflicts ?? conflicts?.length ?? 0;
  const hasData = totalFlights > 0;
  const viewState = mapData?.viewState;
  const pathCount = mapData?.paths?.length ?? 0;
  const markerCount = mapData?.conflictMarkers?.length ?? 0;

  const mapIdentity = useMemo(() => {
    if (!viewState) {
      return `no-map|${pathCount}|${markerCount}`;
    }
    return [
      viewState.longitude?.toFixed(2) ?? "-",
      viewState.latitude?.toFixed(2) ?? "-",
      viewState.zoom?.toFixed(2) ?? "-",
      pathCount,
      markerCount,
    ].join("|");
  }, [viewState, pathCount, markerCount]);
  const topFlights = [...(flights ?? [])]
    .sort((a, b) => b.segments.length - a.segments.length)
    .slice(0, 5);
  const topConflicts = [...(conflicts ?? [])]
    .sort((a, b) => a.minHorizontalNm - b.minHorizontalNm)
    .slice(0, 5);
  const timelineBuckets = useMemo(() => timelinePoints ?? [], [timelinePoints]);
  const timelineHasData = timelineBuckets.length > 0 && timelineMax > 0;
  const conflictRange = useMemo(() => {
    if (!focusedConflict) {
      return null;
    }
    return {
      start: Math.floor(focusedConflict.tStart / 60),
      end: Math.floor(focusedConflict.tEnd / 60),
    };
  }, [focusedConflict]);

  const globalRange = useMemo(() => {
    if (!timelineHasData) {
      return null;
    }
    const start = timelineBuckets[0].minute;
    const end = timelineBuckets[timelineBuckets.length - 1].minute;
    return { start, end };
  }, [timelineBuckets, timelineHasData]);

  const activeRange = conflictRange ?? globalRange;

  const playbackEnabled = Boolean(activeRange && timelineHasData);

  const rangeKey = activeRange
    ? `${activeRange.start}-${activeRange.end}`
    : "none";

  const activeMinute = useMemo(() => {
    if (!activeRange) {
      return null;
    }
    if (cursorMinute === null) {
      return activeRange.start;
    }
    if (cursorMinute < activeRange.start) {
      return activeRange.start;
    }
    if (cursorMinute > activeRange.end) {
      return activeRange.end;
    }
    return cursorMinute;
  }, [cursorMinute, activeRange]);

  const isPlaying =
    playbackEnabled && playbackState.playing && playbackState.key === rangeKey;

  useEffect(() => {
    if (
      !isPlaying ||
      !activeRange ||
      !timelineHasData ||
      typeof window === "undefined"
    ) {
      return undefined;
    }
    const range = activeRange;
    const interval = window.setInterval(() => {
      let reachedEnd = false;
      setCursorMinute((prev) => {
        if (!range) {
          return prev;
        }
        const baseline =
          prev === null
            ? range.start
            : Math.min(Math.max(prev, range.start), range.end);
        if (baseline >= range.end) {
          reachedEnd = true;
          return range.end;
        }
        return baseline + 1;
      });
      if (reachedEnd) {
        setPlaybackState({ key: rangeKey, playing: false });
      }
    }, 750);
    return () => window.clearInterval(interval);
  }, [isPlaying, activeRange, timelineHasData, rangeKey]);

  const activeBucket = useMemo(() => {
    if (activeMinute === null) {
      return null;
    }
    return (
      timelineBuckets.find((bucket) => bucket.minute === activeMinute) ?? null
    );
  }, [timelineBuckets, activeMinute]);

  const currentConflictSample = useMemo(() => {
    if (!focusedConflict || activeMinute === null) {
      return null;
    }
    const startSec = activeMinute * 60;
    const endSec = startSec + 60;
    return (
      focusedConflict.samples.find(
        (sample) => sample.tSec >= startSec && sample.tSec < endSec,
      ) ?? null
    );
  }, [focusedConflict, activeMinute]);

  const conflictFocus = useMemo(() => {
    if (!focusedConflict) {
      return null;
    }
    return {
      conflictId: focusedConflict.id,
      flights: [focusedConflict.flightA, focusedConflict.flightB] as [
        string,
        string,
      ],
      window: { start: focusedConflict.tStart, end: focusedConflict.tEnd },
      location: [
        focusedConflict.representativeLon,
        focusedConflict.representativeLat,
      ] as [number, number],
    };
  }, [focusedConflict]);

  const resolutionPreview = useMemo(() => {
    if (!focusedResolution) {
      return null;
    }
    return {
      flightId: focusedResolution.flightId,
      deltaAltitudeFt: focusedResolution.deltaAltitudeFt,
      deltaSpeedKt: focusedResolution.deltaSpeedKt,
      deltaTimeSec: focusedResolution.deltaTimeSec,
      resolvesConflict: focusedResolution.resolvesConflict,
    };
  }, [focusedResolution]);

  const timelineSpan = activeRange
    ? Math.max(activeRange.end - activeRange.start, 0)
    : 0;
  const highlightWidth = activeRange
    ? Math.min(12, Math.max(1.5, 100 / (timelineSpan + 1)))
    : 0;
  const highlightLeft =
    activeRange && activeMinute !== null && timelineSpan >= 0
      ? ((activeMinute - activeRange.start) /
          Math.max(timelineSpan === 0 ? 1 : timelineSpan, 1)) *
        (100 - highlightWidth)
      : 0;
  const activeMinuteLabel =
    activeMinute !== null ? formatMinuteLabel(activeMinute) : null;
  const canRewind = Boolean(
    activeRange && activeMinute !== null && activeMinute > activeRange.start,
  );
  const canPlay = playbackEnabled && !isPlaying;
  const canPause = playbackEnabled && isPlaying;

  const handleRewind = useCallback(() => {
    if (!activeRange) {
      return;
    }
    setPlaybackState({ key: rangeKey, playing: false });
    setCursorMinute(activeRange.start);
  }, [activeRange, rangeKey]);

  const handlePlay = useCallback(() => {
    if (!activeRange || !timelineHasData) {
      return;
    }
    setPlaybackState({ key: rangeKey, playing: true });
  }, [activeRange, timelineHasData, rangeKey]);

  const handlePause = useCallback(() => {
    setPlaybackState({ key: rangeKey, playing: false });
  }, [rangeKey]);

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 shadow-[0_15px_45px_rgba(0,8,22,0.45)]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Trajectory Map</h2>
          <p className="text-xs text-[var(--color-muted)]">
            Explore trajectories, conflict markers, and hotspot density.
            Double-click the map to expand view or use the controls to launch a
            dedicated window.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => hasData && setIsFullscreen(true)}
            disabled={!hasData}
            className={`rounded border px-3 py-1 font-medium transition ${
              hasData
                ? "border-[var(--color-azure)] bg-[var(--color-azure-soft)] text-[var(--color-azure)] hover:bg-[rgba(0,159,223,0.2)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]"
            }`}
          >
            🔎 Expand view
          </button>
          <button
            type="button"
            onClick={activateAllLayers}
            disabled={allLayersActive}
            className={`rounded border px-3 py-1 font-medium transition ${
              allLayersActive
                ? "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] opacity-70"
                : "border-[var(--color-azure)] bg-[var(--color-azure-soft)] text-[var(--color-azure)] hover:bg-[rgba(0,159,223,0.2)]"
            }`}
          >
            Activate all layers
          </button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {ALL_LAYERS.map((layer) => {
          const active = activeLayers.includes(layer);
          return (
            <button
              key={layer}
              type="button"
              onClick={() => toggleLayer(layer)}
              className={`rounded-full border px-3 py-1 font-medium transition ${
                active
                  ? "border-[var(--color-azure)] bg-[var(--color-azure-soft)] text-[var(--color-azure)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-azure)] hover:text-white"
              }`}
            >
              {layer}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-1 flex-col gap-4">
        <div
          className="relative flex-1 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
          style={{ minHeight: `${containerHeight}px` }}
          onDoubleClick={() => hasData && setIsFullscreen(true)}
        >
          {hasData ? (
            <>
              <TrajectoryDeckMap
                key={`trajectory-map-inline-${mapIdentity}`}
                mapData={mapData}
                activeLayers={activeLayers}
                activeMinute={activeMinute}
                enableHoverFocus
                showAllConflicts
                focusedConflict={conflictFocus}
                resolutionPreview={resolutionPreview}
              />
              <div className="pointer-events-none absolute top-3 right-3 rounded bg-[rgba(2,25,48,0.78)] px-3 py-1 text-[11px] text-[var(--color-muted)]">
                Double-click to expand • Use +/- controls for zoom
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--color-subtle)]">
              Import flights to populate trajectory insights.
            </div>
          )}
        </div>

        {(focusedConflict || focusedResolution) && hasData ? (
          <div className="rounded-lg border border-[var(--color-border)] bg-[rgba(8,31,58,0.6)] p-4 text-xs text-[var(--color-muted)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Conflict focus
                </h3>
                {focusedConflict ? (
                  <p>
                    {focusedConflict.flightA} ↔ {focusedConflict.flightB}
                  </p>
                ) : (
                  <p>No conflict selected</p>
                )}
              </div>
              {activeMinuteLabel ? (
                <div className="rounded border border-[var(--color-border)] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--color-subtle)]">
                  {activeMinuteLabel}
                </div>
              ) : null}
            </div>
            {focusedConflict ? (
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <div className="rounded border border-[var(--color-border)] bg-[rgba(5,20,38,0.65)] px-3 py-2 text-[11px]">
                  <p className="text-[var(--color-subtle)]">Window</p>
                  <p className="text-sm font-semibold text-white">
                    {formatMinuteLabel(Math.floor(focusedConflict.tStart / 60))}{" "}
                    → {formatMinuteLabel(Math.floor(focusedConflict.tEnd / 60))}
                  </p>
                </div>
                <div className="rounded border border-[var(--color-border)] bg-[rgba(5,20,38,0.65)] px-3 py-2 text-[11px]">
                  <p className="text-[var(--color-subtle)]">Closest sample</p>
                  <p className="text-sm font-semibold text-white">
                    {focusedConflict.minHorizontalNm.toFixed(2)} nm ·{" "}
                    {focusedConflict.minVerticalFt.toFixed(0)} ft
                  </p>
                </div>
                {currentConflictSample ? (
                  <div className="rounded border border-[var(--color-border)] bg-[rgba(5,20,38,0.65)] px-3 py-2 text-[11px]">
                    <p className="text-[var(--color-subtle)]">Now</p>
                    <p className="text-sm font-semibold text-white">
                      {currentConflictSample.horizontalNm.toFixed(2)} nm ·{" "}
                      {currentConflictSample.verticalFt.toFixed(0)} ft
                    </p>
                  </div>
                ) : (
                  <div className="rounded border border-[var(--color-border)] bg-[rgba(5,20,38,0.65)] px-3 py-2 text-[11px]">
                    <p className="text-[var(--color-subtle)]">Now</p>
                    <p className="text-sm font-semibold text-white">—</p>
                  </div>
                )}
              </div>
            ) : null}
            {focusedResolution ? (
              <div className="mt-3 grid gap-2 text-[11px] text-[var(--color-subtle)] md:grid-cols-2">
                <div className="rounded border border-[var(--color-border)] bg-[rgba(5,20,38,0.65)] px-3 py-2">
                  <p className="mb-1 uppercase tracking-[0.2em]">
                    Resolution candidate
                  </p>
                  <p className="text-sm font-semibold text-white">
                    Flight {focusedResolution.flightId}
                  </p>
                  <p>Δ altitude {focusedResolution.deltaAltitudeFt} ft</p>
                  <p>Δ speed {focusedResolution.deltaSpeedKt} kt</p>
                  <p>Δ time {focusedResolution.deltaTimeSec}s</p>
                </div>
                <div className="rounded border border-[var(--color-border)] bg-[rgba(5,20,38,0.65)] px-3 py-2">
                  <p className="mb-1 uppercase tracking-[0.2em]">Outcome</p>
                  <p className="text-sm font-semibold text-white">
                    {focusedResolution.resolvesConflict
                      ? "Expected to resolve"
                      : "Needs adjustments"}
                  </p>
                  <p>
                    Horizontal gain{" "}
                    {focusedResolution.estimatedHorizontalGainNm.toFixed(2)} nm
                  </p>
                  <p>
                    Vertical gain{" "}
                    {focusedResolution.estimatedVerticalGainFt.toFixed(0)} ft
                  </p>
                  <p>Status {focusedResolution.status}</p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {hasData ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
              <span className="rounded border border-[var(--color-border)] bg-[rgba(0,159,223,0.1)] px-3 py-1 text-[var(--color-azure)]">
                {totalFlights.toLocaleString("en-US")} flights
              </span>
              <span className="rounded border border-[var(--color-border)] px-3 py-1">
                {totalSegments.toLocaleString("en-US")} segments
              </span>
              <span className="rounded border border-[var(--color-border)] px-3 py-1">
                {totalSamples.toLocaleString("en-US")} samples
              </span>
              <span
                className={`rounded border px-3 py-1 ${
                  conflictCount > 0
                    ? "border-[rgba(255,207,106,0.65)] text-[#ffcf6a]"
                    : "border-[var(--color-border)]"
                }`}
              >
                {conflictCount.toLocaleString("en-US")} conflicts
              </span>
              {summary ? (
                <span className="rounded border border-[var(--color-border)] px-3 py-1">
                  {summary.averageSegmentsPerFlight.toFixed(1)} seg/flight
                </span>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4 text-xs text-[var(--color-muted)]">
                <h3 className="text-sm font-semibold text-white">
                  Top trajectories by segment count
                </h3>
                {topFlights.length > 0 ? (
                  <ul className="mt-3 grid gap-2">
                    {topFlights.map((flight) => {
                      const legCount = flight.segments.length;
                      const distanceNm = flight.segments.reduce(
                        (acc, segment) => acc + segment.distanceNm,
                        0,
                      );
                      return (
                        <li
                          key={flight.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-subtle)]"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white">
                              {flight.callsign}
                            </span>
                            <span>
                              {flight.departureAirport} →{" "}
                              {flight.arrivalAirport}
                            </span>
                          </div>
                          <div className="flex flex-col items-end text-[11px] text-[var(--color-muted)]">
                            <span>{legCount} segments</span>
                            <span>{distanceNm.toFixed(0)} nm est.</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-[var(--color-subtle)]">
                    Flight data ready; waiting for conflict overlays.
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4 text-xs text-[var(--color-muted)]">
                <h3 className="text-sm font-semibold text-white">
                  Active conflict pairs
                </h3>
                {topConflicts.length > 0 ? (
                  <ul className="mt-3 grid gap-2">
                    {topConflicts.map((conflict) => (
                      <li
                        key={conflict.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-subtle)]"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-white">
                            {conflict.flightA} ↔ {conflict.flightB}
                          </span>
                          <span>
                            {conflict.minHorizontalNm.toFixed(2)} nm ·{" "}
                            {conflict.minVerticalFt.toFixed(0)} ft sep
                          </span>
                        </div>
                        <div className="flex flex-col items-end text-[11px] text-[var(--color-muted)]">
                          <span>{formatUtcTime(conflict.tStart)}</span>
                          <span>{conflict.samples.length} samples</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-[var(--color-subtle)]">
                    No loss-of-separation events detected in the current
                    dataset.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {isFullscreen && hasData ? (
        <div className="fixed inset-0 z-[60] bg-[rgba(3,7,18,0.92)] backdrop-blur">
          <div className="absolute right-6 top-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-sm text-white transition hover:border-[var(--color-azure)] hover:text-[var(--color-azure)]"
            >
              ✕ Close (Esc)
            </button>
          </div>
          <div className="flex h-full w-full items-center justify-center p-8">
            <div className="h-full w-full max-w-[1600px]">
              <div
                className="relative h-full w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                onDoubleClick={() => setIsFullscreen(false)}
              >
                <TrajectoryDeckMap
                  key={`trajectory-map-fullscreen-${mapIdentity}`}
                  mapData={mapData}
                  activeLayers={activeLayers}
                  activeMinute={activeMinute}
                  enableHoverFocus
                  showAllConflicts
                  focusedConflict={conflictFocus}
                  resolutionPreview={resolutionPreview}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
