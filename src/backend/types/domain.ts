export const HORIZONTAL_THRESHOLD_NM = 5;
export const VERTICAL_THRESHOLD_FT = 2000;
export const DEFAULT_COARSE_STEP_SEC = 60;
export const DEFAULT_FINE_STEP_SEC = 15;
export const CELL_SIZE_DEG = 1;

export type RawFlight = {
  ACID: string;
  "Plane type": string;
  route: string;
  altitude: number;
  "departure airport": string;
  "arrival airport": string;
  "departure time": number;
  "aircraft speed": number;
  passengers: number;
  is_cargo: boolean;
};

export type Waypoint = {
  lat: number;
  lon: number;
};

export type Segment = {
  flightId: string;
  index: number;
  from: Waypoint;
  to: Waypoint;
  tStart: number;
  tEnd: number;
  altitudeFt: number;
  distanceNm: number;
};

export type Flight = {
  id: string;
  callsign: string;
  planeType: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: number;
  cruiseSpeedKt: number;
  cruiseAltitudeFt: number;
  passengers: number;
  isCargo: boolean;
  segments: Segment[];
};

export type TrajectoryPoint = {
  flightId: string;
  tSec: number;
  lat: number;
  lon: number;
  altFt: number;
  segmentIndex: number;
};

export type BucketKey = string;

export type ConflictSample = {
  flightA: string;
  flightB: string;
  tSec: number;
  lat: number;
  lon: number;
  altFtA: number;
  altFtB: number;
  horizontalNm: number;
  verticalFt: number;
};

export type Conflict = {
  id: string;
  flightA: string;
  flightB: string;
  tStart: number;
  tEnd: number;
  minHorizontalNm: number;
  minVerticalFt: number;
  representativeLat: number;
  representativeLon: number;
  samples: ConflictSample[];
};

export type AircraftCategory =
  | "regional"
  | "narrowbody"
  | "widebody"
  | "cargo"
  | "unknown";

export type AircraftConstraints = {
  category: AircraftCategory;
  minAltitudeFt: number;
  maxAltitudeFt: number;
  optimalAltitudeBandFt: [number, number];
  minSpeedKt: number;
  maxSpeedKt: number;
  nominalSpeedKt: number;
};

export type ResolutionCandidate = {
  id: string;
  flightId: string;
  deltaTimeSec: number;
  deltaAltitudeFt: number;
  deltaSpeedKt: number;
  cost: number;
  status: "pending" | "valid" | "invalid";
  notes?: string;
};

export type ResolutionResult = {
  flightId: string;
  appliedCandidate?: ResolutionCandidate;
  remainingConflicts: Conflict[];
  newConflicts: Conflict[];
};
