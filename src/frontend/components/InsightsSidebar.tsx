"use client";

import { useState } from "react";
import {
  AnalysisSummary,
  Conflict,
  Flight,
  ResolutionCandidate,
} from "../../backend/types/domain";

const tabs = ["Conflicts", "Hotspots", "Resolutions", "Insights"] as const;

type TabKey = (typeof tabs)[number];

type TabCard = {
  title: string;
  body: string;
  accent?: string;
};

type InsightsSidebarProps = {
  summary?: AnalysisSummary | null;
  flights?: Flight[] | null;
  conflicts?: Conflict[] | null;
  resolutionCandidates?: ResolutionCandidate[] | null;
  scoringResolutions?: boolean;
};

export function InsightsSidebar({
  summary,
  flights,
  conflicts,
  resolutionCandidates,
  scoringResolutions,
}: InsightsSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("Conflicts");

  const flightsList = flights ?? [];
  const flightCount = summary?.flights ?? flightsList.length;
  const segmentCount = summary?.segments ?? 0;
  const sampleCount = summary?.samples ?? 0;
  const conflictList = conflicts ?? [];
  const conflictCount = summary?.conflicts ?? conflictList.length;
  const conflictSampleCount = summary?.conflictSamples ?? 0;
  const resolutionList = resolutionCandidates ?? [];
  const scoringResolutionsPending = Boolean(scoringResolutions);
  const datasetSummary =
    flightCount > 0
      ? `Dataset processed ${segmentCount.toLocaleString("en-US")} segments and ${sampleCount.toLocaleString("en-US")} sampled trajectory points.`
      : null;

  const topDepartureAirports = flightsList.reduce<Record<string, number>>(
    (acc, flight) => {
      acc[flight.departureAirport] = (acc[flight.departureAirport] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const topArrivals = flightsList.reduce<Record<string, number>>(
    (acc, flight) => {
      acc[flight.arrivalAirport] = (acc[flight.arrivalAirport] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const formatTopList = (stats: Record<string, number>) => {
    const entries = Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    if (entries.length === 0) {
      return "No data yet";
    }
    return entries.map(([key, value]) => `${key}: ${value}`).join(" · ");
  };

  const describeCandidate = (candidate: ResolutionCandidate) => {
    const adjustments: string[] = [];
    if (candidate.deltaTimeSec !== 0) {
      const minutes = candidate.deltaTimeSec / 60;
      adjustments.push(`${minutes > 0 ? "+" : ""}${minutes.toFixed(0)} min`);
    }
    if (candidate.deltaAltitudeFt !== 0) {
      adjustments.push(
        `${candidate.deltaAltitudeFt > 0 ? "+" : ""}${candidate.deltaAltitudeFt} ft`,
      );
    }
    if (candidate.deltaSpeedKt !== 0) {
      adjustments.push(
        `${candidate.deltaSpeedKt > 0 ? "+" : ""}${candidate.deltaSpeedKt} kt`,
      );
    }

    return `${candidate.flightId}: ${
      adjustments.length > 0 ? adjustments.join(" / ") : "No change"
    } · cost ${candidate.cost.toFixed(2)}`;
  };

  const conflictHighlights = conflictList
    .slice(0, 5)
    .map(
      (conflict) =>
        `${conflict.flightA}↔${conflict.flightB} (${conflict.minHorizontalNm.toFixed(2)} nm / ${conflict.minVerticalFt.toFixed(0)} ft)`,
    );
  const resolutionHighlights = resolutionList
    .slice(0, 4)
    .map(describeCandidate);

  const dynamicTabContent: Record<TabKey, TabCard[]> = {
    Conflicts:
      conflictCount > 0
        ? [
            {
              title: "Active conflicts",
              body:
                conflictHighlights.length > 0
                  ? conflictHighlights.join(" · ")
                  : "Monitoring separation bands—no severity ranking yet.",
            },
            {
              title: "Analysis summary",
              body: `Detected ${conflictCount.toLocaleString("en-US")} conflict pair(s) across ${conflictSampleCount.toLocaleString("en-US")} close-approach samples. Prioritize interventions by minimum horizontal separation.`,
            },
            {
              title: "Pipeline status",
              body: datasetSummary
                ? `${datasetSummary} Conflict hashing in place. Next iteration: surface timeline scrubbing and automated resolution candidate scoring for the most critical pairs.`
                : "Conflict hashing in place. Next iteration: surface timeline scrubbing and automated resolution candidate scoring for the most critical pairs.",
            },
          ]
        : [
            {
              title: "No data loaded",
              body: "Run the conflict detection pipeline to populate severity-ranked events with map focusing support.",
            },
            {
              title: "How it works",
              body: "SkyLens uses deterministic space-time hashing and fine-grained interpolation to identify loss-of-separation candidates in 4D.",
            },
          ],
    Hotspots:
      flightCount > 0
        ? [
            {
              title: "Top departure clusters",
              body: formatTopList(topDepartureAirports),
            },
            {
              title: "Top arrival corridors",
              body: formatTopList(topArrivals),
            },
            {
              title: "Next up",
              body: datasetSummary
                ? `${datasetSummary} Next iterate: bucket sampled trajectories into 1° x 1° cells by minute to spotlight congestion ridgelines across FIRs.`
                : "Bucket sampled trajectories into 1° x 1° cells by minute to spotlight congestion ridgelines across FIRs.",
            },
          ]
        : [
            {
              title: "Airspace hotspot roadmap",
              body: "Aggregates conflict samples per 1° grid cell and minute bucket to surface congested corridors for planners.",
            },
          ],
    Resolutions:
      resolutionList.length > 0
        ? [
            {
              title: "Top candidates",
              body:
                resolutionHighlights.length > 0
                  ? resolutionHighlights.join(" · ")
                  : "Candidates queued for evaluation.",
            },
            {
              title: "Next actions",
              body: "Validate preferred candidate, simulate residual conflicts, then promote to controller briefing queue.",
            },
          ]
        : scoringResolutionsPending
          ? [
              {
                title: "Scoring resolution candidates",
                body: "Evaluating delay, altitude, and speed options for detected conflicts. This updates automatically once scoring completes.",
              },
            ]
          : [
              {
                title: "Resolution queue",
                body: "For each conflict, SkyLens evaluates delay, altitude, and speed candidates against constraints, selecting the lowest cost safe option.",
              },
              {
                title: "What changes with data",
                body: "Once conflicts populate, this tab will prioritize mitigation strategies per controller sector with ETA impacts and residual risk scores.",
              },
            ],
    Insights:
      flightCount > 0
        ? [
            {
              title: "Quick briefing",
              body: datasetSummary
                ? `${datasetSummary} Focus on ${formatTopList(topDepartureAirports)} departures and monitor inbound saturation at ${formatTopList(topArrivals)}. Deck.gl overlays will highlight the densest minute buckets.`
                : `Focus on ${formatTopList(topDepartureAirports)} departures and monitor inbound saturation at ${formatTopList(topArrivals)}. Deck.gl overlays will highlight the densest minute buckets.`,
            },
            {
              title: "LLM summary (optional)",
              body: "Use Gemini to narrate top conflicts, hotspots, and cost trade-offs for briefing slides. Enable once conflict detection is active.",
            },
          ]
        : [
            {
              title: "LLM summary (optional)",
              body: "Use Gemini to narrate top conflicts, hotspots, and cost trade-offs for briefing slides. Disabled until data is imported.",
            },
          ],
  };

  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[0_14px_38px_rgba(0,8,22,0.45)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-5 py-4">
        <h2 className="text-lg font-semibold text-white">Mission Control</h2>
        <span className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-subtle)]">
          Review & act
        </span>
      </header>

      <nav className="flex border-b border-[var(--color-border-soft)] text-sm">
        {tabs.map((tab) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 font-medium transition ${
                active
                  ? "border-b-2 border-[var(--color-azure)] text-[var(--color-azure)]"
                  : "text-[var(--color-muted)] hover:text-white"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </nav>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5 text-sm text-[var(--color-muted)]">
        {dynamicTabContent[activeTab].map((card) => (
          <article
            key={`${activeTab}-${card.title}`}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <h3 className="text-sm font-semibold text-white">{card.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-subtle)]">
              {card.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
