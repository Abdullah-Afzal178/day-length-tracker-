/**
 * The page's URL parameters, so every view is a shareable link. Pure.
 */

import type { ClockStyle } from "@/lib/clock";

export type Source =
  | { kind: "place"; text: string }
  | { kind: "coords"; lat: number; lon: number }
  | { kind: "visitor" };

export type Query = {
  source: Source;
  /** A second place to compare against, if any. */
  compare: Source | null;
  clock: ClockStyle;
  problems: string[];
};

export const MAX_PLACE = 100;

type Params = Record<string, string | string[] | undefined>;

function single(params: Params, key: string): string {
  const value = params[key];

  return ((Array.isArray(value) ? value[0] : value) ?? "").trim().replace(/\s+/g, " ");
}

/** A typed place: coordinates when it reads as coordinates, else a name to geocode. */
export function sourceFromText(text: string): Source | null {
  if (text === "") {
    return null;
  }

  const coords = parseCoordinates(text);

  if (coords) {
    return { kind: "coords", ...coords };
  }

  return text.length <= MAX_PLACE ? { kind: "place", text } : null;
}

export function parseQuery(params: Params): Query {
  const problems: string[] = [];
  const lat = single(params, "lat");
  const lon = single(params, "lon");
  let source: Source = { kind: "visitor" };

  if (lat !== "" || lon !== "") {
    const coords = parseCoordinates(`${lat}, ${lon}`);

    if (coords) {
      source = { kind: "coords", ...coords };
    } else {
      problems.push("Those coordinates are out of range, so this shows your approximate location instead.");
    }
  } else {
    const place = single(params, "place");
    const parsed = sourceFromText(place);

    if (parsed) {
      source = parsed;
    } else if (place !== "") {
      problems.push("That place name is too long to look up.");
    }
  }

  const compareText = single(params, "compare");
  const compare = sourceFromText(compareText);

  if (compareText && !compare) {
    problems.push("That place to compare with is too long to look up.");
  }

  return { source, compare, clock: single(params, "clock") === "24" ? "24" : "12", problems };
}

const COORDINATES =
  /^\s*([+-]?\d{1,3}(?:\.\d+)?)\s*°?\s*([NS])?\s*(?:,\s*|\s+)([+-]?\d{1,3}(?:\.\d+)?)\s*°?\s*([EW])?\s*$/i;

/** "48.8566, 2.3522", "48.8566 2.3522" or "40.7128° N, 74.0060° W". */
export function parseCoordinates(text: string): { lat: number; lon: number } | null {
  const match = COORDINATES.exec(text);

  if (!match) {
    return null;
  }

  let lat = Number(match[1]);
  let lon = Number(match[3]);
  const latHemisphere = match[2]?.toUpperCase();
  const lonHemisphere = match[4]?.toUpperCase();

  // A hemisphere letter and a minus sign together are ambiguous.
  if ((latHemisphere && match[1].startsWith("-")) || (lonHemisphere && match[3].startsWith("-"))) {
    return null;
  }

  if (latHemisphere === "S") {
    lat = -lat;
  }

  if (lonHemisphere === "W") {
    lon = -lon;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return null;
  }

  return { lat, lon };
}

function sourceText(source: Source): string {
  return source.kind === "place" ? source.text : source.kind === "coords" ? `${source.lat}, ${source.lon}` : "";
}

/** A link to this page with some parameters changed. Empty values are dropped. */
export function pageHref(query: Query, changes: Partial<Record<"place" | "compare" | "clock", string | null>>): string {
  const params = new URLSearchParams();
  const place = "place" in changes ? (changes.place ?? "") : sourceText(query.source);
  const compare = "compare" in changes ? (changes.compare ?? "") : query.compare ? sourceText(query.compare) : "";
  const clock = "clock" in changes ? (changes.clock ?? "") : query.clock;

  if (place) {
    params.set("place", place);
  }

  if (compare) {
    params.set("compare", compare);
  }

  if (clock === "24") {
    params.set("clock", "24");
  }

  const text = params.toString();

  return text ? `/?${text}` : "/";
}
