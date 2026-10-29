import { ArrowDownRight, ArrowUpRight, Minus, MoveRight } from "lucide-react";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { CompareChart } from "@/components/compare-chart";
import { PoweredByBadge } from "@/components/powered-by-badge";
import { YearChart } from "@/components/year-chart";
import { formatCoordinates, load, visitorIp, type Loaded } from "@/lib/astronomy";
import { daysBetween, formatClock, formatLongDate, formatShortDate, type ClockStyle } from "@/lib/clock";
import { ASTRONOMY_API_URL, EXAMPLES, SITE_NAME } from "@/lib/constants";
import {
  extremeTime,
  formatLength,
  formatRate,
  monthRows,
  readDays,
  summarise,
  turnsIn,
  type Day,
  type Summary,
  type Turn,
} from "@/lib/daylight";
import { pageHref, parseQuery, type Query } from "@/lib/query";
import { seasonMeaning, seasonsBetween } from "@/lib/seasons";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const query = parseQuery(await searchParams);
  const ip = visitorIp(await headers());
  const [main, other] = await Promise.all([load(query.source, ip), query.compare ? load(query.compare, ip) : Promise.resolve(null)]);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 pt-6 sm:px-6">
        <a href="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun">
          <span className="relative block h-8 w-8 overflow-hidden rounded-lg bg-moss" aria-hidden="true">
            <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-sun-deep to-sun" />
            <span className="absolute left-1/2 top-1 h-3 w-px -translate-x-1/2 bg-sage/50" />
          </span>
          <span className="font-semibold tracking-tight">{SITE_NAME}</span>
        </a>
        <div className="flex items-center gap-3">
          <nav aria-label="Clock format" className="flex gap-1 rounded-full border border-fern p-1 text-xs font-medium">
            {(["12", "24"] as const).map((style) => (
              <a
                key={style}
                href={pageHref(query, { clock: style })}
                aria-current={query.clock === style ? "true" : undefined}
                className={`whitespace-nowrap rounded-full px-2.5 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun ${
                  query.clock === style ? "bg-sun text-pine" : "text-lichen hover:text-sage"
                }`}
              >
                {style}-hour
              </a>
            ))}
          </nav>
          <PoweredByBadge />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
        <SearchSentence query={query} mainName={main.ok ? main.place.name : ""} />
        <Body query={query} main={main} other={other} />
        <Notes />
      </main>

      <footer className="border-t border-fern">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-lichen sm:px-6">
          <p>
            Sunrise and sunset from the{" "}
            <a href={ASTRONOMY_API_URL} target="_blank" rel="noreferrer" className="text-sun underline decoration-sun/30 underline-offset-4 hover:decoration-sun">
              ipgeolocation.io Astronomy API
            </a>
            . Solstices from Meeus, <i>Astronomical Algorithms</i>. Open source under the MIT licence.
          </p>
          <PoweredByBadge />
        </div>
      </footer>
    </div>
  );
}

/** The search, written as a sentence: "Daylight in ___, compared with ___". */
function SearchSentence({ query, mainName }: { query: Query; mainName: string }) {
  const text = (source: Query["source"] | null) =>
    !source ? "" : source.kind === "place" ? source.text : source.kind === "coords" ? `${source.lat}, ${source.lon}` : "";

  return (
    <div>
      <form action="/" method="get" role="search" aria-label="Daylight for a place" className="flex flex-wrap items-center gap-x-3 gap-y-3 text-2xl font-semibold sm:text-3xl">
        <label htmlFor="place">Daylight in</label>
        <input
          id="place"
          name="place"
          defaultValue={text(query.source)}
          placeholder={mainName || "your city"}
          autoComplete="off"
          className="w-full min-w-0 rounded-xl border border-fern bg-moss px-4 py-2 text-xl font-medium text-sage outline-hidden placeholder:text-lichen/70 focus-visible:border-sun sm:w-72"
        />
        <label htmlFor="compare" className="text-lichen">
          compared with
        </label>
        <input
          id="compare"
          name="compare"
          defaultValue={text(query.compare)}
          placeholder="another city (optional)"
          autoComplete="off"
          className="w-full min-w-0 rounded-xl border border-fern bg-moss px-4 py-2 text-xl font-medium text-sage outline-hidden placeholder:text-lichen/60 focus-visible:border-dusk sm:w-72"
        />
        {query.clock === "24" ? <input type="hidden" name="clock" value="24" /> : null}
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-sun px-5 py-2.5 text-lg font-semibold text-pine transition hover:bg-sun-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
        >
          Show
          <MoveRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </form>
      <nav aria-label="Examples" className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-lichen">Try</span>
        {EXAMPLES.map((example) => (
          <a
            key={example.label}
            href={pageHref({ ...query, compare: null }, { place: example.place, compare: example.compare ?? null })}
            className="rounded-full border border-fern px-3 py-1 text-lichen transition hover:border-sun hover:text-sun focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun"
          >
            {example.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

function Body({ query, main, other }: { query: Query; main: Loaded; other: Loaded | null }) {
  if (!main.ok) {
    return (
      <section aria-labelledby="answer-heading" className="mt-10 rounded-3xl border border-fern bg-moss p-8">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-sun">{main.title}</p>
        <h1 id="answer-heading" className="mt-3 text-2xl font-semibold">
          {main.message}
        </h1>
      </section>
    );
  }

  const zone = main.timezone?.name ?? "UTC";
  const days = readDays(main.days, main.place.latitude);
  const summary = summarise(days, main.now.date);
  const turns = turnsIn(days, main.place.latitude, zone);
  const notes = [...query.problems, ...main.notes, ...(other && !other.ok ? [`Couldn't compare: ${other.message}`] : [])];
  const otherDays = other?.ok ? readDays(other.days, other.place.latitude) : null;
  const otherSummary = other?.ok && otherDays ? summarise(otherDays, other.now.date) : null;
  const place = main.place;

  if (!summary) {
    return null;
  }

  return (
    <>
      {notes.length > 0 ? (
        <ul className="mt-6 space-y-1 rounded-2xl border border-sun/30 bg-sun/10 px-4 py-3 text-sm">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <section aria-labelledby="answer-heading" className="mt-10 rounded-3xl border border-fern bg-moss p-5 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-lichen">
              {[place.name, place.detail].filter(Boolean).join(", ")} · {formatCoordinates(place.latitude, place.longitude)}
              {place.basis === "ip" ? ", roughly, from your IP address" : ""}
            </p>
            <h1 id="answer-heading" className="mt-2 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              <span className="font-mono text-sun">{formatLength(summary.today.length)}</span> of daylight today
            </h1>
            <TrendLine summary={summary} />
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-1 font-mono text-lg">
            <dt className="font-sans text-xs uppercase tracking-[0.14em] text-lichen">Sunrise</dt>
            <dt className="font-sans text-xs uppercase tracking-[0.14em] text-lichen">Sunset</dt>
            <dd>{clockOr(summary.today.sunrise, query.clock)}</dd>
            <dd>{clockOr(summary.today.sunset, query.clock)}</dd>
          </dl>
        </div>
        <div className="mt-8">
          <YearChart days={days} turns={turns} todayDate={main.now.date} clock={query.clock} placeName={place.name} />
        </div>
        <p className="mt-3 text-xs text-lichen">
          {main.timezone ? `Times are local to ${place.name}, in the ${main.timezone.name} time zone.` : `Times are local to ${place.name}.`}
        </p>
      </section>

      <div className="mt-8 gap-6 space-y-6 md:columns-2 lg:columns-3 [&>*]:break-inside-avoid">
        <LongerCard summary={summary} days={days} turns={turns} today={main.now.date} latitude={place.latitude} zone={zone} />
        <TodayCard summary={summary} clock={query.clock} />
        {otherDays && otherSummary && other?.ok ? (
          <Card title={`${place.name} and ${other.place.name}`} accent="bg-dusk">
            <CompareChart main={days} other={otherDays} mainName={place.name} otherName={other.place.name} />
            <dl className="mt-4 grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1.5 text-sm">
              <dt />
              <dd className="text-right text-xs text-sun">{place.name}</dd>
              <dd className="text-right text-xs text-dusk">{other.place.name}</dd>
              <CompareRow label="Today" a={summary.today.length} b={otherSummary.today.length} />
              <CompareRow label="Shortest" a={summary.shortest.length} b={otherSummary.shortest.length} />
              <CompareRow label="Longest" a={summary.longest.length} b={otherSummary.longest.length} />
            </dl>
          </Card>
        ) : null}
        <TurnsCard turns={turns} today={main.now.date} zone={zone} clock={query.clock} />
        <ExtremesCard days={days} clock={query.clock} />
        <RangeCard summary={summary} turns={turns} />
      </div>

      <MonthsTable days={days} clock={query.clock} />
    </>
  );
}

function TrendLine({ summary }: { summary: Summary }) {
  if (summary.today.polar) {
    return (
      <p className="mt-3 text-lg text-lichen">
        {summary.today.length > 0 ? "The sun doesn't set today." : "The sun doesn't rise today."}
      </p>
    );
  }

  const Icon = summary.trend === "longer" ? ArrowUpRight : summary.trend === "shorter" ? ArrowDownRight : Minus;

  return (
    <p className="mt-3 flex items-center gap-2 text-lg">
      <Icon className={`h-5 w-5 ${summary.trend === "longer" ? "text-leaf" : summary.trend === "shorter" ? "text-dusk" : "text-lichen"}`} aria-hidden="true" />
      {summary.trend === "steady"
        ? "Day length is barely changing right now."
        : `Days are getting ${summary.trend} by about ${formatRate(summary.rate)} a day.`}
    </p>
  );
}

function Card({ title, accent, children }: { title: string; accent: string; children: ReactNode }) {
  return (
    <article className="rounded-3xl border border-fern bg-moss p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${accent}`} aria-hidden="true" />
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </article>
  );
}

/** The question people search for most, answered for this place and this time of year. */
function LongerCard({
  summary,
  days,
  turns,
  today,
  latitude,
  zone,
}: {
  summary: Summary;
  days: Day[];
  turns: Turn[];
  today: string;
  latitude: number;
  zone: string;
}) {
  const nextShortest = turns.find((turn) => turn.kind === "shortest" && turn.date >= today);
  const nextLongest = turns.find((turn) => turn.kind === "longest" && turn.date >= today);
  const range = summary.longest.length - summary.shortest.length;
  let answer: ReactNode;

  if (summary.today.polar && summary.today.length === 0) {
    const back = days.find((day) => day.date > today && day.length > 0);
    answer = back
      ? `This is polar night: the sun stays below the horizon. It rises again on ${formatLongDate(back.date, today)}, for ${formatLength(back.length)}, and each day after is longer.`
      : "This is polar night: the sun stays below the horizon for the rest of the period shown.";
  } else if (range < 30) {
    answer = `Here, close to the equator, they barely change: between ${formatLength(summary.shortest.length)} and ${formatLength(summary.longest.length)} all year.`;
  } else if (nextShortest && nextShortest.length === 0 && (summary.trend === "shorter" || summary.trend === "steady")) {
    // Polar night: day length sits at zero either side of the solstice.
    const darkFrom = days.find((day) => day.date >= today && day.length === 0);
    const back = days.find((day) => day.date > nextShortest.date && day.length > 0);
    answer = (
      <>
        Here they shrink to nothing first.{" "}
        {darkFrom ? (
          <>
            Polar night starts on <strong>{formatLongDate(darkFrom.date, today)}</strong>, when the sun stops rising.{" "}
          </>
        ) : null}
        After the winter solstice on {formatLongDate(nextShortest.date, today)} the sun climbs back towards the horizon
        {back ? (
          <>
            , and it rises again on <strong>{formatLongDate(back.date, today)}</strong>, for {formatLength(back.length)}
          </>
        ) : null}
        . From then on every day is longer.
      </>
    );
  } else if (summary.trend === "shorter" || (summary.trend === "steady" && nextShortest && daysBetween(today, nextShortest.date) < 15)) {
    answer = nextShortest ? (
      <>
        After the <strong>{nextShortest.name.toLowerCase()}</strong> on <strong>{formatLongDate(nextShortest.date, today)}</strong>,{" "}
        {relativeDays(daysBetween(today, nextShortest.date))}. That day has {formatLength(nextShortest.length ?? 0)} of daylight, and every day after
        it is longer.
      </>
    ) : (
      "After the next winter solstice, beyond the year shown here."
    );
  } else {
    const previous = previousShortest(today, latitude, zone);
    answer = (
      <>
        They already are{previous ? ` (since the winter solstice on ${formatLongDate(previous, today)})` : ""}. They keep getting longer until
        {nextLongest ? ` the summer solstice on ${formatLongDate(nextLongest.date, today)}, with ${formatLength(nextLongest.length ?? 0)}` : " the summer solstice"}.
      </>
    );
  }

  return (
    <Card title="When do the days start getting longer?" accent="bg-leaf">
      <p className="text-base leading-relaxed">{answer}</p>
    </Card>
  );
}

function previousShortest(today: string, latitude: number, zone: string): string | null {
  const now = Date.parse(`${today}T12:00:00Z`);
  const events = seasonsBetween(now - 370 * 86400000, now).filter((event) => seasonMeaning(event.season, latitude).kind === "shortest");
  const last = events[events.length - 1];

  return last
    ? new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(last.at))
    : null;
}

function relativeDays(count: number): string {
  if (count === 0) {
    return "today";
  }

  return count === 1 ? "tomorrow" : `${count} days from now`;
}

function TodayCard({ summary, clock }: { summary: Summary; clock: ClockStyle }) {
  const { today, yesterday } = summary;
  const diff = yesterday ? today.length - yesterday.length : null;

  return (
    <Card title="Today against yesterday" accent="bg-sun">
      <dl className="divide-y divide-fern text-sm">
        <Row term="Sunrise">{clockOr(today.sunrise, clock)}</Row>
        <Row term="Sunset">{clockOr(today.sunset, clock)}</Row>
        <Row term="Daylight">{formatLength(today.length)}</Row>
        {yesterday ? <Row term="Yesterday">{formatLength(yesterday.length)}</Row> : null}
        {diff !== null ? (
          <Row term="Difference">{diff === 0 ? "Same, to the minute" : `${diff > 0 ? "+" : "−"}${formatLength(Math.abs(diff))}`}</Row>
        ) : null}
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-lichen">
        Times are to the minute, so a single day often shows 0 or 1 minute of change. The rate above is fitted over two weeks.
      </p>
    </Card>
  );
}

function TurnsCard({ turns, today, zone, clock }: { turns: Turn[]; today: string; zone: string; clock: ClockStyle }) {
  return (
    <Card title="Solstices and equinoxes" accent="bg-sage">
      <ul className="space-y-3">
        {turns.map((turn) => (
          <li key={turn.season} className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{turn.name}</p>
              <p className="text-sm text-lichen">
                {formatLongDate(turn.date, today)}, {instantTime(turn.at, zone, clock)}
              </p>
            </div>
            <p className="shrink-0 font-mono text-sm text-sun">{turn.length === null ? "" : formatLength(turn.length)}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function instantTime(ms: number, zone: string, clock: ClockStyle): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
    hourCycle: clock === "24" ? "h23" : "h12",
    timeZoneName: "short",
  }).format(new Date(ms));
}

function ExtremesCard({ days, clock }: { days: Day[]; clock: ClockStyle }) {
  const sunset = extremeTime(days, "earliest-sunset");
  const sunrise = extremeTime(days, "latest-sunrise");

  // Around polar night the "earliest sunset" is just the last sunset before the dark: not a useful answer.
  if (!sunset || !sunrise || days.some((day) => day.polar)) {
    return null;
  }

  const lengths = days.map((day) => day.length);
  const tropical = Math.max(...lengths) - Math.min(...lengths) < 30;

  const span = (from: string, to: string) => (from === to ? formatShortDate(from) : `${formatShortDate(from)} to ${formatShortDate(to)}`);

  return (
    <Card title="Earliest sunset, latest sunrise" accent="bg-dusk">
      <dl className="space-y-3">
        <div>
          <dt className="text-sm text-lichen">Earliest sunset</dt>
          <dd className="mt-0.5">
            <span className="font-mono text-lg text-sun">{formatClock(sunset.minutes, clock)}</span>
            <span className="ml-2 text-sm">{span(sunset.from, sunset.to)}</span>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-lichen">Latest sunrise</dt>
          <dd className="mt-0.5">
            <span className="font-mono text-lg text-sun">{formatClock(sunrise.minutes, clock)}</span>
            <span className="ml-2 text-sm">{span(sunrise.from, sunrise.to)}</span>
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-lichen">
        {tropical
          ? "Near the equator the day hardly changes length, so sunrise and sunset move mostly with solar noon, which Earth's orbit and tilt shift by about half an hour through the year."
          : "Neither falls on the shortest day. Earth's orbit and tilt shift solar noon through the year, so sunsets turn later before the solstice and sunrises keep getting later after it. Clock changes move both by an hour."}
      </p>
    </Card>
  );
}

function RangeCard({ summary, turns }: { summary: Summary; turns: Turn[] }) {
  // Times are to the minute, so several days can tie; the solstice is the honest one to name.
  const pick = (kind: "shortest" | "longest", fallback: Day) => {
    const turn = turns.find((item) => item.kind === kind && item.length === fallback.length);

    return turn ? { date: turn.date, length: fallback.length } : fallback;
  };
  const shortest = pick("shortest", summary.shortest);
  const longest = pick("longest", summary.longest);

  return (
    <Card title="Across the year" accent="bg-sun-deep">
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-sm text-lichen">Shortest day</dt>
          <dd className="font-mono text-lg">{formatLength(shortest.length)}</dd>
          <dd className="text-xs text-lichen">{formatShortDate(shortest.date)}</dd>
        </div>
        <div>
          <dt className="text-sm text-lichen">Longest day</dt>
          <dd className="font-mono text-lg">{formatLength(longest.length)}</dd>
          <dd className="text-xs text-lichen">{formatShortDate(longest.date)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm">
        A swing of <span className="font-mono text-sun">{formatLength(longest.length - shortest.length)}</span> between them.
      </p>
    </Card>
  );
}

function MonthsTable({ days, clock }: { days: Day[]; clock: ClockStyle }) {
  const rows = monthRows(days);

  return (
    <section aria-labelledby="months-heading" className="mt-8 rounded-3xl border border-fern bg-moss p-5 sm:p-6">
      <h2 id="months-heading" className="flex items-center gap-2 text-lg font-semibold">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-leaf" aria-hidden="true" />
        Month by month
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.12em] text-lichen">
              <th scope="col" className="pb-2 font-medium">On the 1st of</th>
              <th scope="col" className="pb-2 font-medium">Sunrise</th>
              <th scope="col" className="pb-2 font-medium">Sunset</th>
              <th scope="col" className="pb-2 font-medium">Daylight</th>
              <th scope="col" className="pb-2 text-right font-medium">Since last month</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fern font-mono">
            {rows.map((row) => (
              <tr key={row.date}>
                <th scope="row" className="py-2 text-left font-sans font-medium">
                  {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${row.date}T00:00:00Z`))}
                </th>
                <td className="py-2">{clockOr(row.sunrise, clock)}</td>
                <td className="py-2">{clockOr(row.sunset, clock)}</td>
                <td className="py-2 text-sun">{formatLength(row.length)}</td>
                <td className={`py-2 text-right ${row.change === null || row.change === 0 ? "text-lichen" : row.change > 0 ? "text-leaf" : "text-dusk"}`}>
                  {row.change === null ? "" : row.change === 0 ? "No change" : `${row.change > 0 ? "+" : "\u2212"}${formatLength(Math.abs(row.change))}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CompareRow({ label, a, b }: { label: string; a: number; b: number }) {
  return (
    <>
      <dt className="text-lichen">{label}</dt>
      <dd className="text-right font-mono">{formatLength(a)}</dd>
      <dd className="text-right font-mono">{formatLength(b)}</dd>
    </>
  );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-lichen">{term}</dt>
      <dd className="font-mono">{children}</dd>
    </div>
  );
}

function clockOr(minutes: number | null, clock: ClockStyle): string {
  return minutes === null ? "None" : formatClock(minutes, clock);
}

const NOTES = [
  {
    question: "When do the days start getting longer?",
    answer:
      "Right after the winter solstice: around 21 December north of the equator, and around 21 June south of it. The change is only a few seconds a day at first, then speeds up towards the equinox, when days lengthen by two minutes or more a day in mid-latitudes.",
  },
  {
    question: "Why are sunrises still getting later in January?",
    answer:
      "Because solar noon drifts through the year, from Earth's tilt and its oval orbit. Around the December solstice both push it later, by about half a minute a day, so the whole day shifts later while its length barely changes. Evenings start brightening in early December; mornings keep getting darker into January. The cards here show exactly when for your place.",
  },
  {
    question: "How much daylight do we gain each day?",
    answer:
      "It depends on latitude and season. Near the solstices it is only seconds a day. Around the equinoxes it is fastest: about two minutes a day in New York, closer to four in London, and much more in the far north.",
  },
  {
    question: "Why is the equinox not exactly 12 hours of daylight?",
    answer:
      "Sunrise and sunset are counted from the moment the top edge of the sun meets the horizon, and the atmosphere bends its light so it is visible slightly early and late. Together these add several minutes, so the day of equal light and dark comes a few days before the spring equinox and after the autumn one.",
  },
  {
    question: "What happens near the poles?",
    answer:
      "Far enough north of the Arctic Circle the sun doesn't rise at all for days or weeks around the December solstice (polar night), and doesn't set around the June solstice (the midnight sun). The chart shows those as empty or fully filled days.",
  },
  {
    question: "Where do these times come from?",
    answer:
      "Sunrise and sunset for each day come from the ipgeolocation.io Astronomy API, a year at a time, for the exact coordinates. The solstice and equinox times are calculated with Jean Meeus's published algorithm, accurate to about a minute.",
  },
];

function Notes() {
  return (
    <section aria-labelledby="notes-heading" className="mt-16">
      <h2 id="notes-heading" className="text-2xl font-semibold tracking-tight">
        Daylight, explained
      </h2>
      <div className="mt-6 grid gap-x-10 gap-y-7 md:grid-cols-2 lg:grid-cols-3">
        {NOTES.map((note) => (
          <div key={note.question}>
            <h3 className="font-semibold">{note.question}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-lichen">{note.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
