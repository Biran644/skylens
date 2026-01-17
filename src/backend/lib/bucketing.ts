import { BucketKey, TrajectoryPoint } from "../types/domain";

const CELL_SIZE_DEG = 1;

const toCellIndex = (value: number) => Math.floor(value / CELL_SIZE_DEG);

export const getBucketKey = (point: TrajectoryPoint): BucketKey => {
  const timeBucket = point.tSec;
  const latIndex = toCellIndex(point.lat);
  const lonIndex = toCellIndex(point.lon);
  return `${timeBucket}:${latIndex}:${lonIndex}`;
};

export const buildBucketMap = (
  points: TrajectoryPoint[],
): Map<BucketKey, TrajectoryPoint[]> => {
  const map = new Map<BucketKey, TrajectoryPoint[]>();

  points.forEach((point) => {
    const key = getBucketKey(point);
    const bucket = map.get(key);

    if (bucket) {
      bucket.push(point);
    } else {
      map.set(key, [point]);
    }
  });

  return map;
};
