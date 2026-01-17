"use client";

import { AnalysisSummary } from "../../backend/types/domain";

type ScenarioSummaryProps = {
  summary?: AnalysisSummary | null;
};

const formatNumber = (value: number) =>
  Number.isFinite(value)
    ? value.toLocaleString("en-US", { maximumFractionDigits: 1 })
    : "—";

export function ScenarioSummary({ summary }: ScenarioSummaryProps) {
  const flights = summary?.flights ?? 0;
  const segments = summary?.segments ?? 0;
  const samples = summary?.samples ?? 0;
  const avgSegments = summary?.averageSegmentsPerFlight ?? 0;
  const avgSamples = summary?.averageSamplesPerFlight ?? 0;
  const conflicts = summary?.conflicts ?? 0;
  const conflictSamples = summary?.conflictSamples ?? 0;

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5 shadow-[0_12px_40px_rgba(0,10,25,0.35)]">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Scenario KPIs</h2>
          <p className="text-xs text-[var(--color-muted)]">
            {summary
              ? "Latest analytics snapshot"
              : "Run analysis to populate metrics"}
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-azure-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-azure)]">
          demo
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-subtle)]">
            Flights
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {summary ? flights.toLocaleString("en-US") : "—"}
          </p>
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">
            Total planned departures
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-subtle)]">
            Conflicts detected
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#ffcf6a]">
            {summary ? conflicts.toLocaleString("en-US") : "—"}
          </p>
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">
            Loss-of-separation pairs
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-subtle)]">
            Auto-resolved
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#5be7a9]">—</p>
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">
            No new conflicts introduced
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-subtle)]">
            Outstanding
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#ff8ba7]">—</p>
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">
            Needs planner review
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-subtle)]">
            Segments / flight
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {summary ? formatNumber(avgSegments) : "—"}
          </p>
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">
            Average legs per trajectory
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-subtle)]">
            Samples / flight
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {summary ? formatNumber(avgSamples) : "—"}
          </p>
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">
            1-minute interpolation points
          </p>
        </div>
      </div>

      <footer className="mt-4 flex flex-col gap-2 text-xs text-[var(--color-muted)]">
        <p>
          {summary
            ? `${segments.toLocaleString("en-US")} segments processed · ${samples.toLocaleString("en-US")} samples generated · ${conflictSamples.toLocaleString("en-US")} conflict samples`
            : "Segments and trajectory samples will populate after the first run."}
        </p>
        <p>
          Objective: minimize delay, altitude, speed adjustments while removing
          all conflicts.
        </p>
        <p className="text-[11px] text-[var(--color-subtle)]">
          Synthetic data only. Results are explanations for hackathon judges,
          not operational directives.
        </p>
      </footer>
    </section>
  );
}
