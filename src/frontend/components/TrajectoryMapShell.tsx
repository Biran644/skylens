"use client";

import { useState } from "react";
import { AnalysisSummary, Conflict, Flight } from "../../backend/types/domain";

const layers = ["Trajectories", "Conflicts", "Hotspots", "Airspace"] as const;

type LayerKey = (typeof layers)[number];

const MINUTES_PER_DAY = 24 * 60;

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
  timelinePoints?: { minute: number; count: number }[];
  timelineMax?: number;
};

export function TrajectoryMapShell({
  flights,
  summary,
  conflicts,
  timelinePoints,
  timelineMax = 0,
}: TrajectoryMapShellProps) {
  const [activeLayers, setActiveLayers] = useState<LayerKey[]>([
    "Trajectories",
    "Conflicts",
  ]);

  const toggleLayer = (layer: LayerKey) => {
    setActiveLayers((prev) =>
      prev.includes(layer)
        ? prev.filter((item) => item !== layer)
        : [...prev, layer],
    );
  };

  const totalFlights = summary?.flights ?? flights?.length ?? 0;
  const totalSegments = summary?.segments ?? 0;
  const totalSamples = summary?.samples ?? 0;
  const conflictCount = summary?.conflicts ?? conflicts?.length ?? 0;
  const hasData = totalFlights > 0;
  const topFlights = [...(flights ?? [])]
    .sort((a, b) => b.segments.length - a.segments.length)
    .slice(0, 5);
  const topConflicts = [...(conflicts ?? [])]
    .sort((a, b) => a.minHorizontalNm - b.minHorizontalNm)
    .slice(0, 5);
  const timelineBuckets = timelinePoints ?? [];
  const timelineHasData = timelineBuckets.length > 0 && timelineMax > 0;
  const peakTimeline = timelineHasData
    ? timelineBuckets.reduce(
        (peak, point) => (peak && peak.count >= point.count ? peak : point),
        timelineBuckets[0],
      )
    : null;
  const highlightCenter = peakTimeline
    ? (peakTimeline.minute / MINUTES_PER_DAY) * 100
    : 0;
  const highlightWidth = peakTimeline
    ? Math.max(1.5, (peakTimeline.count / timelineMax) * 8)
    : 0;
  const highlightLeft = Math.min(
    Math.max(0, highlightCenter - highlightWidth / 2),
    Math.max(0, 100 - highlightWidth),
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 shadow-[0_15px_45px_rgba(0,8,22,0.45)]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Trajectory Map</h2>
          <p className="text-xs text-[var(--color-muted)]">
            Deck.gl stub; summary reflects latest server analysis.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {layers.map((layer) => {
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
      </header>

      <div className="mt-6 flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-subtle)]">
        {hasData ? (
          <div className="flex w-full flex-col gap-4 text-left">
            <div className="flex flex-wrap gap-4 text-xs text-[var(--color-muted)]">
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
                            {flight.departureAirport} → {flight.arrivalAirport}
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
                  No loss-of-separation events detected in the current dataset.
                </p>
              )}
            </div>

            <p className="text-[11px] text-[var(--color-subtle)]">
              Interactive WebGL map coming soon. Layer toggles simulate future
              deck.gl overlays for trajectories, detected conflicts, hotspots,
              and airspace boundaries.
            </p>
          </div>
        ) : (
          <span>Import flights to populate trajectory layers.</span>
        )}
      </div>

      <footer className="mt-6 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>Timeline scrubber (UTC)</span>
          <div className="flex items-center gap-2">
            <button className="rounded border border-[var(--color-border)] px-2 py-1 text-[var(--color-muted)] transition hover:border-[var(--color-azure)] hover:text-white">
              Rewind
            </button>
            <button className="rounded border border-[var(--color-border)] px-2 py-1 text-[var(--color-muted)] transition hover:border-[var(--color-azure)] hover:text-white">
              Play
            </button>
            <button className="rounded border border-[var(--color-border)] px-2 py-1 text-[var(--color-muted)] transition hover:border-[var(--color-azure)] hover:text-white">
              Pause
            </button>
          </div>
        </div>
        {timelineHasData && peakTimeline ? (
          <div className="flex items-center justify-between text-[11px] text-[var(--color-subtle)]">
            <span>Peak {formatMinuteLabel(peakTimeline.minute)}</span>
            <span>{peakTimeline.count.toLocaleString("en-US")} samples</span>
          </div>
        ) : null}
        <div className="relative h-2 rounded-full bg-[var(--color-surface)]">
          {timelineHasData && peakTimeline ? (
            <div
              className="absolute top-0 h-2 rounded-full bg-[var(--color-azure)] transition-[left,width]"
              style={{ left: `${highlightLeft}%`, width: `${highlightWidth}%` }}
            />
          ) : (
            <div className="absolute top-0 h-2 w-1/4 rounded-full bg-[var(--color-azure)] opacity-30" />
          )}
        </div>
        <div className="flex justify-between text-[11px] text-[var(--color-subtle)]">
          <span>00:00Z</span>
          <span>12:00Z</span>
          <span>24:00Z</span>
        </div>
      </footer>
    </section>
  );
}
