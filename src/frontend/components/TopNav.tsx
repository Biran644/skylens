"use client";

import Link from "next/link";
import { HypermediaNavLink } from "../types/navigation";

type TopNavProps = {
  scenarioName: string;
  lastRun: string;
  links: HypermediaNavLink[];
  activeRel: string;
};

export function TopNav({
  scenarioName,
  lastRun,
  links,
  activeRel,
}: TopNavProps) {
  const renderLink = (link: HypermediaNavLink) => {
    const active = link.rel === activeRel;
    const baseClasses =
      "rounded-full border px-4 py-2 font-medium tracking-wider transition";

    if (link.disabled) {
      return (
        <span
          key={link.rel}
          className={`${baseClasses} border-[rgba(255,255,255,0.08)] text-[var(--color-muted)] opacity-60`}
          aria-disabled="true"
        >
          {link.label}
        </span>
      );
    }

    return (
      <Link
        key={link.rel}
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={`${baseClasses} ${
          active
            ? "border-[var(--color-azure)] bg-[rgba(0,159,223,0.15)] text-white"
            : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-azure)] hover:text-white"
        }`}
      >
        {link.label}
      </Link>
    );
  };

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

      <nav className="hidden flex-1 items-center justify-center gap-3 text-xs text-[var(--color-muted)] lg:flex">
        {links.map(renderLink)}
      </nav>

      <div className="flex items-center gap-4 text-xs">
        <div className="hidden flex-col text-right text-[var(--color-subtle)] sm:flex">
          <span className="font-semibold text-white">{scenarioName}</span>
          <span>{lastRun}</span>
        </div>
        <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[var(--color-subtle)]">
          HATEOAS NAV
        </span>
      </div>
    </header>
  );
}
