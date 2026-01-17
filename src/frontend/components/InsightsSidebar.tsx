"use client";

import { useState } from "react";

const tabs = ["Conflicts", "Hotspots", "Resolutions", "Insights"] as const;

type TabKey = (typeof tabs)[number];

type TabCard = {
  title: string;
  body: string;
  accent?: string;
};

const tabContent: Record<TabKey, TabCard[]> = {
  Conflicts: [
    {
      title: "No data loaded",
      body: "Run the conflict detection pipeline to populate severity-ranked events with map focusing support.",
    },
    {
      title: "How it works",
      body: "SkyLens uses deterministic space-time hashing and fine-grained interpolation to identify loss-of-separation candidates in 4D.",
    },
  ],
  Hotspots: [
    {
      title: "Airspace hotspot roadmap",
      body: "Aggregates conflict samples per 1° grid cell and minute bucket to surface congested corridors for planners.",
    },
  ],
  Resolutions: [
    {
      title: "Resolution queue",
      body: "For each conflict, SkyLens evaluates delay, altitude, and speed candidates against constraints, selecting the lowest cost safe option.",
    },
  ],
  Insights: [
    {
      title: "LLM summary (optional)",
      body: "Use Gemini to narrate top conflicts, hotspots, and cost trade-offs for briefing slides. Disabled until data is imported.",
    },
  ],
};

export function InsightsSidebar() {
  const [activeTab, setActiveTab] = useState<TabKey>("Conflicts");

  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[0_14px_38px_rgba(0,8,22,0.45)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-5 py-4">
        <h2 className="text-lg font-semibold text-white">Mission Control</h2>
        <span className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-subtle)]">
          Review & act
        </span>
      </header>

      <nav className="flex border-b border-[var(--color-border-soft)] text-sm">
        {tabs.map((tab) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 font-medium transition ${
                active
                  ? "border-b-2 border-[var(--color-azure)] text-[var(--color-azure)]"
                  : "text-[var(--color-muted)] hover:text-white"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </nav>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5 text-sm text-[var(--color-muted)]">
        {tabContent[activeTab].map((card) => (
          <article
            key={`${activeTab}-${card.title}`}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <h3 className="text-sm font-semibold text-white">{card.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-subtle)]">
              {card.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
