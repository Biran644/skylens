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

  conflicts.forEach((conflict) => {
    const horizontalSeverity = Math.max(
      0,
      1 - conflict.minHorizontalNm / HORIZONTAL_THRESHOLD_NM,
    );
    const verticalSeverity = Math.max(
      0,
      1 - conflict.minVerticalFt / VERTICAL_THRESHOLD_FT,
    );
    const severity = Math.max(horizontalSeverity, verticalSeverity);
    const baseCost = 1 + severity * 9;

    const adjustments: ResolutionCandidate[] = [
      {
        id: `${conflict.id}-delay-${conflict.flightA}`,
        flightId: conflict.flightA,
        deltaTimeSec: 60,
        deltaAltitudeFt: 0,
        deltaSpeedKt: 0,
        cost: roundCost(baseCost + 1),
        status: "pending",
        notes: "Delay by 60s to widen longitudinal spacing.",
      },
      {
        id: `${conflict.id}-altitude-${conflict.flightB}`,
        flightId: conflict.flightB,
        deltaTimeSec: 0,
        deltaAltitudeFt: 300,
        deltaSpeedKt: 0,
        cost: roundCost(baseCost + 1.25),
        status: "pending",
        notes: "Shift climb by 300 ft to separate vertically.",
      },
      {
        id: `${conflict.id}-speed-${conflict.flightA}`,
        flightId: conflict.flightA,
        deltaTimeSec: 0,
        deltaAltitudeFt: 0,
        deltaSpeedKt: -10,
        cost: roundCost(baseCost + 1.5),
        status: "pending",
        notes: "Reduce speed by 10 kt through hotspot to extend spacing.",
      },
    ];

    candidates.push(...adjustments);
  });

  candidates.sort((a, b) => a.cost - b.cost);

  return {
    candidates,
  };
}
