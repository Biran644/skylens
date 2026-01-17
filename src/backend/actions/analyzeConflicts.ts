"use server";

import { buildConflicts, detectConflictSamples } from "../lib/conflicts";
import { sampleFlights } from "../lib/sampling";
import { buildFlightFromRaw } from "../lib/segments";
import {
  AnalysisSummary,
  Conflict,
  ConflictSample,
  Flight,
  RawFlight,
} from "../types/domain";

export type AnalyzeConflictsResult = {
  summary: AnalysisSummary;
  flights: Flight[];
  conflicts: Conflict[];
  conflictSamples: ConflictSample[];
};

export async function analyzeConflictsAction(
  rawFlights: RawFlight[],
): Promise<AnalyzeConflictsResult> {
  if (rawFlights.length === 0) {
    return {
      flights: [],
      conflicts: [],
      conflictSamples: [],
      summary: {
        flights: 0,
        segments: 0,
        samples: 0,
        averageSegmentsPerFlight: 0,
        averageSamplesPerFlight: 0,
        conflicts: 0,
        conflictSamples: 0,
      },
    };
  }

  const flights = rawFlights.map(buildFlightFromRaw);
  const segmentsCount = flights.reduce(
    (acc, flight) => acc + flight.segments.length,
    0,
  );
  const samples = sampleFlights(flights);
  const conflictSamples = detectConflictSamples(samples);
  const conflicts = buildConflicts(conflictSamples);

  const summary: AnalysisSummary = {
    flights: flights.length,
    segments: segmentsCount,
    samples: samples.length,
    averageSegmentsPerFlight: segmentsCount / flights.length,
    averageSamplesPerFlight: samples.length / flights.length,
    conflicts: conflicts.length,
    conflictSamples: conflictSamples.length,
  };

  return {
    flights,
    conflicts,
    conflictSamples,
    summary,
  };
}
