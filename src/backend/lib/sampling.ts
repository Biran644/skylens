import { Flight, Segment, TrajectoryPoint } from "../types/domain";

const DEFAULT_SAMPLE_STEP_SEC = 60;

type InterpolatedPoint = {
  lat: number;
  lon: number;
};

const interpolateSegment = (
  segment: Segment,
  targetTime: number,
): InterpolatedPoint => {
  if (segment.tEnd <= segment.tStart) {
    return {
      lat: segment.from.lat,
      lon: segment.from.lon,
    };
  }

  const alpha = (targetTime - segment.tStart) / (segment.tEnd - segment.tStart);
  const clampedAlpha = Math.min(Math.max(alpha, 0), 1);

  return {
    lat: segment.from.lat + (segment.to.lat - segment.from.lat) * clampedAlpha,
    lon: segment.from.lon + (segment.to.lon - segment.from.lon) * clampedAlpha,
  };
};

const sampleSegment = (
  flightId: string,
  segment: Segment,
  stepSec: number,
): TrajectoryPoint[] => {
  if (segment.tEnd <= segment.tStart) {
    return [];
  }

  const samples: TrajectoryPoint[] = [];
  const bucketStart = Math.ceil(segment.tStart / stepSec);
  const bucketEnd = Math.floor(segment.tEnd / stepSec);

  for (let bucket = bucketStart; bucket <= bucketEnd; bucket += 1) {
    const tSec = bucket * stepSec;
    const { lat, lon } = interpolateSegment(segment, tSec);
    samples.push({
      flightId,
      tSec,
      lat,
      lon,
      altFt: segment.altitudeFt,
      segmentIndex: segment.index,
    });
  }

  return samples;
};

export const sampleFlight = (
  flight: Flight,
  stepSec: number = DEFAULT_SAMPLE_STEP_SEC,
): TrajectoryPoint[] => {
  const points: TrajectoryPoint[] = [];

  flight.segments.forEach((segment) => {
    points.push(...sampleSegment(flight.id, segment, stepSec));
  });

  return points;
};

export const sampleFlights = (
  flights: Flight[],
  stepSec: number = DEFAULT_SAMPLE_STEP_SEC,
): TrajectoryPoint[] =>
  flights.flatMap((flight) => sampleFlight(flight, stepSec));
