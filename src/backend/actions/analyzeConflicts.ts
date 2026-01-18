"use server";

import { buildConflicts, detectConflictSamples } from "../lib/conflicts";
import { buildTrajectoryMapData } from "../lib/mapData";
import { sampleFlights } from "../lib/sampling";
import { buildFlightFromRaw } from "../lib/segments";
import {
  AnalysisSummary,
  Conflict,
  ConflictSample,
  DEFAULT_FINE_STEP_SEC,
  Flight,
  RawFlight,
  TrajectoryMapData,
} from "../types/domain";

export type AnalyzeConflictsResult = {
  summary: AnalysisSummary;
  flights: Flight[];
  conflicts: Conflict[];
  conflictSamples: ConflictSample[];
  mapData: TrajectoryMapData;
};

export async function analyzeConflictsAction(
  rawFlights: RawFlight[],
): Promise<AnalyzeConflictsResult> {
  if (rawFlights.length === 0) {
    return {
      flights: [],
      conflicts: [],
      conflictSamples: [],
      mapData: buildTrajectoryMapData(),
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
  const samples = sampleFlights(flights, DEFAULT_FINE_STEP_SEC);
  const conflictSamples = detectConflictSamples(samples);
  const conflicts = buildConflicts(conflictSamples);
  const mapData = buildTrajectoryMapData(flights, conflicts, conflictSamples);

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
    mapData,
    summary,
  };
}
