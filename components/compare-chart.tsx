import { formatShortDate } from "@/lib/clock";
import { formatLength, type Day } from "@/lib/daylight";

const WIDTH = 1200;
const HEIGHT = 300;
const LEFT = 56;
const RIGHT = 16;
const TOP = 20;
const BOTTOM = 34;
const PLOT_W = WIDTH - LEFT - RIGHT;
const PLOT_H = HEIGHT - TOP - BOTTOM;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Hours of daylight through the year for two places, on one scale. */
export function CompareChart({
  main,
  other,
  mainName,
  otherName,
}: {
  main: Day[];
  other: Day[];
  mainName: string;
  otherName: string;
}) {
  // Align by date: the two places' "today" can differ across the date line.
  const otherByDate = new Map(other.map((day) => [day.date, day]));
  const step = PLOT_W / Math.max(1, main.length - 1);
  const x = (index: number) => LEFT + index * step;
  const y = (minutes: number) => TOP + PLOT_H - (minutes / 1440) * PLOT_H;
  const line = (values: (number | null)[]) =>
    values
      .map((value, index) => (value === null ? null : `${x(index).toFixed(1)},${y(value).toFixed(1)}`))
      .reduce<string[]>((paths, point, index, all) => {
        if (point === null) {
          return paths;
        }

        const start = index === 0 || all[index - 1] === null;
        paths.push(`${start ? "M" : "L"}${point}`);

        return paths;
      }, [])
      .join(" ");
  const mainPath = line(main.map((day) => day.length));
  const otherPath = line(main.map((day) => otherByDate.get(day.date)?.length ?? null));

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Hours of daylight through the year in ${mainName} and ${otherName}.`}
      >
        {[0, 6, 12, 18, 24].map((hour) => (
          <g key={hour}>
            <line x1={LEFT} x2={LEFT + PLOT_W} y1={y(hour * 60)} y2={y(hour * 60)} stroke="#27382c" />
            <text x={LEFT - 10} y={y(hour * 60) + 4} textAnchor="end" fontSize="13" fill="#9fb3a2">
              {hour} h
            </text>
          </g>
        ))}
        {main.map((day, index) =>
          day.date.endsWith("-01") ? (
            <text key={day.date} x={x(index) + 4} y={HEIGHT - 10} fontSize="13" fill="#9fb3a2">
              {MONTHS[Number(day.date.slice(5, 7)) - 1]}
            </text>
          ) : null,
        )}
        <path d={otherPath} fill="none" stroke="#8fa7ff" strokeWidth="3" strokeLinejoin="round" />
        <path d={mainPath} fill="none" stroke="#f3d36b" strokeWidth="3" strokeLinejoin="round" />
        {main.map((day, index) => {
          const twin = otherByDate.get(day.date);

          return index % 7 === 0 ? (
            <rect key={day.date} x={x(index) - step * 3.5} y={TOP} width={step * 7} height={PLOT_H} fill="transparent">
              <title>
                {`${formatShortDate(day.date)}: ${mainName} ${formatLength(day.length)}${twin ? `, ${otherName} ${formatLength(twin.length)}` : ""}`}
              </title>
            </rect>
          ) : null;
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-1 w-5 rounded-full bg-sun" aria-hidden="true" />
          {mainName}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-1 w-5 rounded-full bg-dusk" aria-hidden="true" />
          {otherName}
        </span>
      </figcaption>
    </figure>
  );
}
