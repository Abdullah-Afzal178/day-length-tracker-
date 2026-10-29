import assert from "node:assert/strict";

import {
  chunks,
  extremeTime,
  formatLength,
  formatRate,
  monthRows,
  rateAround,
  readDays,
  summarise,
  trendOf,
  turnsIn,
  windowFor,
} from "@/lib/daylight";
import { LATITUDE, newYork, quito, tromsoSummer, tromsoWinter } from "@/lib/test-fixtures";

let checks = 0;
function check(actual: unknown, expected: unknown, message: string) {
  checks += 1;
  assert.deepEqual(actual, expected, message);
}

// --- the window and its API calls ---------------------------------------------------
check(windowFor("2026-10-29"), { start: "2026-09-29", end: "2027-09-28" }, "a month back, eleven ahead: 365 days");
const calls = chunks("2026-09-29", "2027-09-28");
check(calls.length, 5, "five calls");
check(calls[0], { start: "2026-09-29", end: "2026-12-27" }, "90 days inclusive, the API's limit");
check(calls[4].end, "2027-09-28", "the last call ends on the last day");
check(calls.every((call, index) => index === 0 || call.start > calls[index - 1].end), true, "no overlaps");

// --- New York ---------------------------------------------------------------------------
const ny = readDays(newYork, LATITUDE.newYork);
check(ny.length, 365, "a year of days");
const today = summarise(ny, "2026-10-29")!;
check(formatLength(today.today.length), "10 h 33 min", "29 October");
check(today.trend, "shorter", "days are getting shorter in autumn");
check(Math.round(today.rate), -145, "by about 2 min 25 s a day: 34 minutes over two weeks");
check(formatLength(today.shortest.length), "9 h 16 min", "the shortest day in the window");
check(formatLength(today.longest.length), "15 h 6 min", "the longest");

const solstice = summarise(ny, "2026-12-21")!;
check(solstice.trend, "steady", "at the solstice the change is a few seconds a day");
check(summarise(ny, "2027-03-20")!.trend, "longer", "spring");
check(summarise(ny, "1999-01-01"), null, "a date outside the window");

const turns = turnsIn(ny, LATITUDE.newYork, "America/New_York");
check(
  turns.map((turn) => `${turn.name} ${turn.date}`),
  ["Winter solstice 2026-12-21", "Spring equinox 2027-03-20", "Summer solstice 2027-06-21", "Autumn equinox 2027-09-23"],
  "the four turns, on New York's calendar",
);
check(turns[0].kind, "shortest", "December is the shortest day");
check(formatLength(turns[0].length!), "9 h 16 min", "with its day length");

// Earliest sunset comes before the solstice, latest sunrise after it: the
// equation of time. Clock changes move both, so they are read in local time.
const earliest = extremeTime(ny, "earliest-sunset")!;
check([earliest.minutes, earliest.from, earliest.to], [16 * 60 + 29, "2026-12-01", "2026-12-14"], "earliest sunset, 4:29 PM for two weeks");
const latest = extremeTime(ny, "latest-sunrise")!;
check([latest.minutes, latest.from], [7 * 60 + 24, "2026-10-31"], "the latest sunrise is the last day of summer time, not January");

const months = monthRows(ny);
check(months[0].date, "2026-10-01", "first row");
check(months.length, 12, "twelve months");
check(months[1].change, months[1].length - months[0].length, "change from the month before");

// --- Tromsø: polar night ----------------------------------------------------------------
const tw = readDays(tromsoWinter, LATITUDE.tromsoWinter);
const night = tw.find((day) => day.date === "2026-12-21")!;
check([night.length, night.polar], [0, true], "no sunrise at all on the solstice");
check(tw.find((day) => day.date === "2026-11-26")!.polar, false, "the last day with a sunrise");
check(summarise(tw, "2026-12-21")!.trend, "steady", "nothing changes in polar night");
check(extremeTime(tw, "earliest-sunset")!.minutes < 12 * 60, true, "the earliest sunset is before noon");

// --- Tromsø: midnight sun ----------------------------------------------------------------
const ts = readDays(tromsoSummer, LATITUDE.tromsoSummer);
const midsummer = ts.find((day) => day.date === "2027-06-21")!;
check([midsummer.length, midsummer.polar], [1440, true], "the sun never sets");

// --- Quito: the equator ------------------------------------------------------------------
const qu = readDays(quito, LATITUDE.quito);
const q = summarise(qu, "2026-12-21")!;
check(q.trend, "steady", "day length barely moves at the equator");
check(formatLength(q.today.length), "12 h 22 min", "a little over twelve hours: the sun's upper edge and refraction count, and Quito is 2,850 m up");
check(turnsIn(qu, LATITUDE.quito, "America/Guayaquil")[0].name, "Summer solstice", "just south of the equator, December is summer");

// --- helpers --------------------------------------------------------------------------------
check(rateAround([], 0), 0, "no data, no rate");
check(trendOf(11), "longer", "longer");
check(trendOf(-11), "shorter", "shorter");
check(trendOf(5), "steady", "steady");
check(formatLength(0), "0 min", "polar night");
check(formatLength(1440), "24 h", "midnight sun");
check(formatRate(130), "2 min 10 s", "rate");
check(formatRate(-7), "7 s", "unsigned");
check(formatRate(120), "2 min", "whole minutes");

console.log(`daylight: ${checks} assertions passed`);
