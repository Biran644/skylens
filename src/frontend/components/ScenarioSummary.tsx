export function ScenarioSummary() {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5 shadow-[0_12px_40px_rgba(0,10,25,0.35)]">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Scenario KPIs</h2>
          <p className="text-xs text-[var(--color-muted)]">
            Live after next analysis run
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-azure-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-azure)]">
          demo
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-subtle)]">
            Flights
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">—</p>
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">
            Total planned departures
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-subtle)]">
            Conflicts detected
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#ffcf6a]">—</p>
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">
            Loss-of-separation events
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-subtle)]">
            Auto-resolved
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#5be7a9]">—</p>
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">
            No new conflicts introduced
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-subtle)]">
            Outstanding
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#ff8ba7]">—</p>
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">
            Needs planner review
          </p>
        </div>
      </div>

      <footer className="mt-4 flex flex-col gap-2 text-xs text-[var(--color-muted)]">
        <p>
          Objective: minimize delay, altitude, speed adjustments while removing
          all conflicts.
        </p>
        <p className="text-[11px] text-[var(--color-subtle)]">
          Synthetic data only. Results are explanations for hackathon judges,
          not operational directives.
        </p>
      </footer>
    </section>
  );
}
