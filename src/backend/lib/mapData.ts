import {
  Conflict,
  ConflictSample,
  Flight,
  TrajectoryMapConflictPoint,
  TrajectoryMapData,
  TrajectoryMapPath,
  TrajectoryMapViewState,
  TimelineBucket,
} from "../types/domain";

const DEFAULT_VIEW_STATE: TrajectoryMapViewState = {
  longitude: -95,
  latitude: 55,
  zoom: 3.5,
  pitch: 0,
  bearing: 0,
};

const buildTrajectoryPaths = (flights: Flight[]): TrajectoryMapPath[] => {
  if (!flights.length) {
    return [];
  }

  return flights.map((flight) => {
    const coordinates: [number, number][] = [];

    flight.segments.forEach((segment, index) => {
      if (index === 0) {
        coordinates.push([segment.from.lon, segment.from.lat]);
      }

      coordinates.push([segment.to.lon, segment.to.lat]);
    });

    return {
      id: flight.id,
      callsign: flight.callsign,
      passengers: flight.passengers,
      isCargo: flight.isCargo,
      coordinates,
    };
  });
};

const buildConflictMarkers = (
  conflicts: Conflict[],
  conflictSamples: ConflictSample[],
): TrajectoryMapConflictPoint[] => {
  if (conflictSamples.length > 0) {
    return conflictSamples.map((sample, index) => {
      const minute = Math.floor(sample.tSec / 60);

      return {
        id: `${sample.flightA}-${sample.flightB}-${sample.tSec}-${index}`,
        flights: [sample.flightA, sample.flightB],
        coordinate: [sample.lon, sample.lat],
        tSec: sample.tSec,
        minute,
        horizontalNm: sample.horizontalNm,
        verticalFt: sample.verticalFt,
      };
    });
  }

  return conflicts.map((conflict, index) => {
    const minute = Math.floor(conflict.tStart / 60);

    return {
      id: conflict.id || `conflict-${index}`,
      flights: [conflict.flightA, conflict.flightB],
      coordinate: [conflict.representativeLon, conflict.representativeLat],
      tSec: conflict.tStart,
      minute,
      horizontalNm: conflict.minHorizontalNm,
      verticalFt: conflict.minVerticalFt,
    };
  });
};

const computeTimeline = (
  markers: TrajectoryMapConflictPoint[],
): { timeline: TimelineBucket[]; timelineMax: number } => {
  if (!markers.length) {
    return {
      timeline: [],
      timelineMax: 0,
    };
  }

  const counts = new Map<number, number>();

  markers.forEach((marker) => {
    counts.set(marker.minute, (counts.get(marker.minute) ?? 0) + 1);
  });

  const timeline = Array.from(counts.entries())
    .map(([minute, count]) => ({ minute, count }))
    .sort((a, b) => a.minute - b.minute);

  const timelineMax = timeline.reduce(
    (max, bucket) => Math.max(max, bucket.count),
    0,
  );

  return {
    timeline,
    timelineMax,
  };
};

const computeTemporalExtent = (
  markers: TrajectoryMapConflictPoint[],
): { min: number; max: number } | null => {
  if (!markers.length) {
    return null;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  markers.forEach((marker) => {
    min = Math.min(min, marker.tSec);
    max = Math.max(max, marker.tSec);
  });

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }

  return { min, max };
};

const computeViewState = (
  paths: TrajectoryMapPath[],
  markers: TrajectoryMapConflictPoint[],
): TrajectoryMapViewState => {
  const coordinates: [number, number][] = [];

  paths.forEach((path) => {
    path.coordinates.forEach((coordinate) => {
      coordinates.push(coordinate);
    });
  });

  markers.forEach((marker) => {
    coordinates.push(marker.coordinate);
  });

  if (!coordinates.length) {
    return DEFAULT_VIEW_STATE;
  }

  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  coordinates.forEach(([lon, lat]) => {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const spanLon = Math.max(0.1, maxLon - minLon);
  const spanLat = Math.max(0.1, maxLat - minLat);
  const span = Math.max(spanLon, spanLat);

  let zoom = 6.5;
  if (span > 40) {
    zoom = 2.5;
  } else if (span > 20) {
    zoom = 3.2;
  } else if (span > 10) {
    zoom = 4.2;
  } else if (span > 5) {
    zoom = 5.0;
  }

  return {
    longitude: centerLon,
    latitude: centerLat,
    zoom,
    pitch: 0,
    bearing: 0,
  };
};

export const buildTrajectoryMapData = (
  flights: Flight[] = [],
  conflicts: Conflict[] = [],
  conflictSamples: ConflictSample[] = [],
): TrajectoryMapData => {
  const paths = buildTrajectoryPaths(flights);
  const markers = buildConflictMarkers(conflicts, conflictSamples);
  const { timeline, timelineMax } = computeTimeline(markers);
  const temporalExtent = computeTemporalExtent(markers);
  const viewState = computeViewState(paths, markers);

  return {
    paths,
    conflictMarkers: markers,
    timeline,
    timelineMax,
    viewState,
    temporalExtent,
  };
};
