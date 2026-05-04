# FragranceVC

A modern Next.js + Tailwind perfume finder. Users describe how they want to smell, filter by notes, mood, occasion, gender direction, price, and dupe/original status, then select a perfume to view a Fragrantica-style profile card.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Catalog Sources

The app supports three data modes:

- `local`: built-in starter catalog for development.
- `fragella`: live API search across a large fragrance API when `FRAGELLA_API_KEY` is set.
- `postgres`: full imported catalog when `DATABASE_URL` points to the schema in `database/schema.sql`.

Copy `.env.example` to `.env.local` and choose a source:

```bash
FRAGRANCE_DATA_SOURCE=postgres
DATABASE_URL=postgres://...
```

or:

```bash
FRAGRANCE_DATA_SOURCE=fragella
FRAGELLA_API_KEY=...
FRAGELLA_DEFAULT_SEARCH=a
```

## Full Perfume Database

There is no legal free API that reliably exposes “all perfumes.” The production-ready path is PostgreSQL/Supabase with a licensed catalog import such as FragDB, or a live API such as Fragella. Direct Fragrantica scraping is intentionally not included.

When both `FRAGELLA_API_KEY` and `DATABASE_URL` are configured, the selector uses PostgreSQL as the source of truth and performs incremental Fragella cache-sync in the background (one prefix batch per request) so new perfumes keep being ingested over time.

Optional sync tuning:

```bash
FRAGELLA_SYNC_BATCH_LIMIT=500
FRAGELLA_SYNC_MAX_DEPTH=3
FRAGELLA_SYNC_MIN_INTERVAL_SECONDS=30
```

## Deploy On Vercel

Vercel is the recommended deployment target because this app uses a Next API route and optional secret API/database credentials.

Set these environment variables in Vercel:

```bash
FRAGRANCE_DATA_SOURCE=fragella
FRAGELLA_API_KEY=your_key
DATABASE_URL=your_postgres_url
```

`DATABASE_URL` is optional, but needed if you want API results cached into the database.

## Pages

- `/`: polished landing page.
- `/selector`: fragrance selector and profile cards.
- `/how-built`: prompt history and build notes.

## Checks

```bash
npm run typecheck
npm run build
npm audit --omit=dev
```
