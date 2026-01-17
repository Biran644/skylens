"use client";

import { ReactNode } from "react";

type MissionControlPanelProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function MissionControlPanel({
  open,
  onClose,
  children,
}: MissionControlPanelProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-[rgba(3,7,18,0.9)] backdrop-blur-sm">
      {/* Close button */}
      <div className="absolute right-6 top-6">
        <button
          onClick={onClose}
          className="rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--color-azure)] hover:text-[var(--color-azure)]"
        >
          ✕ Close
        </button>
      </div>

      {/* Panel content */}
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="h-full w-full max-w-[1400px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          {children}
        </div>
      </div>
    </div>
  );
}
