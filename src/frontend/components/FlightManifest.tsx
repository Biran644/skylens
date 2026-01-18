"use client";

import { useMemo, useState } from "react";
import { Flight } from "../../backend/types/domain";

const PAGE_SIZE = 12;

const formatUtc = (epochSec: number) =>
  new Date(epochSec * 1000).toISOString().replace("T", " ").slice(0, 19);

const getAirlineCode = (callsign: string) => {
  const match = callsign
    .trim()
    .toUpperCase()
    .match(/^[A-Z]{2,4}/);
  return match?.[0] ?? "UNKNOWN";
};

type FlightManifestProps = {
  flights?: Flight[] | null;
};

export function FlightManifest({ flights }: FlightManifestProps) {
  const [airlineFilter, setAirlineFilter] = useState("all");
  const [minAltitude, setMinAltitude] = useState<string>("");
  const [maxAltitude, setMaxAltitude] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [page, setPage] = useState(0);

  const list = useMemo(() => flights ?? [], [flights]);

  const airlineOptions = useMemo(() => {
    const set = new Set(list.map((flight) => getAirlineCode(flight.callsign)));
    return Array.from(set).sort();
  }, [list]);

  const filtered = useMemo(() => {
    const minAlt = minAltitude ? Number(minAltitude) : null;
    const maxAlt = maxAltitude ? Number(maxAltitude) : null;
    const startEpoch = startTime
      ? Math.floor(new Date(startTime).getTime() / 1000)
      : null;
    const endEpoch = endTime
      ? Math.floor(new Date(endTime).getTime() / 1000)
      : null;

    return list.filter((flight) => {
      if (airlineFilter !== "all") {
        const airline = getAirlineCode(flight.callsign);
        if (airline !== airlineFilter) {
          return false;
        }
      }
      if (minAlt !== null && flight.cruiseAltitudeFt < minAlt) {
        return false;
      }
      if (maxAlt !== null && flight.cruiseAltitudeFt > maxAlt) {
        return false;
      }
      if (startEpoch !== null && flight.departureTime < startEpoch) {
        return false;
      }
      if (endEpoch !== null && flight.departureTime > endEpoch) {
        return false;
      }
      return true;
    });
  }, [airlineFilter, endTime, list, maxAltitude, minAltitude, startTime]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageIndex = Math.min(Math.max(page, 0), pageCount - 1);
  const pageItems = filtered.slice(
    pageIndex * PAGE_SIZE,
    pageIndex * PAGE_SIZE + PAGE_SIZE,
  );

  const goToPage = (nextPage: number) => {
    const bounded = Math.min(Math.max(nextPage, 0), pageCount - 1);
    setPage(bounded);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5 shadow-[0_12px_38px_rgba(0,10,26,0.4)]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Flight manifest</h2>
          <p className="text-xs text-[var(--color-muted)]">
            Filtered view of imported flight plans.
          </p>
        </div>
        <div className="text-xs text-[var(--color-subtle)]">
          {filtered.length.toLocaleString("en-US")} flights
        </div>
      </header>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.2em] text-[var(--color-subtle)]">
          Airline
          <select
            value={airlineFilter}
            onChange={(event) => {
              setAirlineFilter(event.target.value);
              setPage(0);
            }}
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-white"
          >
            <option value="all">All</option>
            {airlineOptions.map((airline) => (
              <option key={airline} value={airline}>
                {airline}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.2em] text-[var(--color-subtle)]">
          Altitude min (ft)
          <input
            type="number"
            value={minAltitude}
            onChange={(event) => {
              setMinAltitude(event.target.value);
              setPage(0);
            }}
            placeholder="e.g. 24000"
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-white"
          />
        </label>

        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.2em] text-[var(--color-subtle)]">
          Altitude max (ft)
          <input
            type="number"
            value={maxAltitude}
            onChange={(event) => {
              setMaxAltitude(event.target.value);
              setPage(0);
            }}
            placeholder="e.g. 40000"
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-white"
          />
        </label>

        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.2em] text-[var(--color-subtle)]">
          Departure window
          <div className="grid grid-cols-2 gap-2">
            <input
              type="datetime-local"
              value={startTime}
              onChange={(event) => {
                setStartTime(event.target.value);
                setPage(0);
              }}
              className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[11px] text-white"
            />
            <input
              type="datetime-local"
              value={endTime}
              onChange={(event) => {
                setEndTime(event.target.value);
                setPage(0);
              }}
              className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[11px] text-white"
            />
          </div>
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="min-w-full text-left text-xs text-[var(--color-muted)]">
          <thead className="bg-[rgba(7,23,43,0.8)] text-[11px] uppercase tracking-[0.2em] text-[var(--color-subtle)]">
            <tr>
              <th className="px-3 py-2">Callsign</th>
              <th className="px-3 py-2">Aircraft</th>
              <th className="px-3 py-2">Route</th>
              <th className="px-3 py-2">Altitude</th>
              <th className="px-3 py-2">Speed</th>
              <th className="px-3 py-2">Departure (UTC)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
            {pageItems.length > 0 ? (
              pageItems.map((flight) => (
                <tr key={flight.id} className="hover:bg-[rgba(10,30,55,0.55)]">
                  <td className="px-3 py-2 font-semibold text-white">
                    {flight.callsign}
                  </td>
                  <td className="px-3 py-2">{flight.planeType}</td>
                  <td className="px-3 py-2">
                    {flight.departureAirport} → {flight.arrivalAirport}
                  </td>
                  <td className="px-3 py-2">
                    {flight.cruiseAltitudeFt.toLocaleString("en-US")} ft
                  </td>
                  <td className="px-3 py-2">
                    {flight.cruiseSpeedKt.toFixed(0)} kt
                  </td>
                  <td className="px-3 py-2">
                    {formatUtc(flight.departureTime)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-3 py-6 text-center text-[var(--color-subtle)]"
                  colSpan={6}
                >
                  No flights match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-subtle)]">
        <span>
          Page {pageIndex + 1} of {pageCount}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(pageIndex - 1)}
            disabled={pageIndex === 0}
            className="rounded border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-azure)] hover:text-white disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => goToPage(pageIndex + 1)}
            disabled={pageIndex >= pageCount - 1}
            className="rounded border border-[var(--color-border)] px-3 py-1 transition hover:border-[var(--color-azure)] hover:text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
