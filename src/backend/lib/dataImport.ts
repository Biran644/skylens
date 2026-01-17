import { rawFlightsSchema } from "../schemas/flightSchema";
import { RawFlight } from "../types/domain";

const CSV_SEPARATOR = ",";

const isLikelyJson = (text: string) => {
  const trimmed = text.trim();
  return trimmed.startsWith("[") || trimmed.startsWith("{");
};

const parseJson = (text: string): RawFlight[] => {
  const parsed = JSON.parse(text);
  return rawFlightsSchema.parse(parsed);
};

const normalizeHeader = (header: string) => header.trim().replace(/^"|"$/g, "");

const parseCsv = (text: string): RawFlight[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0]
    .split(CSV_SEPARATOR)
    .map((token) => normalizeHeader(token));

  const records = lines.slice(1).map((line) => {
    const cells = line.split(CSV_SEPARATOR).map((token) => token.trim());
    const record: Record<string, string> = {};

    headers.forEach((header, idx) => {
      record[header] = cells[idx] ?? "";
    });

    return record;
  });

  const mapped: RawFlight[] = records.map((record) => ({
    ACID: record["ACID"] ?? "",
    "Plane type": record["Plane type"] ?? record["plane_type"] ?? "",
    route: record["route"] ?? "",
    altitude: Number(record["altitude"] ?? "0"),
    "departure airport":
      record["departure airport"] ?? record["departure_airport"] ?? "",
    "arrival airport":
      record["arrival airport"] ?? record["arrival_airport"] ?? "",
    "departure time": Number(
      record["departure time"] ?? record["departure_time"] ?? "0",
    ),
    "aircraft speed": Number(
      record["aircraft speed"] ?? record["aircraft_speed"] ?? "0",
    ),
    passengers: Number(record["passengers"] ?? "0"),
    is_cargo: (record["is_cargo"] ?? "false").toLowerCase() === "true",
  }));

  return rawFlightsSchema.parse(mapped);
};

export const parseFlightText = (text: string): RawFlight[] => {
  if (!text.trim()) {
    return [];
  }

  if (isLikelyJson(text)) {
    return parseJson(text);
  }

  return parseCsv(text);
};
