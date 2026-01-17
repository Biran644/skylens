import { RawFlight, Flight, Segment, Waypoint } from "../types/domain";
import { haversineNm } from "./distance";
import { parseRouteString } from "./routing";

const SECONDS_PER_HOUR = 3600;

export const buildSegmentsForWaypoints = (
  flightId: string,
  departureTime: number,
  cruiseAltitudeFt: number,
  cruiseSpeedKt: number,
  waypoints: Waypoint[],
): Segment[] => {
  if (waypoints.length < 2 || cruiseSpeedKt <= 0) {
    return [];
  }

  const segments: Segment[] = [];
  let cursorTime = departureTime;

  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const from = waypoints[i];
    const to = waypoints[i + 1];

    const distanceNm = haversineNm(from, to);
    const durationSec = (distanceNm / cruiseSpeedKt) * SECONDS_PER_HOUR;
    const tStart = cursorTime;
    const tEnd = cursorTime + durationSec;

    segments.push({
      flightId,
      index: i,
      from,
      to,
      tStart,
      tEnd,
      altitudeFt: cruiseAltitudeFt,
      distanceNm,
    });

    cursorTime = tEnd;
  }

  return segments;
};

export const buildFlightFromRaw = (raw: RawFlight): Flight => {
  const waypoints = parseRouteString(raw.route);
  const cruiseSpeedKt = raw["aircraft speed"];
  const cruiseAltitudeFt = raw.altitude;

  const segments = buildSegmentsForWaypoints(
    raw.ACID,
    raw["departure time"],
    cruiseAltitudeFt,
    cruiseSpeedKt,
    waypoints,
  );

  return {
    id: raw.ACID,
    callsign: raw.ACID,
    planeType: raw["Plane type"],
    departureAirport: raw["departure airport"],
    arrivalAirport: raw["arrival airport"],
    departureTime: raw["departure time"],
    cruiseSpeedKt,
    cruiseAltitudeFt,
    passengers: raw.passengers,
    isCargo: raw.is_cargo,
    segments,
  };
};

export const buildSegmentsForFlight = (
  flight: Flight,
  waypoints?: Waypoint[],
): Segment[] => {
  if (!waypoints) {
    return flight.segments;
  }

  return buildSegmentsForWaypoints(
    flight.id,
    flight.departureTime,
    flight.cruiseAltitudeFt,
    flight.cruiseSpeedKt,
    waypoints,
  );
};
