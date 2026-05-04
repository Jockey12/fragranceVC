# Database

The production data layer is designed for PostgreSQL/Supabase.

## Why PostgreSQL

An “all perfumes” catalog is relational and search-heavy: fragrances, brands, perfumers, notes, accords, images, votes, seasons, and dupe relationships. PostgreSQL gives this app full-text search, trigram fuzzy search, array indexes for notes/accords, JSONB for raw provider payloads, and a clean migration path to Supabase or Neon.

## Setup

1. Create a PostgreSQL database.
2. Run `database/schema.sql`.
3. Import licensed fragrance data into `app_fragrances`.
4. Set `DATABASE_URL` and `FRAGELLA_API_KEY` to enable incremental cache sync from Fragella.
5. Optional tuning: `FRAGELLA_SYNC_BATCH_LIMIT` and `FRAGELLA_SYNC_MAX_DEPTH`.

## Data Sources

Recommended sources:

- FragDB full export for a PostgreSQL-backed catalog.
- Fragella API for key-based live fragrance search.
- Local starter catalog for development and demos.

Do not scrape Fragrantica without explicit permission. The app can visually reference social-card layout patterns without copying Fragrantica branding or assets.
