import { Waypoint } from "../types/domain";

const LAT_PATTERN = /^(\d+(?:\.\d+)?)([NS])$/i;
const LON_PATTERN = /^(\d+(?:\.\d+)?)([EW])$/i;

export const parseCoordToken = (token: string): Waypoint => {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error("Empty coordinate token");
  }

  const parts = trimmed.split("/");
  if (parts.length !== 2) {
    throw new Error(`Invalid waypoint token: ${token}`);
  }

  const [latRaw, lonRaw] = parts;
  const latMatch = latRaw.match(LAT_PATTERN);
  const lonMatch = lonRaw.match(LON_PATTERN);

  if (!latMatch || !lonMatch) {
    throw new Error(`Invalid coordinate components: ${token}`);
  }

  const latValue = parseFloat(latMatch[1]);
  const lonValue = parseFloat(lonMatch[1]);

  if (Number.isNaN(latValue) || Number.isNaN(lonValue)) {
    throw new Error(`Failed to parse numeric coordinate values: ${token}`);
  }

  const latSign = latMatch[2].toUpperCase() === "S" ? -1 : 1;
  const lonSign = lonMatch[2].toUpperCase() === "W" ? -1 : 1;

  return {
    lat: latValue * latSign,
    lon: lonValue * lonSign,
  };
};

export const parseRouteString = (route: string): Waypoint[] =>
  route.trim().split(/\s+/).filter(Boolean).map(parseCoordToken);
