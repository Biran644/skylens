"use client";

import Link from "next/link";
import {
  AnalysisSummary,
  Conflict,
  ResolutionCandidate,
} from "../../backend/types/domain";

type MissionControlSnapshotProps = {
  summary?: AnalysisSummary | null;
  conflicts?: Conflict[] | null;
  resolutionCandidates?: ResolutionCandidate[] | null;
  scoringResolutions?: boolean;
};

export function MissionControlSnapshot({
  summary,
  conflicts,
  resolutionCandidates,
  scoringResolutions,
}: MissionControlSnapshotProps) {
  const conflictList = conflicts ?? [];
  const resolutionList = resolutionCandidates ?? [];
  const conflictCount = summary?.conflicts ?? conflictList.length;
  const resolvedConflicts = new Set(
    resolutionList
      .filter((candidate) => candidate.resolvesConflict)
      .map((candidate) => candidate.conflictId),
  );
  const resolvedCount = resolvedConflicts.size;
  const redirectedFlights = new Set(
    resolutionList
      .filter(
        (candidate) =>
          candidate.deltaAltitudeFt !== 0 ||
          candidate.deltaSpeedKt !== 0 ||
          candidate.deltaTimeSec !== 0,
      )
      .map((candidate) => candidate.flightId),
  );
  const redirectedCount = redirectedFlights.size;
  const scoringPending = Boolean(scoringResolutions);

  const summaryCards = [
    {
      label: "Conflicts detected",
      value: conflictCount.toLocaleString("en-US"),
    },
    {
      label: "Conflicts solved",
      value: resolvedCount.toLocaleString("en-US"),
    },
    {
      label: "Flights redirected",
      value: redirectedCount.toLocaleString("en-US"),
    },
  ];

  const topConflicts = conflictList
    .slice(0, 3)
    .sort((a, b) => a.minHorizontalNm - b.minHorizontalNm);

  const topResolutions = resolutionList
    .slice(0, 3)
    .sort((a, b) => a.cost - b.cost);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5 shadow-[0_12px_34px_rgba(0,10,26,0.4)]">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Mission Control</h2>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-subtle)]">
            Snapshot
          </p>
        </div>
        <Link
          href="/?view=mission-control"
          className="rounded border border-[var(--color-azure)] px-3 py-1 text-xs font-semibold text-[var(--color-azure)] transition hover:bg-[var(--color-azure-soft)]"
        >
          Open full view
        </Link>
      </header>

      <div className="grid grid-cols-3 gap-2 text-center text-sm text-[var(--color-muted)]">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(6,24,44,0.65)] px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-subtle)]">
              {card.label}
            </p>
            <p className="text-lg font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 text-xs text-[var(--color-muted)]">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Conflict pairs</h3>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-subtle)]">
              Top risk
            </span>
          </div>
          {topConflicts.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2">
              {topConflicts.map((conflict) => (
                <li key={conflict.id} className="flex justify-between gap-3">
                  <span className="font-medium text-white">
                    {conflict.flightA} ↔ {conflict.flightB}
                  </span>
                  <span>
                    {conflict.minHorizontalNm.toFixed(2)} nm ·{" "}
                    {conflict.minVerticalFt.toFixed(0)} ft
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[var(--color-subtle)]">
              Import flights and run analysis to populate conflicts.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Resolution queue
            </h3>
            {scoringPending ? (
              <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-warning)]">
                Scoring…
              </span>
            ) : null}
          </div>
          {topResolutions.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2">
              {topResolutions.map((candidate) => (
                <li key={candidate.id} className="flex justify-between gap-3">
                  <span className="font-medium text-white">
                    {candidate.flightId}
                  </span>
                  <span>
                    Cost {candidate.cost.toFixed(2)} ·{" "}
                    {candidate.resolvesConflict ? "Solves" : "Pending"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[var(--color-subtle)]">
              Run the scorer to generate candidate mitigations.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
