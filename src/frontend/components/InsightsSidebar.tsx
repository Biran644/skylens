"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnalysisSummary,
  Conflict,
  Flight,
  ResolutionCandidate,
  TrajectoryMapData,
} from "../../backend/types/domain";
import { TrajectoryDeckMap, type LayerKey } from "./TrajectoryDeckMap";

type InsightsSidebarProps = {
  summary?: AnalysisSummary | null;
  flights?: Flight[] | null;
  conflicts?: Conflict[] | null;
  resolutionCandidates?: ResolutionCandidate[] | null;
  mapData?: TrajectoryMapData | null;
  scoringResolutions?: boolean;
  onConflictFocus?: (conflictId: string | null) => void;
  onResolutionFocus?: (
    resolutionId: string | null,
    conflictId: string | null,
  ) => void;
};

type TabKey = "Conflicts" | "Solutions";

const tabs: TabKey[] = ["Conflicts", "Solutions"];

const CONFLICTS_PER_PAGE = 10;
const RESOLUTIONS_PER_PAGE = 5;

const formatZuluTime = (seconds: number) =>
  new Date(seconds * 1000).toISOString().slice(11, 19);

const formatDuration = (seconds: number) => {
  if (seconds <= 0) {
    return "0s";
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
};

const describeAdjustment = (candidate: ResolutionCandidate) => {
  const adjustments: string[] = [];
  if (candidate.deltaTimeSec !== 0) {
    const minutes = candidate.deltaTimeSec / 60;
    adjustments.push(`${minutes > 0 ? "+" : ""}${minutes.toFixed(0)} min`);
  }
  if (candidate.deltaAltitudeFt !== 0) {
    adjustments.push(
      `${candidate.deltaAltitudeFt > 0 ? "+" : ""}${candidate.deltaAltitudeFt.toLocaleString("en-US")} ft`,
    );
  }
  if (candidate.deltaSpeedKt !== 0) {
    adjustments.push(
      `${candidate.deltaSpeedKt > 0 ? "+" : ""}${candidate.deltaSpeedKt} kt`,
    );
  }
  return adjustments.length > 0 ? adjustments.join(" / ") : "No change";
};

const buildFallbackExplanation = (
  conflict: Conflict,
  resolution?: ResolutionCandidate | null,
) => {
  const base = `Conflict between ${conflict.flightA} and ${conflict.flightB}. Min separation ${conflict.minHorizontalNm.toFixed(2)} nm / ${conflict.minVerticalFt.toFixed(0)} ft.`;
  if (!resolution) {
    return `${base} No resolution candidate selected.`;
  }
  const adjustments = describeAdjustment(resolution);
  return `${base} Candidate for ${resolution.flightId}: ${adjustments}.`;
};

const buildFallbackSolution = (resolution?: ResolutionCandidate | null) => {
  if (!resolution) {
    return null;
  }
  const adjustments = describeAdjustment(resolution);
  return `Adjust ${resolution.flightId}: ${adjustments}.`;
};


export function InsightsSidebar({
  summary,
  conflicts,
  resolutionCandidates,
  mapData,
  scoringResolutions,
  onConflictFocus,
  onResolutionFocus,
}: InsightsSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("Conflicts");
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(
    null,
  );
  const [selectedResolutionId, setSelectedResolutionId] = useState<
    string | null
  >(null);
  const [conflictPage, setConflictPage] = useState(0);
  const [resolutionPage, setResolutionPage] = useState(0);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [solutionSummary, setSolutionSummary] = useState<string | null>(null);
  const [explanationStatus, setExplanationStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [explanationSource, setExplanationSource] = useState<
    "gemini" | "fallback" | null
  >(null);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const [explanationRequestKey, setExplanationRequestKey] = useState<
    string | null
  >(null);
  const [retryCount, setRetryCount] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const explanationCacheRef = useRef<
    Map<string, { explanation: string; solution?: string | null }>
  >(new Map());

  const conflictList = useMemo(() => conflicts ?? [], [conflicts]);
  const orderedConflicts = useMemo(
    () =>
      conflictList
        .slice()
        .sort((a, b) => a.minHorizontalNm - b.minHorizontalNm),
    [conflictList],
  );
  const resolutionList = useMemo(
    () => resolutionCandidates ?? [],
    [resolutionCandidates],
  );
  const orderedResolutions = useMemo(
    () => resolutionList.slice().sort((a, b) => a.cost - b.cost),
    [resolutionList],
  );

  const conflictPageCount = Math.max(
    1,
    Math.ceil(orderedConflicts.length / CONFLICTS_PER_PAGE),
  );
  const conflictPageIndex = Math.min(
    Math.max(conflictPage, 0),
    conflictPageCount - 1,
  );
  const pagedConflicts = useMemo(() => {
    const start = conflictPageIndex * CONFLICTS_PER_PAGE;
    return orderedConflicts.slice(start, start + CONFLICTS_PER_PAGE);
  }, [conflictPageIndex, orderedConflicts]);
  const conflictPageDisplayIndex =
    orderedConflicts.length > 0 ? conflictPageIndex + 1 : 0;
  const conflictPageDisplayTotal =
    orderedConflicts.length > 0 ? conflictPageCount : 0;
  const conflictHasPrev = orderedConflicts.length > 0 && conflictPageIndex > 0;
  const conflictHasNext =
    orderedConflicts.length > 0 && conflictPageIndex < conflictPageCount - 1;

  const resolutionPageCount = Math.max(
    1,
    Math.ceil(orderedResolutions.length / RESOLUTIONS_PER_PAGE),
  );
  const resolutionPageIndex = Math.min(
    Math.max(resolutionPage, 0),
    resolutionPageCount - 1,
  );
  const pagedResolutions = useMemo(() => {
    const start = resolutionPageIndex * RESOLUTIONS_PER_PAGE;
    return orderedResolutions.slice(start, start + RESOLUTIONS_PER_PAGE);
  }, [orderedResolutions, resolutionPageIndex]);
  const resolutionPageDisplayIndex =
    orderedResolutions.length > 0 ? resolutionPageIndex + 1 : 0;
  const resolutionPageDisplayTotal =
    orderedResolutions.length > 0 ? resolutionPageCount : 0;
  const resolutionHasPrev =
    orderedResolutions.length > 0 && resolutionPageIndex > 0;
  const resolutionHasNext =
    orderedResolutions.length > 0 &&
    resolutionPageIndex < resolutionPageCount - 1;

  const goToConflictPage = (page: number) => {
    const maxPage = Math.max(
      Math.ceil(orderedConflicts.length / CONFLICTS_PER_PAGE) - 1,
      0,
    );
    const bounded = Math.min(Math.max(page, 0), maxPage);
    setConflictPage(bounded);
  };

  const goToResolutionPage = (page: number) => {
    const maxPage = Math.max(
      Math.ceil(orderedResolutions.length / RESOLUTIONS_PER_PAGE) - 1,
      0,
    );
    const bounded = Math.min(Math.max(page, 0), maxPage);
    setResolutionPage(bounded);
    const start = bounded * RESOLUTIONS_PER_PAGE;
    const fallback = orderedResolutions[start];
    setSelectedResolutionId(fallback ? fallback.id : null);
  };

  const handleConflictSelect = (conflict: Conflict) => {
    const index = orderedConflicts.findIndex((item) => item.id === conflict.id);
    if (index >= 0) {
      const targetPage = Math.floor(index / CONFLICTS_PER_PAGE);
      setConflictPage(targetPage);
    }
    setSelectedConflictId(conflict.id);
    setExplanation(null);
    setSolutionSummary(null);
    setExplanationStatus("loading");
    setExplanationSource(null);
    setExplanationError(null);
    setExplanationRequestKey(
      `${conflict.id}:${selectedResolutionId ?? "none"}`,
    );
  };

  const handleResolutionSelect = (candidate: ResolutionCandidate) => {
    const index = orderedResolutions.findIndex(
      (item) => item.id === candidate.id,
    );
    if (index >= 0) {
      const targetPage = Math.floor(index / RESOLUTIONS_PER_PAGE);
      setResolutionPage(targetPage);
    }
    setSelectedResolutionId(candidate.id);
    if (selectedConflictId) {
      setExplanation(null);
      setSolutionSummary(null);
      setExplanationStatus("loading");
      setExplanationSource(null);
      setExplanationError(null);
      setExplanationRequestKey(
        `${selectedConflictId}:${candidate.id ?? "none"}`,
      );
    }
  };

  const conflictId = useMemo(() => {
    if (
      selectedConflictId &&
      orderedConflicts.some((conflict) => conflict.id === selectedConflictId)
    ) {
      return selectedConflictId;
    }
    return null;
  }, [orderedConflicts, selectedConflictId]);

  const selectedConflict = useMemo(() => {
    if (!conflictId) {
      return null;
    }
    return (
      orderedConflicts.find((conflict) => conflict.id === conflictId) ?? null
    );
  }, [conflictId, orderedConflicts]);

  const conflictSpecificResolutions = useMemo(
    () =>
      conflictId
        ? orderedResolutions.filter(
            (candidate) => candidate.conflictId === conflictId,
          )
        : [],
    [conflictId, orderedResolutions],
  );

  const resolutionId = useMemo(() => {
    if (
      selectedResolutionId &&
      orderedResolutions.some(
        (candidate) => candidate.id === selectedResolutionId,
      )
    ) {
      return selectedResolutionId;
    }
    if (
      activeTab === "Conflicts" &&
      conflictId &&
      conflictSpecificResolutions.length > 0
    ) {
      return conflictSpecificResolutions[0].id;
    }
    if (activeTab === "Solutions" && pagedResolutions.length > 0) {
      return pagedResolutions[0].id;
    }
    return null;
  }, [
    activeTab,
    conflictSpecificResolutions,
    conflictId,
    orderedResolutions,
    pagedResolutions,
    selectedResolutionId,
  ]);

  const selectedResolution = useMemo(() => {
    if (!resolutionId) {
      return null;
    }
    return (
      orderedResolutions.find((candidate) => candidate.id === resolutionId) ??
      null
    );
  }, [orderedResolutions, resolutionId]);

  useEffect(() => {
    if (!selectedConflict || !explanationRequestKey) {
      return;
    }

    if (cooldownUntil && Date.now() < cooldownUntil) {
      return;
    }

    const cached = explanationCacheRef.current.get(explanationRequestKey);
    if (cached) {
      setExplanation(cached.explanation);
      setSolutionSummary(cached.solution ?? null);
      setExplanationStatus("idle");
      setExplanationSource("gemini");
      return;
    }

    const controller = new AbortController();

    fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conflict: selectedConflict,
        resolution: selectedResolution,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          let errorDetails = "Gemini request failed";
          try {
            const data = (await res.json()) as {
              error?: string;
              details?: string;
            };
            errorDetails = data.details || data.error || errorDetails;
          } catch {
            // ignore parsing errors
          }
          if (res.status === 429) {
            setCooldownUntil(Date.now() + 60_000);
            errorDetails = "Rate limited. Try again in a minute.";
          }
          throw new Error(errorDetails);
        }
        const data = (await res.json()) as {
          text?: string;
          explanation?: string;
          solution?: string;
        };
        const text = data.explanation?.trim() ?? data.text?.trim() ?? "";
        const solution = data.solution?.trim() ?? null;
        explanationCacheRef.current.set(explanationRequestKey, {
          explanation: text,
          solution,
        });
        setExplanation(text);
        setSolutionSummary(solution);
        setExplanationStatus("idle");
        setExplanationSource("gemini");
        setExplanationError(null);
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          return;
        }
        if (selectedConflict) {
          setExplanation(
            buildFallbackExplanation(selectedConflict, selectedResolution),
          );
          setSolutionSummary(buildFallbackSolution(selectedResolution));
          setExplanationStatus("idle");
          setExplanationSource("fallback");
          setExplanationError(error?.message ?? "Gemini request failed");
          return;
        }
        setExplanation(error?.message ?? null);
        setSolutionSummary(null);
        setExplanationStatus("error");
      });

    return () => controller.abort();
  }, [explanationRequestKey, selectedConflict, selectedResolution, retryCount]);

  const missionMapLayers = useMemo<LayerKey[]>(
    () => ["Trajectories", "Conflicts"],
    [],
  );

  const conflictFocus = useMemo(() => {
    if (!selectedConflict) {
      return null;
    }
    return {
      conflictId: selectedConflict.id,
      flights: [selectedConflict.flightA, selectedConflict.flightB] as [
        string,
        string,
      ],
      window: { start: selectedConflict.tStart, end: selectedConflict.tEnd },
      location: [
        selectedConflict.representativeLon,
        selectedConflict.representativeLat,
      ] as [number, number],
    };
  }, [selectedConflict]);

  const resolutionPreview = useMemo(() => {
    if (!selectedResolution) {
      return null;
    }
    return {
      flightId: selectedResolution.flightId,
      deltaAltitudeFt: selectedResolution.deltaAltitudeFt,
      deltaSpeedKt: selectedResolution.deltaSpeedKt,
      deltaTimeSec: selectedResolution.deltaTimeSec,
      resolvesConflict: selectedResolution.resolvesConflict,
    };
  }, [selectedResolution]);

  useEffect(() => {
    if (onConflictFocus) {
      onConflictFocus(conflictId ?? null);
    }
  }, [conflictId, onConflictFocus]);

  useEffect(() => {
    if (onResolutionFocus) {
      const conflictRef = selectedResolution?.conflictId ?? null;
      onResolutionFocus(resolutionId ?? null, conflictRef);
    }
  }, [onResolutionFocus, resolutionId, selectedResolution?.conflictId]);

  const resolvedConflictIds = useMemo(() => {
    const resolved = new Set<string>();
    resolutionList.forEach((candidate) => {
      if (candidate.resolvesConflict) {
        resolved.add(candidate.conflictId);
      }
    });
    return resolved;
  }, [resolutionList]);

  const redirectedFlights = useMemo(() => {
    const redirected = new Set<string>();
    resolutionList.forEach((candidate) => {
      if (
        candidate.deltaAltitudeFt !== 0 ||
        candidate.deltaSpeedKt !== 0 ||
        candidate.deltaTimeSec !== 0
      ) {
        redirected.add(candidate.flightId);
      }
    });
    return redirected;
  }, [resolutionList]);

  const scoringResolutionsPending = Boolean(scoringResolutions);

  const conflictCount = summary?.conflicts ?? conflictList.length;
  const resolvedCount = resolvedConflictIds.size;
  const redirectedCount = redirectedFlights.size;

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

  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[0_14px_38px_rgba(0,8,22,0.45)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-5 py-4">
        <h2 className="text-lg font-semibold text-white">Mission Control</h2>
        <span className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-subtle)]">
          Review & act
        </span>
      </header>

      <div className="grid grid-cols-3 gap-2 border-b border-[var(--color-border-soft)] px-5 py-3 text-center">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(6,24,44,0.65)] px-3 py-2"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
              {card.label}
            </p>
            <p className="text-lg font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <nav className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-2 text-sm">
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

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5 text-sm text-[var(--color-muted)]">
        {activeTab === "Conflicts" ? (
          conflictList.length > 0 ? (
            <div className="flex h-full flex-col gap-4">
              <div className="grid flex-1 gap-4 md:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
                <article className="flex min-h-0 flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <header className="border-b border-[var(--color-border-soft)] px-4 py-3">
                    <h3 className="text-sm font-semibold text-white">
                      Conflict pairs
                    </h3>
                    <p className="text-[11px] text-[var(--color-subtle)]">
                      Sorted by minimum horizontal separation.
                    </p>
                  </header>
                  <ul className="flex-1 divide-y divide-[var(--color-border-soft)] overflow-y-auto">
                    {pagedConflicts.map((conflict) => {
                      const active = conflict.id === conflictId;
                      const resolved = resolvedConflictIds.has(conflict.id);
                      return (
                        <li key={conflict.id}>
                          <button
                            type="button"
                            onClick={() => handleConflictSelect(conflict)}
                            className={`flex w-full items-center justify-between px-4 py-3 text-left transition ${
                              active
                                ? "bg-[rgba(2,89,143,0.28)] text-white"
                                : "hover:bg-[rgba(8,31,58,0.6)]"
                            }`}
                          >
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {conflict.flightA} ↔ {conflict.flightB}
                              </p>
                              <p className="text-[11px] text-[var(--color-subtle)]">
                                {conflict.samples.length.toLocaleString(
                                  "en-US",
                                )}{" "}
                                samples · min sep{" "}
                                {conflict.minHorizontalNm.toFixed(2)} nm /{" "}
                                {conflict.minVerticalFt.toFixed(0)} ft
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide">
                              {resolved ? (
                                <span className="rounded-full bg-[rgba(16,162,82,0.18)] px-2 py-1 text-[var(--color-success)]">
                                  Solved
                                </span>
                              ) : null}
                              <span className="rounded-full border border-[rgba(255,255,255,0.08)] px-2 py-1 text-[var(--color-subtle)]">
                                {formatZuluTime(conflict.tStart)}Z
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <footer className="flex items-center justify-between border-t border-[var(--color-border-soft)] px-4 py-2 text-[11px] text-[var(--color-subtle)]">
                    <button
                      type="button"
                      onClick={() => goToConflictPage(conflictPageIndex - 1)}
                      disabled={!conflictHasPrev}
                      className={`rounded px-2 py-1 transition ${
                        conflictHasPrev
                          ? "border border-[var(--color-border)] text-white hover:border-[var(--color-azure)]"
                          : "border border-transparent opacity-40"
                      }`}
                    >
                      Prev
                    </button>
                    <span>
                      Page {conflictPageDisplayIndex} /{" "}
                      {conflictPageDisplayTotal}
                    </span>
                    <button
                      type="button"
                      onClick={() => goToConflictPage(conflictPageIndex + 1)}
                      disabled={!conflictHasNext}
                      className={`rounded px-2 py-1 transition ${
                        conflictHasNext
                          ? "border border-[var(--color-border)] text-white hover:border-[var(--color-azure)]"
                          : "border border-transparent opacity-40"
                      }`}
                    >
                      Next
                    </button>
                  </footer>
                </article>

                <article className="flex min-h-0 flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <header className="border-b border-[var(--color-border-soft)] px-4 py-3">
                    <h3 className="text-sm font-semibold text-white">
                      Conflict detail
                    </h3>
                    <p className="text-[11px] text-[var(--color-subtle)]">
                      Timeline, severity, and proposed resolutions.
                    </p>
                  </header>
                  {selectedConflict ? (
                    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                      <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[rgba(7,23,43,0.6)]">
                        <div className="border-b border-[var(--color-border-soft)] px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-[var(--color-subtle)]">
                          Mission control map
                        </div>
                        <div className="h-[220px]">
                          {mapData ? (
                            <TrajectoryDeckMap
                              mapData={mapData}
                              activeLayers={missionMapLayers}
                              activeMinute={null}
                              showOnlyFocused
                              focusedConflict={conflictFocus}
                              resolutionPreview={resolutionPreview}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-[var(--color-subtle)]">
                              Map data not available yet.
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="rounded-md bg-[rgba(8,31,58,0.6)] p-3">
                        <p className="text-xs text-[var(--color-subtle)]">
                          Window {formatZuluTime(selectedConflict.tStart)}Z →{" "}
                          {formatZuluTime(selectedConflict.tEnd)}Z (
                          {formatDuration(
                            selectedConflict.tEnd - selectedConflict.tStart,
                          )}
                          )
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-subtle)]">
                          Samples{" "}
                          {selectedConflict.samples.length.toLocaleString(
                            "en-US",
                          )}{" "}
                          · Horizontal{" "}
                          {selectedConflict.minHorizontalNm.toFixed(2)} nm ·
                          Vertical {selectedConflict.minVerticalFt.toFixed(0)}{" "}
                          ft
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                          Candidate actions
                        </h4>
                        {conflictSpecificResolutions.length > 0 ? (
                          <ul className="mt-3 flex flex-col gap-2">
                            {conflictSpecificResolutions.map((candidate) => (
                              <li key={candidate.id}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedResolutionId(candidate.id)
                                  }
                                  className={`w-full rounded border px-3 py-2 text-left transition ${
                                    candidate.id === resolutionId
                                      ? "border-[var(--color-azure)] bg-[rgba(10,59,99,0.55)] text-white"
                                      : "border-[var(--color-border)] bg-[rgba(7,23,43,0.6)] hover:border-[var(--color-azure)]"
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-white">
                                      {candidate.flightId}
                                    </span>
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                                        candidate.resolvesConflict
                                          ? "bg-[rgba(16,162,82,0.18)] text-[var(--color-success)]"
                                          : "bg-[rgba(255,196,45,0.12)] text-[var(--color-warning)]"
                                      }`}
                                    >
                                      {candidate.resolvesConflict
                                        ? "Solves"
                                        : "Pending"}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[11px] text-[var(--color-subtle)]">
                                    {describeAdjustment(candidate)} · Δcost{" "}
                                    {candidate.cost.toFixed(2)}
                                  </p>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-3 text-xs text-[var(--color-subtle)]">
                            No mitigation generated yet; queue scoring to
                            evaluate adjustments.
                          </p>
                        )}
                      </div>

                      <div className="rounded-md border border-[var(--color-border)] bg-[rgba(7,23,43,0.6)] px-3 py-3 text-xs">
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
                          <span>Gemini explanation</span>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border border-[rgba(255,255,255,0.12)] px-2 py-0.5 text-[9px]">
                              {explanationSource === "fallback"
                                ? "Fallback"
                                : explanationSource === "gemini"
                                  ? "Gemini"
                                  : "—"}
                            </span>
                            {explanationSource === "fallback" &&
                            explanationError ? (
                              <span className="text-[9px] uppercase tracking-[0.15em] text-[var(--color-warning)]">
                                Gemini error
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() =>
                                setRetryCount((count) => count + 1)
                              }
                              disabled={Boolean(
                                cooldownUntil && Date.now() < cooldownUntil,
                              )}
                              className="rounded border border-[rgba(255,255,255,0.12)] px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] text-[var(--color-subtle)] transition hover:border-[var(--color-azure)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Retry
                            </button>
                          </div>
                        </div>
                        {explanationStatus === "loading" ? (
                          <p className="mt-2 text-[var(--color-subtle)]">
                            Loading explanation…
                          </p>
                        ) : explanationStatus === "error" ? (
                          <p className="mt-2 text-[var(--color-subtle)]">
                            Gemini error.
                          </p>
                        ) : explanation ? (
                          <p className="mt-2 whitespace-pre-wrap text-[var(--color-subtle)]">
                            {explanation}
                          </p>
                        ) : (
                          <p className="mt-2 text-[var(--color-subtle)]">
                            {cooldownUntil && Date.now() < cooldownUntil
                              ? "Rate limited. Try again shortly."
                              : "No explanation available."}
                          </p>
                        )}
                        {selectedResolution ? (
                          <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-muted)]">
                            <span>
                              Solution:{" "}
                              {solutionSummary ??
                                buildFallbackSolution(selectedResolution)}
                            </span>
                            <span className="rounded-full border border-[rgba(255,255,255,0.12)] px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] text-[var(--color-muted)]">
                              {solutionSummary && explanationSource === "gemini"
                                ? "Gemini"
                                : "Fallback"}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center px-4 py-6 text-xs text-[var(--color-subtle)]">
                      Select a conflict to review severity metrics and actions.
                    </div>
                  )}
                </article>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center text-xs text-[var(--color-subtle)]">
              Import flight plans and run the analyzer to populate conflicts.
            </div>
          )
        ) : resolutionList.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <article className="flex min-h-0 flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
              <header className="border-b border-[var(--color-border-soft)] px-4 py-3">
                <h3 className="text-sm font-semibold text-white">
                  Resolution candidates
                </h3>
                <p className="text-[11px] text-[var(--color-subtle)]">
                  Ranked by composite cost.
                </p>
              </header>
              <ul className="flex-1 divide-y divide-[var(--color-border-soft)] overflow-y-auto">
                {pagedResolutions.map((candidate) => {
                  const active = candidate.id === resolutionId;
                  return (
                    <li key={candidate.id}>
                      <button
                        type="button"
                        onClick={() => handleResolutionSelect(candidate)}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left transition ${
                          active
                            ? "bg-[rgba(2,89,143,0.28)] text-white"
                            : "hover:bg-[rgba(8,31,58,0.6)]"
                        }`}
                      >
                        <div className="min-w-0 pr-3">
                          <p className="truncate text-sm font-semibold text-white">
                            {candidate.flightId}
                            <span className="ml-2 text-[11px] text-[var(--color-subtle)]">
                              {candidate.conflictFlights[0]} ↔{" "}
                              {candidate.conflictFlights[1]}
                            </span>
                          </p>
                          <p
                            className="text-[11px] text-[var(--color-subtle)]"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {describeAdjustment(candidate)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-[11px] uppercase tracking-wide">
                          <span className="rounded-full border border-[rgba(255,255,255,0.08)] px-2 py-1 text-[var(--color-subtle)]">
                            Cost {candidate.cost.toFixed(2)}
                          </span>
                          {candidate.resolvesConflict ? (
                            <span className="rounded-full bg-[rgba(16,162,82,0.18)] px-2 py-1 text-[var(--color-success)]">
                              Solves
                            </span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <footer className="flex items-center justify-between border-t border-[var(--color-border-soft)] px-4 py-2 text-[11px] text-[var(--color-subtle)]">
                <button
                  type="button"
                  onClick={() => goToResolutionPage(resolutionPageIndex - 1)}
                  disabled={!resolutionHasPrev}
                  className={`rounded px-2 py-1 transition ${
                    resolutionHasPrev
                      ? "border border-[var(--color-border)] text-white hover:border-[var(--color-azure)]"
                      : "border border-transparent opacity-40"
                  }`}
                >
                  Prev
                </button>
                <span>
                  Page {resolutionPageDisplayIndex} /{" "}
                  {resolutionPageDisplayTotal}
                </span>
                <button
                  type="button"
                  onClick={() => goToResolutionPage(resolutionPageIndex + 1)}
                  disabled={!resolutionHasNext}
                  className={`rounded px-2 py-1 transition ${
                    resolutionHasNext
                      ? "border border-[var(--color-border)] text-white hover:border-[var(--color-azure)]"
                      : "border border-transparent opacity-40"
                  }`}
                >
                  Next
                </button>
              </footer>
            </article>

            <article className="flex min-h-0 flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
              <header className="border-b border-[var(--color-border-soft)] px-4 py-3">
                <h3 className="text-sm font-semibold text-white">
                  Candidate detail
                </h3>
                <p className="text-[11px] text-[var(--color-subtle)]">
                  Impact estimate and controller notes.
                </p>
              </header>
              {selectedResolution ? (
                <div className="flex flex-1 flex-col gap-4 px-4 py-4 text-xs text-[var(--color-subtle)]">
                  <div className="rounded-md bg-[rgba(8,31,58,0.6)] p-3">
                    <p className="text-sm font-semibold text-white">
                      {selectedResolution.flightId}
                    </p>
                    <p className="mt-1">
                      Conflict {selectedResolution.conflictFlights[0]} ↔{" "}
                      {selectedResolution.conflictFlights[1]}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded border border-[var(--color-border)] bg-[rgba(8,31,58,0.45)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
                        Horizontal gain
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        +
                        {selectedResolution.estimatedHorizontalGainNm.toFixed(
                          2,
                        )}{" "}
                        nm
                      </p>
                    </div>
                    <div className="rounded border border-[var(--color-border)] bg-[rgba(8,31,58,0.45)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
                        Vertical gain
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        +
                        {selectedResolution.estimatedVerticalGainFt.toLocaleString(
                          "en-US",
                        )}{" "}
                        ft
                      </p>
                    </div>
                    <div className="rounded border border-[var(--color-border)] bg-[rgba(8,31,58,0.45)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
                        Adjustment
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {describeAdjustment(selectedResolution)}
                      </p>
                    </div>
                    <div className="rounded border border-[var(--color-border)] bg-[rgba(8,31,58,0.45)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
                        Outcome
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {selectedResolution.resolvesConflict
                          ? "Expected to clear"
                          : "Further review"}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-md border border-[var(--color-border)] bg-[rgba(7,23,43,0.6)] px-3 py-3 text-xs">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
                      Controller note
                    </p>
                    <p className="mt-2 leading-relaxed">
                      {selectedResolution.notes ?? "No notes provided."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center px-4 py-6 text-xs text-[var(--color-subtle)]">
                  Select a candidate to inspect impact estimates.
                </div>
              )}
            </article>
          </div>
        ) : scoringResolutionsPending ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center text-xs text-[var(--color-subtle)]">
            Scoring mitigation options… this view updates automatically.
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center text-xs text-[var(--color-subtle)]">
            Generate conflict analysis to propose viable resolutions.
          </div>
        )}
      </div>
    </section>
  );
}
