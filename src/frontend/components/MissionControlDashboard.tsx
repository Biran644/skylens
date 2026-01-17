"use client";

import { useState } from "react";

type MissionTab = "Conflicts" | "Resolutions" | "Hotspots";

export function MissionControlDashboard() {
  const [tab, setTab] = useState<MissionTab>("Conflicts");

  return (
    <div className="grid h-full grid-cols-[320px_minmax(0,1fr)]">
      {/* Left rail */}
      <aside className="min-h-0 border-r border-[var(--color-border)] bg-[var(--color-panel)] p-6">
        <h2 className="text-lg font-semibold text-white">Mission Control</h2>
        <p className="mt-1 text-xs text-[var(--color-subtle)]">
          Triage conflicts, review candidates, and take actions.
        </p>

        <nav className="mt-6 flex flex-col gap-2 text-sm">
          {(["Conflicts", "Resolutions", "Hotspots"] as const).map((t) => {
            const active = t === tab;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  active
                    ? "border-[var(--color-azure)] bg-[var(--color-azure-soft)] text-[var(--color-azure)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-azure)] hover:text-white"
                }`}
              >
                {t}
              </button>
            );
          })}
        </nav>

        <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs uppercase tracking-widest text-[var(--color-subtle)]">
            Selected tab
          </p>
          <p className="mt-2 text-sm font-semibold text-white">{tab}</p>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            (Next step: render real content from conflicts/resolutions)
          </p>
        </div>
      </aside>

      {/* Main workspace */}
      <main className="min-h-0 overflow-auto bg-[var(--color-panel)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-subtle)]">
              Workspace
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">
              {tab}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-muted)] transition hover:border-[var(--color-azure)] hover:text-white">
              Export
            </button>
            <button className="rounded bg-[var(--color-azure)] px-3 py-2 font-semibold text-[#00132b] transition hover:brightness-110">
              Take action
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <h4 className="text-sm font-semibold text-white">Primary panel</h4>
            <p className="mt-2 text-xs text-[var(--color-subtle)]">
              Here we’ll show the main list (conflict pairs / candidates / hotspots).
            </p>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <h4 className="text-sm font-semibold text-white">Detail panel</h4>
            <p className="mt-2 text-xs text-[var(--color-subtle)]">
              Here we’ll show selected item detail (timeline, metrics, buttons).
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
