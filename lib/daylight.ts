/**
 * A year of daily sun times, read for what people ask about: how long
 * today is, how fast that is changing, when it turns, and when the earliest
 * sunset and latest sunrise fall. Pure, so it can be unit tested against
 * captured API responses.
 *
 * The API gives times to the minute. Near a solstice the daily change is a
 * few seconds, so day-to-day differences are mostly 0 or 1 minute. The rate
 * shown is a straight-line fit over two weeks, which recovers the seconds;
 * single-day differences are only shown in whole minutes.
 */

import { addDays, dayOfYear, daysBetween, parseClock } from "@/lib/clock";
import { seasonMeaning, seasonsBetween, type Season } from "@/lib/seasons";

export type ApiDay = {
  date: string;
  sunrise: string;
  sunset: string;
  day_length: string;
  solar_noon?: string;
};

export type Day = {
  date: string;
  /** Minutes of daylight: 0 in polar night, 1440 under the midnight sun. */
  length: number;
  /** Minutes after local midnight, or null when the sun doesn't rise or set that day. */
  sunrise: number | null;
  sunset: number | null;
  /** True when the sun stays up, or down, all day. */
  polar: boolean;
};

/** Where the sun stands at noon, from the solar declination; only used for polar days. */
export function noonElevation(latitude: number, day: number): number {
  const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10));

  return 90 - Math.abs(latitude - declination);
}

export function readDays(raw: ApiDay[], latitude: number): Day[] {
  return raw.map((day) => {
    const length = parseClock(day.day_length);
    const sunrise = parseClock(day.sunrise);
    const sunset = parseClock(day.sunset);

    if (length !== null) {
      return { date: day.date, length, sunrise, sunset, polar: false };
    }

    // No day length: the sun never crosses the horizon. Up or down all day?
    const up = noonElevation(latitude, dayOfYear(day.date)) > -0.833;

    return { date: day.date, length: up ? 1440 : 0, sunrise, sunset, polar: true };
  });
}

/** Seconds of daylight gained (+) or lost (-) per day around one date: a least-squares slope. */
export function rateAround(days: Day[], index: number, halfWindow = 7): number {
  const from = Math.max(0, index - halfWindow);
  const to = Math.min(days.length - 1, index + halfWindow);
  const points = days.slice(from, to + 1).map((day, offset) => [offset, day.length * 60] as const);

  if (points.length < 2) {
    return 0;
  }

  const meanX = points.reduce((sum, [x]) => sum + x, 0) / points.length;
  const meanY = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
  const numerator = points.reduce((sum, [x, y]) => sum + (x - meanX) * (y - meanY), 0);
  const denominator = points.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0);

  return denominator === 0 ? 0 : numerator / denominator;
}

export type Trend = "longer" | "shorter" | "steady";

/** Under 10 seconds a day either way reads as steady: the turn of a solstice, or the tropics. */
export function trendOf(rateSeconds: number): Trend {
  if (rateSeconds > 10) {
    return "longer";
  }

  return rateSeconds < -10 ? "shorter" : "steady";
}

export type Turn = {
  season: Season;
  name: string;
  kind: "shortest" | "longest" | "equinox";
  /** UTC instant of the solstice or equinox. */
  at: number;
  /** The local calendar date it falls on. */
  date: string;
  /** Daylight on that date, when it's inside the fetched days. */
  length: number | null;
};

/** The solstices and equinoxes inside the fetched days, as local dates. */
export function turnsIn(days: Day[], latitude: number, zone: string): Turn[] {
  if (days.length === 0) {
    return [];
  }

  const from = Date.parse(`${days[0].date}T00:00:00Z`) - 86400000;
  const to = Date.parse(`${days[days.length - 1].date}T00:00:00Z`) + 2 * 86400000;
  const byDate = new Map(days.map((day) => [day.date, day]));

  return seasonsBetween(from, to)
    .map((event) => {
      const date = localDate(event.at, zone);
      const meaning = seasonMeaning(event.season, latitude);

      return { season: event.season, ...meaning, at: event.at, date, length: byDate.get(date)?.length ?? null };
    })
    .filter((turn) => byDate.has(turn.date));
}

/** YYYY-MM-DD of an instant in a time zone. */
export function localDate(ms: number, zone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date(ms))
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export type Extreme = {
  /** The clock time, in minutes after midnight. */
  minutes: number;
  /** The first and last date of the run of days that share it (times are to the minute). */
  from: string;
  to: string;
};

/**
 * The earliest sunset (or latest sunrise) in the fetched days, with every
 * consecutive day that ties it. Only days with an ordinary sunrise and
 * sunset count; under the midnight sun a "sunset" at 00:03 is the previous
 * evening's.
 */
export function extremeTime(days: Day[], which: "earliest-sunset" | "latest-sunrise"): Extreme | null {
  const ordinary = days.filter(
    (day) => !day.polar && day.sunrise !== null && day.sunset !== null && day.sunset > day.sunrise,
  );
  const value = (day: Day) => (which === "earliest-sunset" ? (day.sunset as number) : (day.sunrise as number));

  if (ordinary.length === 0) {
    return null;
  }

  const target = which === "earliest-sunset" ? Math.min(...ordinary.map(value)) : Math.max(...ordinary.map(value));
  const firstIndex = days.findIndex((day) => ordinary.includes(day) && value(day) === target);
  let lastIndex = firstIndex;

  while (lastIndex + 1 < days.length && ordinary.includes(days[lastIndex + 1]) && value(days[lastIndex + 1]) === target) {
    lastIndex += 1;
  }

  return { minutes: target, from: days[firstIndex].date, to: days[lastIndex].date };
}

export type MonthRow = { date: string; length: number; sunrise: number | null; sunset: number | null; change: number | null; polar: boolean };

/** The first of each month in the fetched days, with the change from the month before. */
export function monthRows(days: Day[]): MonthRow[] {
  const firsts = days.filter((day) => day.date.endsWith("-01"));

  return firsts.map((day, index) => ({
    date: day.date,
    length: day.length,
    sunrise: day.sunrise,
    sunset: day.sunset,
    polar: day.polar,
    change: index === 0 ? null : day.length - firsts[index - 1].length,
  }));
}

export type Summary = {
  today: Day;
  yesterday: Day | null;
  /** Seconds a day, fitted over two weeks. */
  rate: number;
  trend: Trend;
  longest: Day;
  shortest: Day;
};

export function summarise(days: Day[], todayDate: string): Summary | null {
  const index = days.findIndex((day) => day.date === todayDate);

  if (index === -1) {
    return null;
  }

  const rate = rateAround(days, index);
  const sorted = [...days].sort((a, b) => a.length - b.length);

  return {
    today: days[index],
    yesterday: index > 0 ? days[index - 1] : null,
    rate,
    trend: trendOf(rate),
    shortest: sorted[0],
    longest: sorted[sorted.length - 1],
  };
}

/** The date window the tool fetches: a month back, eleven months ahead. */
export function windowFor(today: string): { start: string; end: string } {
  return { start: addDays(today, -30), end: addDays(today, 334) };
}

/** That window as API calls of at most 90 days (inclusive), the time-series limit. */
export function chunks(start: string, end: string, size = 90): { start: string; end: string }[] {
  const result: { start: string; end: string }[] = [];
  let cursor = start;

  while (daysBetween(cursor, end) >= 0) {
    const last = addDays(cursor, size - 1);
    const chunkEnd = daysBetween(last, end) < 0 ? end : last;
    result.push({ start: cursor, end: chunkEnd });
    cursor = addDays(chunkEnd, 1);
  }

  return result;
}

/** "10 h 49 min" from minutes; "24 h" and "0 min" for polar days. */
export function formatLength(minutes: number): string {
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;

  if (hours === 0) {
    return `${rest} min`;
  }

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** "2 min 10 s" from seconds, unsigned. */
export function formatRate(seconds: number): string {
  const total = Math.round(Math.abs(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;

  if (minutes === 0) {
    return `${rest} s`;
  }

  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}
