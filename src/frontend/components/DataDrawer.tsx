"use client";

import { useState } from "react";

export function DataDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Data & Timeline</h3>
          <p className="text-xs text-[var(--color-muted)]">
            Inspect raw plan data and conflict cadence.
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-muted)]">
            <h4 className="text-sm font-semibold text-white">
              Flight manifest
            </h4>
            <p className="mt-2 text-xs text-[var(--color-subtle)]">
              Paginated table of imported flights with filters for airline,
              altitude, time window. Populate after ingest.
            </p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-muted)]">
            <h4 className="text-sm font-semibold text-white">
              Conflict timeline
            </h4>
            <p className="mt-2 text-xs text-[var(--color-subtle)]">
              Stacked bars showing conflicts per minute bucket; highlights
              hotspots and resolution effects.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
