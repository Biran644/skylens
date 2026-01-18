"use client";

import { ChangeEvent, useState, useTransition } from "react";
import { ingestFlightsAction } from "../../backend/actions/ingestFlights";
import {
  AnalyzeConflictsResult,
  analyzeConflictsAction,
} from "../../backend/actions/analyzeConflicts";

type FlightImportPanelProps = {
  onAnalysis?: (result: AnalyzeConflictsResult) => void;
  variant?: "card" | "inline";
};

export function FlightImportPanel({
  onAnalysis,
  variant = "card",
}: FlightImportPanelProps) {
  const [inputText, setInputText] = useState("");
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<
    AnalyzeConflictsResult["summary"] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      setInputText(text);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    }
  };

  const handleSubmit = () => {
    if (!inputText.trim()) {
      setError("Provide JSON or CSV flight data first");
      return;
    }

    startTransition(async () => {
      try {
        const result = await ingestFlightsAction(inputText);
        if (result.count === 0) {
          setParsedCount(null);
          setAnalysisSummary(null);
          setError("No flights detected in provided data");
          return;
        }

        const analysis = await analyzeConflictsAction(result.flights);
        setParsedCount(result.count);
        setAnalysisSummary(analysis.summary);
        setError(null);
        onAnalysis?.(analysis);
      } catch (err) {
        setParsedCount(null);
        setAnalysisSummary(null);
        setError(
          err instanceof Error ? err.message : "Failed to ingest flights",
        );
      }
    });
  };

  const content = (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded border border-[var(--color-azure)] bg-[var(--color-azure-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-azure)] transition hover:brightness-110"
        >
          Import flight plan
        </button>
        {parsedCount !== null && !error ? (
          <span className="text-xs text-[#5be7a9]">
            Loaded {parsedCount} flights
            {analysisSummary
              ? ` · ${analysisSummary.averageSegmentsPerFlight.toFixed(1)} segments/flight · ${analysisSummary.conflicts.toLocaleString("en-US")} conflicts`
              : ""}
          </span>
        ) : null}

        {error ? <span className="text-xs text-[#ff8ba7]">{error}</span> : null}
      </div>

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(3,7,18,0.7)] p-6 backdrop-blur"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 shadow-[0_20px_50px_rgba(0,12,30,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Import flight plan
                </h3>
                <p className="text-xs text-[var(--color-subtle)]">
                  Upload JSON/CSV or paste raw data to run the analysis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-subtle)] transition hover:border-[var(--color-azure)] hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-[var(--color-subtle)]">
                  Upload file
                </label>
                <input
                  type="file"
                  accept=".json,.csv,application/json,text/csv"
                  onChange={handleFileChange}
                  className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white focus:border-[var(--color-azure)] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-[var(--color-subtle)]">
                  Paste JSON or CSV
                </label>
                <textarea
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)}
                  placeholder='[{ "ACID": "ACA101", ... }]'
                  rows={8}
                  className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 font-mono text-xs text-white focus:border-[var(--color-azure)] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="rounded bg-[var(--color-azure)] px-4 py-2 text-sm font-semibold text-[#00132b] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[rgba(0,159,223,0.25)] disabled:text-[var(--color-subtle)]"
                >
                  {isPending ? "Processing…" : "Process Flights"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-subtle)] transition hover:border-[var(--color-azure)] hover:text-white"
                >
                  Cancel
                </button>
                {parsedCount !== null && !error ? (
                  <span className="text-xs text-[#5be7a9]">
                    Loaded {parsedCount} flights
                    {analysisSummary
                      ? ` · ${analysisSummary.averageSegmentsPerFlight.toFixed(1)} segments/flight · ${analysisSummary.conflicts.toLocaleString("en-US")} conflicts`
                      : ""}
                  </span>
                ) : null}

                {error ? (
                  <span className="text-xs text-[#ff8ba7]">{error}</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  if (variant === "inline") {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border-soft)] bg-[rgba(6,24,44,0.55)] px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-subtle)]">
            Data intake
          </span>
          <p className="text-xs text-[var(--color-muted)]">
            Upload JSON/CSV or paste routes to run analysis.
          </p>
        </div>
        {content}
      </div>
    );
  }

  return (
    <section className="flex w-full max-w-3xl flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 text-sm text-[var(--color-muted)] shadow-[0_10px_35px_rgba(0,12,30,0.45)]">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">Import Flight Plan</h2>
        <p className="text-xs text-[var(--color-subtle)]">
          Upload synthetic JSON or CSV files containing planned flights. All
          processing runs in server actions; no data is persisted.
        </p>
      </header>
      {content}
    </section>
  );
}

export default FlightImportPanel;
