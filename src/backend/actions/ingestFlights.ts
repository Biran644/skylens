"use server";

import { parseFlightText } from "../lib/dataImport";
import { RawFlight } from "../types/domain";

export type IngestResult = {
  flights: RawFlight[];
  count: number;
};

export async function ingestFlightsAction(
  rawText: string,
): Promise<IngestResult> {
  const flights = parseFlightText(rawText);
  return {
    flights,
    count: flights.length,
  };
}
