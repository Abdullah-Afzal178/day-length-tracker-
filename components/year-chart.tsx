import { formatClock, formatShortDate, type ClockStyle } from "@/lib/clock";
import { formatLength, type Day, type Turn } from "@/lib/daylight";

const WIDTH = 1200;
const HEIGHT = 440;
const LEFT = 56;
const RIGHT = 16;
const TOP = 28;
const BOTTOM = 40;
const PLOT_W = WIDTH - LEFT - RIGHT;
const PLOT_H = HEIGHT - TOP - BOTTOM;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * A year of daylight: one bar per day, from sunrise to sunset, with
 * midnight at the bottom and top. The curve of the seasons, the solstices,
 * and the jumps where clocks change all show without being drawn on.
 */
export function YearChart({
  days,
  turns,
  todayDate,
  clock,
  placeName,
}: {
  days: Day[];
  turns: Turn[];
  todayDate: string;
  clock: ClockStyle;
  placeName: string;
}) {
  const step = PLOT_W / days.length;
  const y = (minutes: number) => TOP + PLOT_H - (minutes / 1440) * PLOT_H;
  const x = (index: number) => LEFT + index * step;
  const todayIndex = days.findIndex((day) => day.date === todayDate);
  const monthStarts = days.map((day, index) => ({ day, index })).filter(({ day }) => day.date.endsWith("-01"));

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" shapeRendering="crispEdges" role="img" aria-label={`Sunrise and sunset in ${placeName} for each day of the next year.`}>
        <defs>
          <linearGradient id="daylight" x1="0" y1={TOP} x2="0" y2={TOP + PLOT_H} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f3d36b" />
            <stop offset="1" stopColor="#e0a83a" />
          </linearGradient>
        </defs>

        <rect x={LEFT} y={TOP} width={PLOT_W} height={PLOT_H} fill="#0b120d" rx="6" />

        {/* Hour lines */}
        {[0, 6, 12, 18, 24].map((hour) => (
          <g key={hour}>
            <line x1={LEFT} x2={LEFT + PLOT_W} y1={y(hour * 60)} y2={y(hour * 60)} stroke="#27382c" strokeDasharray={hour % 12 === 0 ? "" : "3 5"} />
            <text x={LEFT - 10} y={y(hour * 60) + 4} textAnchor="end" fontSize="13" fill="#9fb3a2">
              {formatClock((hour % 24) * 60, clock).replace(":00", "")}
            </text>
          </g>
        ))}

        {/* One bar per day of daylight */}
        {days.map((day, index) => {
          const label = `${formatShortDate(day.date)}: ${dayText(day, clock)}`;

          if (day.polar) {
            return day.length > 0 ? (
              <rect key={day.date} x={x(index)} y={TOP} width={step + 0.4} height={PLOT_H} fill="url(#daylight)">
                <title>{label}</title>
              </rect>
            ) : null;
          }

          if (day.sunrise === null || day.sunset === null) {
            return null;
          }

          // A sunset after midnight (high summer, far north) is the previous evening's:
          // daylight runs from sunrise to midnight, and from midnight to that sunset.
          const segments =
            day.sunset > day.sunrise
              ? [[day.sunrise, day.sunset]]
              : [
                  [day.sunrise, 1440],
                  [0, day.sunset],
                ];

          return (
            <g key={day.date}>
              {segments.map(([from, to]) => (
                <rect key={from} x={x(index)} y={y(to)} width={step + 0.4} height={y(from) - y(to)} fill="url(#daylight)">
                  <title>{label}</title>
                </rect>
              ))}
            </g>
          );
        })}

        {/* Month ticks */}
        {monthStarts.map(({ day, index }) => (
          <g key={day.date}>
            <line x1={x(index)} x2={x(index)} y1={TOP + PLOT_H} y2={TOP + PLOT_H + 6} stroke="#9fb3a2" />
            <text x={x(index) + 4} y={TOP + PLOT_H + 22} fontSize="13" fill="#9fb3a2">
              {MONTHS[Number(day.date.slice(5, 7)) - 1]}
              {day.date.slice(5, 7) === "01" ? ` ${day.date.slice(0, 4)}` : ""}
            </text>
          </g>
        ))}

        {/* Solstices and equinoxes */}
        {turns.map((turn) => {
          const index = days.findIndex((day) => day.date === turn.date);

          return (
            <g key={turn.season}>
              <line x1={x(index) + step / 2} x2={x(index) + step / 2} y1={TOP} y2={TOP + PLOT_H} stroke="#e7efe4" strokeOpacity="0.35" strokeDasharray="2 4" />
              <text x={x(index) + step / 2} y={TOP - 9} textAnchor="middle" fontSize="12" fill="#e7efe4" fillOpacity="0.75">
                {turn.kind === "shortest" ? "Shortest day" : turn.kind === "longest" ? "Longest day" : "Equinox"}
              </text>
            </g>
          );
        })}

        {todayIndex >= 0 ? (
          <g>
            <line x1={x(todayIndex) + step / 2} x2={x(todayIndex) + step / 2} y1={TOP} y2={TOP + PLOT_H} stroke="#7fd1a1" strokeWidth="2" />
            <rect x={x(todayIndex) + step / 2 - 24} y={TOP + PLOT_H - 26} width="48" height="20" rx="10" fill="#7fd1a1" />
            <text x={x(todayIndex) + step / 2} y={TOP + PLOT_H - 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="#0e1510">
              Today
            </text>
          </g>
        ) : null}
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-lichen">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-sun" aria-hidden="true" />
          Daylight, sunrise at the bottom edge and sunset at the top
        </span>
        <span>Sudden steps are clock changes, not the sun.</span>
      </figcaption>
    </figure>
  );
}

function dayText(day: Day, clock: ClockStyle): string {
  if (day.polar) {
    return day.length > 0 ? "the sun doesn't set" : "the sun doesn't rise";
  }

  const rise = day.sunrise === null ? "no sunrise" : formatClock(day.sunrise, clock);
  const set = day.sunset === null ? "no sunset" : formatClock(day.sunset, clock);

  return `${rise} to ${set}, ${formatLength(day.length)}`;
}
