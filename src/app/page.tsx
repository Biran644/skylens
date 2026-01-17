import { DashboardLayout } from "../frontend/components/DashboardLayout";
import { FlightImportPanel } from "../frontend/components/FlightImportPanel";
import { ScenarioSummary } from "../frontend/components/ScenarioSummary";
import { TrajectoryMapShell } from "../frontend/components/TrajectoryMapShell";
import { InsightsSidebar } from "../frontend/components/InsightsSidebar";
import { DataDrawer } from "../frontend/components/DataDrawer";

export default function HomePage() {
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

      <ScenarioSummary />

      <FlightImportPanel />
    </>
  );

  const mapArea = <TrajectoryMapShell />;

  const rightColumn = <InsightsSidebar />;

  const bottomDrawer = <DataDrawer />;

  return (
    <DashboardLayout
      leftColumn={leftColumn}
      mapArea={mapArea}
      rightColumn={rightColumn}
      bottomDrawer={bottomDrawer}
    />
  );
}
