"use server";

import {
  Conflict,
  ResolutionCandidate,
  HORIZONTAL_THRESHOLD_NM,
  VERTICAL_THRESHOLD_FT,
} from "../types/domain";

export type ScoreResolutionsResult = {
  candidates: ResolutionCandidate[];
};

const roundCost = (value: number) => Math.round(value * 100) / 100;

export async function scoreResolutionsAction(
  conflicts: Conflict[],
): Promise<ScoreResolutionsResult> {
  if (conflicts.length === 0) {
    return { candidates: [] };
  }

  const candidates: ResolutionCandidate[] = [];

  type CandidateInput = Omit<
    ResolutionCandidate,
    "cost" | "status" | "resolvesConflict"
  > & {
    costOffset: number;
  };

  const pushCandidate = (
    conflict: Conflict,
    baseCost: number,
    candidate: CandidateInput,
  ) => {
    const { costOffset, ...rest } = candidate;
    const resolves =
      conflict.minHorizontalNm + rest.estimatedHorizontalGainNm >=
        HORIZONTAL_THRESHOLD_NM ||
      conflict.minVerticalFt + rest.estimatedVerticalGainFt >=
        VERTICAL_THRESHOLD_FT;

    candidates.push({
      ...rest,
      cost: roundCost(baseCost + costOffset),
      resolvesConflict: resolves,
      status: resolves ? "valid" : "pending",
    });
  };

  conflicts.forEach((conflict) => {
    const horizontalDeficit = Math.max(
      0,
      HORIZONTAL_THRESHOLD_NM - conflict.minHorizontalNm,
    );
    const verticalDeficit = Math.max(
      0,
      VERTICAL_THRESHOLD_FT - conflict.minVerticalFt,
    );
    const horizontalSeverityRatio =
      HORIZONTAL_THRESHOLD_NM > 0
        ? conflict.minHorizontalNm / HORIZONTAL_THRESHOLD_NM
        : 0;
    const verticalSeverityRatio =
      VERTICAL_THRESHOLD_FT > 0
        ? conflict.minVerticalFt / VERTICAL_THRESHOLD_FT
        : 0;
    const severityShortfall = Math.max(
      0,
      1 - Math.min(horizontalSeverityRatio, 1),
    );
    const combinedSeverity = Math.max(
      severityShortfall,
      1 - verticalSeverityRatio,
    );
    const baseCost = 1 + combinedSeverity * 9;

    if (horizontalDeficit > 0) {
      const minutesNeeded = Math.max(1, Math.ceil(horizontalDeficit / 3));
      const deltaTimeSec = minutesNeeded * 60;
      const horizontalGain = Math.min(horizontalDeficit, minutesNeeded * 3);
      pushCandidate(conflict, baseCost, {
        id: `${conflict.id}-delay-${conflict.flightA}`,
        conflictId: conflict.id,
        conflictFlights: [conflict.flightA, conflict.flightB],
        flightId: conflict.flightA,
        deltaTimeSec,
        deltaAltitudeFt: 0,
        deltaSpeedKt: 0,
        estimatedHorizontalGainNm: horizontalGain,
        estimatedVerticalGainFt: 0,
        costOffset: 1,
        notes: `Delay departure by ${minutesNeeded} min to add longitudinal spacing.`,
      });
    }

    if (verticalDeficit > 0) {
      const roundedAltitude = Math.max(
        200,
        Math.ceil(verticalDeficit / 200) * 200,
      );
      pushCandidate(conflict, baseCost, {
        id: `${conflict.id}-altitude-${conflict.flightB}`,
        conflictId: conflict.id,
        conflictFlights: [conflict.flightA, conflict.flightB],
        flightId: conflict.flightB,
        deltaTimeSec: 0,
        deltaAltitudeFt: roundedAltitude,
        deltaSpeedKt: 0,
        estimatedHorizontalGainNm: 0,
        estimatedVerticalGainFt: roundedAltitude,
        costOffset: 1.25,
        notes: `Request +${roundedAltitude.toLocaleString("en-US")} ft to rebuild vertical separation.`,
      });
    }

    if (horizontalDeficit > 0) {
      const speedDeltaKt = Math.max(5, Math.ceil(horizontalDeficit / 0.4));
      const cappedSpeedDelta = Math.min(speedDeltaKt, 40);
      const horizontalGain = Math.min(
        horizontalDeficit,
        cappedSpeedDelta * 0.4,
      );
      pushCandidate(conflict, baseCost, {
        id: `${conflict.id}-speed-${conflict.flightA}`,
        conflictId: conflict.id,
        conflictFlights: [conflict.flightA, conflict.flightB],
        flightId: conflict.flightA,
        deltaTimeSec: 0,
        deltaAltitudeFt: 0,
        deltaSpeedKt: cappedSpeedDelta * -1,
        estimatedHorizontalGainNm: horizontalGain,
        estimatedVerticalGainFt: 0,
        costOffset: 1.5,
        notes: `Reduce speed by ${cappedSpeedDelta} kt through hotspot to stretch spacing.`,
      });
    }
  });

  candidates.sort((a, b) => a.cost - b.cost);

  return {
    candidates,
  };
}
