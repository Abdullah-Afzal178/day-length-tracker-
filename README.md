# Day Length Tracker

When do the days start getting longer? How many hours of daylight you have today, how fast that is changing, and a year of sunrise and sunset for any place, with a side-by-side comparison. Powered by [ipgeolocation.io](https://ipgeolocation.io).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-000?logo=nextdotjs)](https://nextjs.org/)
[![Powered by ipgeolocation.io](https://img.shields.io/badge/Powered%20by-ipgeolocation.io-f3d36b)](https://ipgeolocation.io)

<!-- Add a screenshot of the tool running locally at ./public/tool.png and reference it here -->

---

## What It Does

- **Today's daylight** for your location (from your IP), a city you search for, or coordinates, with sunrise, sunset and how much you gain or lose each day.
- **When the days start getting longer**: the next winter solstice, on your local calendar, and its day length. South of the equator that is the June solstice. Under polar night, it names the day the sun stops rising and the day it comes back.
- **A year of daylight** as one chart: a bar per day from sunrise to sunset, with the solstices, equinoxes, today and every clock change visible.
- **Solstices and equinoxes**: the exact local time of each in the coming year.
- **Earliest sunset and latest sunrise**, which never fall on the shortest day.
- **Month by month**: sunrise, sunset and daylight on the 1st of each month, and the change since the month before.
- **Compare two places**: day length through the year on one chart.

---

## Design notes

**The rate is fitted, not subtracted.** Sun times come to the minute, so near a solstice a single day's change is 0 or 1 minute. The daily rate is a straight-line fit over two weeks, which recovers the seconds.

**Solstices are calculated, not guessed from ties.** Near a solstice several days share the same day length to the minute. The solstice instant comes from Jean Meeus's algorithm (Astronomical Algorithms, chapter 27), tested to within two minutes of published times, and is placed on the local calendar with the place's time zone.

**Clock changes are left in.** Sunrise and sunset are shown as the clock reads them, so the chart shows the hour jumps, and the latest sunrise is often the last morning of summer time rather than January.

**Polar days are handled.** No sunrise means either polar night or the midnight sun; the sun's noon height decides which. Sunsets just after midnight, under the midnight sun, are drawn as the previous evening's.

---

## Why ipgeolocation.io

- **[Astronomy API](https://ipgeolocation.io/documentation/astronomy-api.html)** time series: sunrise, sunset and day length for every day of the year, in five 90-day calls made in parallel and cached for a day.
- **Astronomy API** single-day lookup turns your IP address, a place name or coordinates into a location.
- **[Timezone API](https://ipgeolocation.io/documentation/timezone-api.html)** names the time zone, to place each solstice on the local calendar.
- **Free tier**: all of it works on the free plan.

**[Get your free API key →](https://ipgeolocation.io/signup)**

---

## Features

- **Daylight today** and the daily rate of change
- **The answer to "when do the days get longer"** for any hemisphere, the tropics and polar night
- **Year chart** of sunrise and sunset
- **Solstice and equinox times** in local time
- **Earliest sunset and latest sunrise**
- **Monthly table**
- **Two-place comparison**
- **12-hour or 24-hour** clock
- **Works without JavaScript**: everything is server-rendered
- **SEO-ready**: Open Graph tags, meta description, `robots.txt`, `sitemap.xml` and favicon

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org/) (App Router) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Language | TypeScript |
| Fonts | Bricolage Grotesque and Geist Mono via `next/font` |
| Icons | [lucide-react](https://lucide.dev/) |
| Data | [ipgeolocation.io](https://ipgeolocation.io) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [ipgeolocation.io](https://ipgeolocation.io/signup) API key (the free tier is enough)

### Run It Locally

1. Clone the repo:

```bash
git clone https://github.com/Abdullah-Afzal178/day-length-tracker.git
cd day-length-tracker
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root:

```env
IPGEOLOCATION_API_KEY=your_api_key_here
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

> On `localhost` there is no public IP to locate you by, so the page starts from New York and says so. Search for your own city.

---

## Tests

Solstice times, day-length analysis, the daily rate, earliest sunset and latest sunrise, polar night, the midnight sun and the equator are tested against real API responses:

```bash
npm test
```

---

## URL Parameters

| Parameter | Example | Meaning |
|---|---|---|
| `place` | `London, United Kingdom` | A place name, or coordinates such as `51.5, -0.12` |
| `lat`, `lon` | `69.65`, `18.96` | Coordinates |
| `compare` | `Miami, Florida` | A second place to compare with |
| `clock` | `24` | 24-hour clock; 12-hour if left out |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `IPGEOLOCATION_API_KEY` | Yes | Your [ipgeolocation.io](https://ipgeolocation.io/signup) API key |
| `NEXT_PUBLIC_SITE_URL` | No | Your production URL if you deploy (used for the sitemap and robots.txt) |

---

## Project Structure

```
day-length-tracker/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                 # Search, chart, cards, monthly table, notes
│   ├── opengraph-image.tsx
│   ├── robots.ts
│   └── sitemap.ts
├── components/
│   ├── year-chart.tsx           # Sunrise and sunset for a year (SVG)
│   ├── compare-chart.tsx        # Day length for two places (SVG)
│   └── powered-by-badge.tsx
├── lib/
│   ├── daylight.ts              # Day length, rate, turns, extremes (pure)
│   ├── seasons.ts               # Solstices and equinoxes, Meeus (pure)
│   ├── clock.ts                 # Times and dates (pure)
│   ├── query.ts                 # URL parameters (pure)
│   ├── astronomy.ts             # API calls (server only)
│   ├── test-fixtures.ts         # Captured API responses
│   └── session-cache.ts
├── .env                         # API key (not committed)
└── README.md
```

---

## Want to Deploy It?

Works out of the box on any platform that supports Next.js:

- **Vercel**: import the repo, add `IPGEOLOCATION_API_KEY`, deploy.
- **Netlify**, **Cloudflare Pages**, **Railway**: a similar process.
- **Self-hosted**: `npm run build && npm start`.

Behind a proxy or CDN, make sure it forwards the visitor's address (`X-Forwarded-For`, `X-Real-IP` or `CF-Connecting-IP`), or every visitor will be located at the proxy.

---

## License

MIT. See [LICENSE](LICENSE) for details.
