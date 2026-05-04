# FragranceVC

A modern Next.js + Tailwind perfume finder. Users describe how they want to smell, filter by notes, mood, occasion, gender direction, price, and dupe/original status, then select a perfume to view a Fragrantica-style profile card with a draggable 3D bottle.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Catalog Sources

The app supports three data modes:

- `local`: built-in starter catalog for development.
- `fragella`: live API search when `FRAGELLA_API_KEY` is set.
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
```

## Full Perfume Database

There is no legal free API that reliably exposes “all perfumes.” The production-ready path is PostgreSQL/Supabase with a licensed catalog import such as FragDB, or a live API such as Fragella. Direct Fragrantica scraping is intentionally not included.

## Checks

```bash
npm run typecheck
npm run build
npm audit --omit=dev
```
