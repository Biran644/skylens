"use client";

import { useState } from "react";

type ConflictTimelinePoint = {
  minute: number;
  count: number;
};

type DataDrawerProps = {
  timelinePoints?: ConflictTimelinePoint[];
  timelineMax?: number;
  totalSamples?: number;
};

const formatMinuteLabel = (minute: number) => {
  const hours = Math.floor(minute / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minute % 60).toString().padStart(2, "0");
  return `${hours}:${mins}Z`;
};

export function DataDrawer({
  timelinePoints,
  timelineMax = 0,
  totalSamples = 0,
}: DataDrawerProps) {
  const [open, setOpen] = useState(false);

  const hasTimeline = Boolean(timelinePoints && timelinePoints.length > 0);
  const topBuckets = hasTimeline
    ? [...(timelinePoints ?? [])].sort((a, b) => b.count - a.count).slice(0, 5)
    : [];

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Conflict timeline
          </h3>
          <p className="text-xs text-[var(--color-muted)]">
            Inspect conflict cadence across the day.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="rounded border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-muted)] transition hover:border-[var(--color-azure)] hover:text-white"
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </header>

      {open ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-muted)]">
          {hasTimeline ? (
            <div className="mt-1 flex flex-col gap-3">
              <div className="flex items-baseline justify-between text-xs text-[var(--color-subtle)]">
                <span>
                  {totalSamples.toLocaleString("en-US")} total samples
                </span>
                <span>
                  Peak minute: {formatMinuteLabel(topBuckets[0].minute)} ·{" "}
                  {topBuckets[0].count.toLocaleString("en-US")} samples
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {topBuckets.map((bucket) => {
                  const percentage =
                    timelineMax > 0 ? (bucket.count / timelineMax) * 100 : 0;
                  return (
                    <li
                      key={`timeline-${bucket.minute}`}
                      className="flex flex-col gap-1 rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2"
                    >
                      <div className="flex items-center justify-between text-[11px] text-[var(--color-subtle)]">
                        <span className="font-semibold text-white">
                          {formatMinuteLabel(bucket.minute)}
                        </span>
                        <span>{bucket.count.toLocaleString("en-US")}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.05)]">
                        <div
                          className="h-1.5 rounded-full bg-[var(--color-azure)]"
                          style={{ width: `${Math.max(6, percentage)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[11px] text-[var(--color-subtle)]">
                Timeline aggregates conflict samples into 1-minute buckets. Use
                the scrubber to align mitigation windows with the busiest
                periods.
              </p>
            </div>
          ) : (
            <p className="text-xs text-[var(--color-subtle)]">
              Stacked bars show conflicts per minute bucket; import data to
              populate.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
