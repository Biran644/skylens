"use client";

import { MissionControlPanel } from "./MissionControlPanel";
import { MissionControlDashboard } from "./MissionControlDashboard";
import { useMemo, useState, useTransition } from "react";
import { AnalyzeConflictsResult } from "../../backend/actions/analyzeConflicts";
import { scoreResolutionsAction } from "../../backend/actions/scoreResolutions";
import { DashboardLayout } from "./DashboardLayout";
import { DataDrawer } from "./DataDrawer";
import { FlightImportPanel } from "./FlightImportPanel";
import { InsightsSidebar } from "./InsightsSidebar";
import { ScenarioSummary } from "./ScenarioSummary";
import { TrajectoryMapShell } from "./TrajectoryMapShell";
import { ResolutionCandidate } from "../../backend/types/domain";

export function HomeDashboard() {
  const [missionControlOpen, setMissionControlOpen] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeConflictsResult | null>(null);
  const [lastRun, setLastRun] = useState<string>("No analysis yet");
  const [resolutionCandidates, setResolutionCandidates] = useState<
    ResolutionCandidate[]
  >([]);
  const [isScoring, startScoring] = useTransition();
  const scenarioName = "Demo Scenario";

  const formatTimestamp = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(date);

  const handleAnalysis = (result: AnalyzeConflictsResult) => {
    setAnalysis(result);
    setLastRun(formatTimestamp(new Date()));
    setResolutionCandidates([]);

    startScoring(async () => {
      if (!result.conflicts.length) {
        return;
      }

      try {
        const { candidates } = await scoreResolutionsAction(result.conflicts);
        setResolutionCandidates(candidates);
      } catch (error) {
        console.error("Failed to score resolutions", error);
      }
    });
  };

  const conflictTimeline = useMemo(() => {
    const samples = analysis?.conflictSamples ?? [];
    if (!samples.length) {
      return null;
    }

    const counts = new Map<number, number>();
    samples.forEach((sample) => {
      const minute = Math.floor(sample.tSec / 60);
      counts.set(minute, (counts.get(minute) ?? 0) + 1);
    });

    const points = Array.from(counts.entries())
      .map(([minute, count]) => ({ minute, count }))
      .sort((a, b) => a.minute - b.minute);

    const maxCount = points.reduce(
      (max, point) => Math.max(max, point.count),
      0,
    );

    return {
      points,
      maxCount,
      totalSamples: samples.length,
    };
  }, [analysis?.conflictSamples]);

  const leftColumn = (
    <>
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5 shadow-[0_12px_38px_rgba(0,10,26,0.4)]">
        <header className="mb-3 flex flex-col gap-1">
          <p className="text-[11px] uppercase tracking-[0.35em] text-[var(--color-azure)]">
            SkyLens
          </p>
          <h1 className="text-xl font-semibold text-white">
            Trajectory Insight Explorer
          </h1>
          <p className="text-xs text-[var(--color-muted)]">
            Synthetic NAV CANADA planning data. Non-operational demo only.
          </p>
        </header>
        <p className="text-xs text-[var(--color-subtle)]">
          Import daily flight plans, detect loss-of-separation events, explore
          hotspots, and trial minimal-cost resolutions.
        </p>
      </section>

      <ScenarioSummary summary={analysis?.summary} />

      <FlightImportPanel onAnalysis={handleAnalysis} />
    </>
  );

  const mapArea = (
    <TrajectoryMapShell
      summary={analysis?.summary}
      flights={analysis?.flights}
      conflicts={analysis?.conflicts}
      mapData={analysis?.mapData}
      timelinePoints={conflictTimeline?.points}
      timelineMax={conflictTimeline?.maxCount ?? 0}
    />
  );
  const rightColumn = (
    <InsightsSidebar
      summary={analysis?.summary}
      flights={analysis?.flights}
      conflicts={analysis?.conflicts}
      resolutionCandidates={resolutionCandidates}
      scoringResolutions={isScoring}
      onOpenMissionControl={() => setMissionControlOpen(true)}
    />
  );
  const bottomDrawer = (
    <DataDrawer
      timelinePoints={conflictTimeline?.points}
      timelineMax={conflictTimeline?.maxCount}
      totalSamples={conflictTimeline?.totalSamples}
    />
  );

  return (
  <>
    <DashboardLayout
      leftColumn={leftColumn}
      mapArea={mapArea}
      rightColumn={rightColumn}
      bottomDrawer={bottomDrawer}
      scenarioName={scenarioName}
      lastRun={lastRun}
    />

    <MissionControlPanel
      open={missionControlOpen}
      onClose={() => setMissionControlOpen(false)}
    >
      <MissionControlDashboard />
    </MissionControlPanel>
  </>
);
}

export default HomeDashboard;
