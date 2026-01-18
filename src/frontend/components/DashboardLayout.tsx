"use client";

import { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { DashboardView, HypermediaNavLink } from "../types/navigation";

type DashboardLayoutProps = {
  leftColumn: ReactNode;
  mapArea: ReactNode;
  rightColumn: ReactNode;
  bottomDrawer?: ReactNode;
  scenarioName: string;
  lastRun: string;
  navigationLinks: HypermediaNavLink[];
  activeView: DashboardView;
  missionControlFull: ReactNode;
};

export function DashboardLayout({
  leftColumn,
  mapArea,
  rightColumn,
  bottomDrawer,
  scenarioName,
  lastRun,
  navigationLinks,
  activeView,
  missionControlFull,
}: DashboardLayoutProps) {
  const isOverview = activeView === "overview";

  const renderSingleColumn = () => {
    if (activeView === "data") {
      return (
        <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-auto pr-1">
          {leftColumn}
        </div>
      );
    }

    if (activeView === "map") {
      return (
        <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden">
          {mapArea}
        </div>
      );
    }

    if (activeView === "mission-control") {
      return (
        <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-auto pl-1">
          {missionControlFull}
        </div>
      );
    }

    if (activeView === "timeline") {
      return bottomDrawer ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 shadow-[0_12px_38px_rgba(0,10,26,0.4)]">
          {bottomDrawer}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-8 text-sm text-[var(--color-subtle)]">
          Timeline data becomes available after running an analysis.
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex min-h-screen flex-col text-[var(--color-text)]">
      <TopNav
        scenarioName={scenarioName}
        lastRun={lastRun}
        links={navigationLinks}
        activeRel={activeView}
      />

      <div className="flex flex-1 flex-col overflow-hidden px-6 pb-6 pt-4 xl:px-10">
        {isOverview ? (
          <>
            <div className="grid flex-1 gap-4 overflow-hidden xl:grid-cols-[320px_minmax(0,1fr)_360px]">
              <div className="flex min-h-0 flex-col gap-4 overflow-auto pr-1">
                {leftColumn}
              </div>
              <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
                {mapArea}
              </div>
              <div className="flex min-h-0 flex-col gap-4 overflow-auto pl-1">
                {rightColumn}
              </div>
            </div>

            {bottomDrawer ? (
              <div className="mt-4 min-h-[180px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
                {bottomDrawer}
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            {renderSingleColumn()}
          </div>
        )}
      </div>
    </div>
  );
}
