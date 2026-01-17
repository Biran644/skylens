"use client";

import { ChangeEvent, useState, useTransition } from "react";
import { ingestFlightsAction } from "../../backend/actions/ingestFlights";
import {
  AnalyzeConflictsResult,
  analyzeConflictsAction,
} from "../../backend/actions/analyzeConflicts";

type FlightImportPanelProps = {
  onAnalysis?: (result: AnalyzeConflictsResult) => void;
};

export function FlightImportPanel({ onAnalysis }: FlightImportPanelProps) {
  const [inputText, setInputText] = useState("");
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<
    AnalyzeConflictsResult["summary"] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  return (
    <section className="flex w-full max-w-3xl flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 text-sm text-[var(--color-muted)] shadow-[0_10px_35px_rgba(0,12,30,0.45)]">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">Import Flight Plan</h2>
        <p className="text-xs text-[var(--color-subtle)]">
          Upload synthetic JSON or CSV files containing planned flights. All
          processing runs in server actions; no data is persisted.
        </p>
      </header>

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

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded bg-[var(--color-azure)] px-4 py-2 text-sm font-semibold text-[#00132b] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[rgba(0,159,223,0.25)] disabled:text-[var(--color-subtle)]"
        >
          {isPending ? "Processing…" : "Process Flights"}
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
    </section>
  );
}

export default FlightImportPanel;
