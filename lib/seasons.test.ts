import assert from "node:assert/strict";

import { seasonInstant, seasonMeaning, seasonsBetween } from "@/lib/seasons";

let checks = 0;
function check(actual: unknown, expected: unknown, message: string) {
  checks += 1;
  assert.deepEqual(actual, expected, message);
}

/** Within two minutes of a published time (US Naval Observatory). */
function near(year: number, season: Parameters<typeof seasonInstant>[1], published: string) {
  const diff = Math.abs(seasonInstant(year, season) - Date.parse(published)) / 60000;
  check(diff <= 2, true, `${season} ${year}: ${new Date(seasonInstant(year, season)).toISOString()} vs ${published}`);
}

near(2024, "march", "2024-03-20T03:06:00Z");
near(2024, "june", "2024-06-20T20:51:00Z");
near(2024, "september", "2024-09-22T12:44:00Z");
near(2024, "december", "2024-12-21T09:20:00Z");
near(2025, "march", "2025-03-20T09:01:00Z");
near(2025, "june", "2025-06-21T02:42:00Z");
near(2025, "september", "2025-09-22T18:19:00Z");
near(2025, "december", "2025-12-21T15:03:00Z");

const year = seasonsBetween(Date.parse("2026-10-29T00:00:00Z"), Date.parse("2027-10-29T00:00:00Z"));
check(year.map((event) => event.season), ["december", "march", "june", "september"], "the next four, in order");
check(new Date(year[0].at).toISOString().slice(0, 10), "2026-12-21", "December solstice 2026");

check(seasonMeaning("december", 40.7).kind, "shortest", "December is the shortest day in New York");
check(seasonMeaning("december", -33.9).kind, "longest", "and the longest in Sydney");
check(seasonMeaning("june", -33.9).name, "Winter solstice", "June is winter in the south");
check(seasonMeaning("march", -33.9).name, "Autumn equinox", "March is autumn in the south");

console.log(`seasons: ${checks} assertions passed`);
