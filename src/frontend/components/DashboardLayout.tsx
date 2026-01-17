import { ReactNode } from "react";
import { TopNav } from "./TopNav";

type DashboardLayoutProps = {
  leftColumn: ReactNode;
  mapArea: ReactNode;
  rightColumn: ReactNode;
  bottomDrawer?: ReactNode;
};

export function DashboardLayout({
  leftColumn,
  mapArea,
  rightColumn,
  bottomDrawer,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col text-[var(--color-text)]">
      <TopNav />

      <div className="flex flex-1 flex-col overflow-hidden px-6 pb-6 pt-4 xl:px-10">
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
      </div>
    </div>
  );
}
