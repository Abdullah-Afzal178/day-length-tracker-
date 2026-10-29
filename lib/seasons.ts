/**
 * The exact moments of the solstices and equinoxes, from Jean Meeus,
 * Astronomical Algorithms (2nd ed.), chapter 27: a mean instant per year
 * plus 24 periodic corrections. Good to about a minute for 2000 to 3000.
 * Pure.
 *
 * The daily sun times from the API are rounded to the minute, so near a
 * solstice several days tie for "shortest". The solstice itself is the
 * honest answer to "when do the days start getting longer".
 */

export type Season = "march" | "june" | "september" | "december";

const MEAN: Record<Season, [number, number, number, number, number]> = {
  march: [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057],
  june: [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.0003],
  september: [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078],
  december: [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032],
};

/** Table 27.C: amplitude, phase (degrees) and rate (degrees per Julian century). */
const PERIODIC: [number, number, number][] = [
  [485, 324.96, 1934.136],
  [203, 337.23, 32964.467],
  [199, 342.08, 20.186],
  [182, 27.85, 445267.112],
  [156, 73.14, 45036.886],
  [136, 171.52, 22518.443],
  [77, 222.54, 65928.934],
  [74, 296.72, 3034.906],
  [70, 243.58, 9037.513],
  [58, 119.81, 33718.147],
  [52, 297.17, 150.678],
  [50, 21.02, 2281.226],
  [45, 247.54, 29929.562],
  [44, 325.15, 31555.956],
  [29, 60.93, 4443.417],
  [18, 155.12, 67555.328],
  [17, 288.79, 4562.452],
  [16, 198.04, 62894.029],
  [14, 199.76, 31436.921],
  [12, 95.39, 14577.848],
  [12, 287.11, 31931.756],
  [12, 320.81, 34777.259],
  [9, 227.73, 1222.114],
  [8, 15.45, 16859.074],
];

const RAD = Math.PI / 180;

/**
 * Terrestrial Time runs ahead of UTC by ΔT, about 69 seconds this decade.
 * A fixed value is within a few seconds until the 2030s, well inside the
 * algorithm's own error.
 */
const DELTA_T_SECONDS = 69;

/** The instant of a solstice or equinox, as milliseconds since the epoch (UTC). */
export function seasonInstant(year: number, season: Season): number {
  const y = (year - 2000) / 1000;
  const [a, b, c, d, e] = MEAN[season];
  const jde0 = a + b * y + c * y ** 2 + d * y ** 3 + e * y ** 4;
  const t = (jde0 - 2451545.0) / 36525;
  const w = (35999.373 * t - 2.47) * RAD;
  const deltaLambda = 1 + 0.0334 * Math.cos(w) + 0.0007 * Math.cos(2 * w);
  const s = PERIODIC.reduce((sum, [amplitude, phase, rate]) => sum + amplitude * Math.cos((phase + rate * t) * RAD), 0);
  const jde = jde0 + (0.00001 * s) / deltaLambda;

  return Math.round((jde - 2440587.5) * 86400000 - DELTA_T_SECONDS * 1000);
}

export type SeasonEvent = { season: Season; at: number };

/** Every solstice and equinox from one instant to another, in order. */
export function seasonsBetween(fromMs: number, toMs: number): SeasonEvent[] {
  const firstYear = new Date(fromMs).getUTCFullYear() - 1;
  const lastYear = new Date(toMs).getUTCFullYear() + 1;
  const events: SeasonEvent[] = [];

  for (let year = firstYear; year <= lastYear; year += 1) {
    for (const season of ["march", "june", "september", "december"] as const) {
      const at = seasonInstant(year, season);

      if (at >= fromMs && at <= toMs) {
        events.push({ season, at });
      }
    }
  }

  return events.sort((a, b) => a.at - b.at);
}

/**
 * What a solstice or equinox means where you are. North of the equator the
 * December solstice is the shortest day; south of it, the longest.
 */
export function seasonMeaning(season: Season, latitude: number): {
  name: string;
  kind: "shortest" | "longest" | "equinox";
} {
  const north = latitude >= 0;

  switch (season) {
    case "december":
      return north ? { name: "Winter solstice", kind: "shortest" } : { name: "Summer solstice", kind: "longest" };
    case "june":
      return north ? { name: "Summer solstice", kind: "longest" } : { name: "Winter solstice", kind: "shortest" };
    case "march":
      return { name: north ? "Spring equinox" : "Autumn equinox", kind: "equinox" };
    case "september":
      return { name: north ? "Autumn equinox" : "Spring equinox", kind: "equinox" };
  }
}
