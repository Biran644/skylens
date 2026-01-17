"use client";

type TopNavProps = {
  scenarioName: string;
  lastRun: string;
};

export function TopNav({ scenarioName, lastRun }: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-[var(--color-border-strong)] bg-[var(--color-navy-glass)] px-6 shadow-[0_10px_30px_rgba(0,21,60,0.45)] backdrop-blur xl:px-10">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-azure-soft)] text-sm font-semibold text-[var(--color-azure)]">
          SL
        </div>
        <div className="flex flex-col">
          <span className="text-base font-semibold tracking-wide text-white">
            SkyLens
          </span>
          <span className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-subtle)]">
            Trajectory insight · synthetic only
          </span>
        </div>
      </div>

      <div className="hidden flex-1 items-center justify-center gap-6 text-xs text-[var(--color-muted)] lg:flex">
        <button className="rounded-full border border-[var(--color-border)] px-4 py-2 font-medium tracking-wider text-[var(--color-muted)] transition hover:border-[var(--color-azure)] hover:text-white">
          Upload dataset
        </button>
        <button className="rounded-full border border-[var(--color-border)] px-4 py-2 font-medium tracking-wider text-[var(--color-muted)] transition hover:border-[var(--color-azure)] hover:text-white">
          Paste JSON
        </button>
        <button className="rounded-full border border-[var(--color-border)] px-4 py-2 font-medium tracking-wider text-[var(--color-muted)] transition hover:border-[var(--color-azure)] hover:text-white">
          Load sample day
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div className="hidden flex-col text-right text-[var(--color-subtle)] sm:flex">
          <span className="font-semibold text-white">{scenarioName}</span>
          <span>{lastRun}</span>
        </div>
        <button
          type="button"
          className="rounded-lg border border-[var(--color-border)] px-3 py-2 font-medium text-[var(--color-muted)] transition hover:border-[var(--color-azure)] hover:text-white"
        >
          Configure run
        </button>
        <button
          type="button"
          className="rounded-lg bg-[var(--color-azure)] px-4 py-2 text-sm font-semibold text-[#00132b] transition hover:brightness-110"
        >
          Analyze day
        </button>
      </div>
    </header>
  );
}
