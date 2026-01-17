"use client";

import { useState } from "react";

const layers = ["Trajectories", "Conflicts", "Hotspots", "Airspace"] as const;

type LayerKey = (typeof layers)[number];

export function TrajectoryMapShell() {
  const [activeLayers, setActiveLayers] = useState<LayerKey[]>([
    "Trajectories",
    "Conflicts",
  ]);

  const toggleLayer = (layer: LayerKey) => {
    setActiveLayers((prev) =>
      prev.includes(layer)
        ? prev.filter((item) => item !== layer)
        : [...prev, layer],
    );
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 shadow-[0_15px_45px_rgba(0,8,22,0.45)]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Trajectory Map</h2>
          <p className="text-xs text-[var(--color-muted)]">
            Deck.gl + Mapbox to render synthetic traffic over Canadian FIRs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {layers.map((layer) => {
            const active = activeLayers.includes(layer);
            return (
              <button
                key={layer}
                type="button"
                onClick={() => toggleLayer(layer)}
                className={`rounded-full border px-3 py-1 font-medium transition ${
                  active
                    ? "border-[var(--color-azure)] bg-[var(--color-azure-soft)] text-[var(--color-azure)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-azure)] hover:text-white"
                }`}
              >
                {layer}
              </button>
            );
          })}
        </div>
      </header>

      <div className="mt-6 flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-subtle)]">
        Interactive map placeholder
      </div>

      <footer className="mt-6 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>Timeline scrubber (UTC)</span>
          <div className="flex items-center gap-2">
            <button className="rounded border border-[var(--color-border)] px-2 py-1 text-[var(--color-muted)] transition hover:border-[var(--color-azure)] hover:text-white">
              Rewind
            </button>
            <button className="rounded border border-[var(--color-border)] px-2 py-1 text-[var(--color-muted)] transition hover:border-[var(--color-azure)] hover:text-white">
              Play
            </button>
            <button className="rounded border border-[var(--color-border)] px-2 py-1 text-[var(--color-muted)] transition hover:border-[var(--color-azure)] hover:text-white">
              Pause
            </button>
          </div>
        </div>
        <div className="h-2 rounded-full bg-[var(--color-surface)]">
          <div className="h-2 w-1/4 rounded-full bg-[var(--color-azure)]" />
        </div>
        <div className="flex justify-between text-[11px] text-[var(--color-subtle)]">
          <span>00:00Z</span>
          <span>12:00Z</span>
          <span>24:00Z</span>
        </div>
      </footer>
    </section>
  );
}
