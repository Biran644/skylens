"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { AnalyzeConflictsResult } from "../../backend/actions/analyzeConflicts";
import { scoreResolutionsAction } from "../../backend/actions/scoreResolutions";
import { DashboardLayout } from "./DashboardLayout";
import { DataDrawer } from "./DataDrawer";
import { FlightManifest } from "./FlightManifest";
import { FlightImportPanel } from "./FlightImportPanel";
import { InsightsSidebar } from "./InsightsSidebar";
import { ScenarioSummary } from "./ScenarioSummary";
import { TrajectoryMapShell } from "./TrajectoryMapShell";
import { ResolutionCandidate } from "../../backend/types/domain";
import { DashboardView, HypermediaNavLink } from "../types/navigation";

type NavigationState = {
  hasConflicts: boolean;
};

const DEFAULT_VIEW: DashboardView = "overview";

const buildNavigationLinks = ({
  hasConflicts,
}: NavigationState): HypermediaNavLink[] => {
  const links: HypermediaNavLink[] = [
    {
      rel: "overview",
      label: "Overview",
      href: "/",
    },
    {
      rel: "data",
      label: "Data Intake",
      href: "/?view=data",
    },
    {
      rel: "mission-control",
      label: "Mission Control",
      href: "/?view=mission-control",
      disabled: !hasConflicts,
    },
  ];

  return links;
};

export function HomeDashboard() {
  const [analysis, setAnalysis] = useState<AnalyzeConflictsResult | null>(null);
  const [lastRun, setLastRun] = useState<string>("No analysis yet");
  const [resolutionCandidates, setResolutionCandidates] = useState<
    ResolutionCandidate[]
  >([]);
  const [isScoring, startScoring] = useTransition();
  const [focusedConflictId, setFocusedConflictId] = useState<string | null>(
    null,
  );
  const [focusedResolutionId, setFocusedResolutionId] = useState<string | null>(
    null,
  );
  const scenarioName = "Demo Scenario";
  const searchParams = useSearchParams();
  const viewParam = (searchParams.get("view") ?? DEFAULT_VIEW) as DashboardView;
  const allowedViews: DashboardView[] = ["overview", "data", "mission-control"];
  const activeView: DashboardView = allowedViews.includes(viewParam)
    ? viewParam
    : DEFAULT_VIEW;

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

  const conflictsList = useMemo(
    () => analysis?.conflicts ?? [],
    [analysis?.conflicts],
  );

  const focusedConflict = useMemo(() => {
    if (!focusedConflictId) {
      return null;
    }
    return (
      conflictsList.find((conflict) => conflict.id === focusedConflictId) ??
      null
    );
  }, [conflictsList, focusedConflictId]);

  const focusedResolution = useMemo(() => {
    if (!focusedResolutionId) {
      return null;
    }
    return (
      resolutionCandidates.find(
        (candidate) => candidate.id === focusedResolutionId,
      ) ?? null
    );
  }, [resolutionCandidates, focusedResolutionId]);

  const handleConflictFocus = useCallback((conflictId: string | null) => {
    setFocusedConflictId(conflictId);
    if (conflictId === null) {
      setFocusedResolutionId(null);
    }
  }, []);

  const handleResolutionFocus = useCallback(
    (resolutionId: string | null, conflictId: string | null) => {
      setFocusedResolutionId(resolutionId);
      if (conflictId) {
        setFocusedConflictId(conflictId);
      }
    },
    [],
  );

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
        <FlightImportPanel onAnalysis={handleAnalysis} variant="inline" />
      </section>

      <ScenarioSummary
        summary={analysis?.summary}
        conflicts={analysis?.conflicts}
        resolutionCandidates={resolutionCandidates}
      />
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
      focusedConflict={activeView === "overview" ? null : focusedConflict}
      focusedResolution={activeView === "overview" ? null : focusedResolution}
    />
  );
  const missionControlSnapshot = null;

  const missionControlFull = (
    <InsightsSidebar
      summary={analysis?.summary}
      flights={analysis?.flights}
      conflicts={analysis?.conflicts}
      resolutionCandidates={resolutionCandidates}
      mapData={analysis?.mapData}
      scoringResolutions={isScoring}
      onConflictFocus={handleConflictFocus}
      onResolutionFocus={handleResolutionFocus}
    />
  );
  const bottomDrawer = (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <FlightManifest flights={analysis?.flights} />
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
        <DataDrawer
          timelinePoints={conflictTimeline?.points}
          timelineMax={conflictTimeline?.maxCount}
          totalSamples={conflictTimeline?.totalSamples}
        />
      </div>
    </div>
  );

  const navigationLinks = useMemo(() => {
    const state: NavigationState = {
      hasConflicts: Boolean(analysis?.conflicts?.length),
    };

    return buildNavigationLinks(state);
  }, [analysis]);

  return (
    <DashboardLayout
      leftColumn={leftColumn}
      mapArea={mapArea}
      rightColumn={missionControlSnapshot}
      bottomDrawer={bottomDrawer}
      scenarioName={scenarioName}
      lastRun={lastRun}
      navigationLinks={navigationLinks}
      activeView={activeView}
      missionControlFull={missionControlFull}
    />
  );
}

export default HomeDashboard;
