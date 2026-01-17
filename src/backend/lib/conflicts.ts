import { horizontalSeparationNm, verticalSeparationFt } from "./distance";
import {
  Conflict,
  ConflictSample,
  HORIZONTAL_THRESHOLD_NM,
  TrajectoryPoint,
  VERTICAL_THRESHOLD_FT,
} from "../types/domain";

const createTimeBuckets = (points: TrajectoryPoint[]) => {
  const buckets = new Map<number, TrajectoryPoint[]>();

  points.forEach((point) => {
    const bucket = buckets.get(point.tSec);
    if (bucket) {
      bucket.push(point);
    } else {
      buckets.set(point.tSec, [point]);
    }
  });

  return buckets;
};

const toWaypoint = (point: TrajectoryPoint) => ({
  lat: point.lat,
  lon: point.lon,
});

export const detectConflictSamples = (
  points: TrajectoryPoint[],
): ConflictSample[] => {
  const buckets = createTimeBuckets(points);
  const samples: ConflictSample[] = [];

  buckets.forEach((bucket) => {
    for (let i = 0; i < bucket.length; i += 1) {
      for (let j = i + 1; j < bucket.length; j += 1) {
        const a = bucket[i];
        const b = bucket[j];

        if (a.flightId === b.flightId) {
          continue;
        }

        const horizontalNm = horizontalSeparationNm(
          toWaypoint(a),
          toWaypoint(b),
        );
        const verticalFt = verticalSeparationFt(a.altFt, b.altFt);

        if (
          horizontalNm <= HORIZONTAL_THRESHOLD_NM &&
          verticalFt <= VERTICAL_THRESHOLD_FT
        ) {
          const [flightA, flightB] = [a.flightId, b.flightId].sort();
          samples.push({
            flightA,
            flightB,
            tSec: a.tSec,
            lat: (a.lat + b.lat) / 2,
            lon: (a.lon + b.lon) / 2,
            altFtA: a.altFt,
            altFtB: b.altFt,
            horizontalNm,
            verticalFt,
          });
        }
      }
    }
  });

  return samples;
};

export const buildConflicts = (samples: ConflictSample[]): Conflict[] => {
  if (samples.length === 0) {
    return [];
  }

  const groups = new Map<string, ConflictSample[]>();

  samples.forEach((sample) => {
    const key = `${sample.flightA}:${sample.flightB}`;
    const group = groups.get(key);
    if (group) {
      group.push(sample);
    } else {
      groups.set(key, [sample]);
    }
  });

  const conflicts: Conflict[] = [];

  Array.from(groups.entries()).forEach(([key, group], index) => {
    const [flightA, flightB] = key.split(":");
    const orderedSamples = [...group].sort((a, b) => a.tSec - b.tSec);
    const minHorizontal = orderedSamples.reduce(
      (min, sample) => Math.min(min, sample.horizontalNm),
      Number.POSITIVE_INFINITY,
    );
    const minVertical = orderedSamples.reduce(
      (min, sample) => Math.min(min, sample.verticalFt),
      Number.POSITIVE_INFINITY,
    );
    const bestSample = orderedSamples.reduce((best, sample) => {
      if (sample.horizontalNm < best.horizontalNm) {
        return sample;
      }
      if (
        sample.horizontalNm === best.horizontalNm &&
        sample.verticalFt < best.verticalFt
      ) {
        return sample;
      }
      return best;
    }, orderedSamples[0]);

    conflicts.push({
      id: `${flightA}-${flightB}-${index}`,
      flightA,
      flightB,
      tStart: orderedSamples[0].tSec,
      tEnd: orderedSamples[orderedSamples.length - 1].tSec,
      minHorizontalNm: minHorizontal,
      minVerticalFt: minVertical,
      representativeLat: bestSample.lat,
      representativeLon: bestSample.lon,
      samples: orderedSamples,
    });
  });

  return conflicts;
};
