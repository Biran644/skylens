import { Waypoint } from "../types/domain";

const EARTH_RADIUS_KM = 6371;
const KM_PER_NM = 1.852;
const DEG_TO_RAD = Math.PI / 180;

export const toRadians = (degrees: number): number => degrees * DEG_TO_RAD;

export const haversineKm = (a: Waypoint, b: Waypoint): number => {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_KM * c;
};

export const haversineNm = (a: Waypoint, b: Waypoint): number =>
  haversineKm(a, b) / KM_PER_NM;

export const horizontalSeparationNm = (a: Waypoint, b: Waypoint): number =>
  haversineNm(a, b);

export const verticalSeparationFt = (altFtA: number, altFtB: number): number =>
  Math.abs(altFtA - altFtB);

export const kmToNm = (km: number): number => km / KM_PER_NM;

export const nmToKm = (nm: number): number => nm * KM_PER_NM;
