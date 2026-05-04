create extension if not exists pg_trgm;
create extension if not exists unaccent;
create extension if not exists pgcrypto;

create table if not exists perfume_houses (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null unique,
  country text,
  website text,
  logo_url text,
  parent_company text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_fragrances (
  id text primary key,
  external_id text unique,
  name text not null,
  house text not null,
  house_id uuid references perfume_houses(id) on delete set null,
  kind text not null default 'Original' check (kind in ('Original', 'Dupe')),
  dupe_for text,
  year integer,
  image_url text,
  country text,
  price_usd numeric(10, 2),
  price_band text check (price_band in ('$', '$$', '$$$', '$$$$')),
  popularity_score integer default 50 check (popularity_score between 0 and 100),
  rating numeric(3, 2),
  rating_votes integer,
  concentration text,
  gender text default 'Unisex' check (gender in ('Unisex', 'Feminine', 'Masculine')),
  top_notes text[] not null default '{}',
  heart_notes text[] not null default '{}',
  base_notes text[] not null default '{}',
  accords text[] not null default '{}',
  moods text[] not null default '{}',
  occasions text[] not null default '{}',
  seasons text[] not null default '{}',
  projection text default 'Moderate' check (projection in ('Skin scent', 'Moderate', 'Strong', 'Beast mode')),
  longevity_hours numeric(4, 1) default 6,
  color_a text default '#dfe8d8',
  color_b text default '#243e39',
  description text,
  raw jsonb not null default '{}'::jsonb,
  search_vector tsvector not null default ''::tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists fragrance_dupes (
  id uuid primary key default gen_random_uuid(),
  original_id text not null references app_fragrances(id) on delete cascade,
  dupe_id text not null references app_fragrances(id) on delete cascade,
  similarity_score numeric(5, 2),
  notes text,
  created_at timestamptz not null default now(),
  unique (original_id, dupe_id)
);

create table if not exists fragrance_import_batches (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_version text,
  row_count integer not null default 0,
  imported_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists fragrance_cache_sync_state (
  id integer primary key default 1,
  status text not null default 'syncing' check (status in ('syncing', 'complete')),
  queue text[] not null default '{}',
  processed_prefixes integer not null default 0,
  total_prefixes integer not null default 0,
  last_prefix text,
  latest_batch_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_fragrances_search_idx on app_fragrances using gin (search_vector);
create index if not exists app_fragrances_name_trgm_idx on app_fragrances using gin (name gin_trgm_ops);
create index if not exists app_fragrances_house_trgm_idx on app_fragrances using gin (house gin_trgm_ops);
create index if not exists app_fragrances_accords_idx on app_fragrances using gin (accords);
create index if not exists app_fragrances_notes_idx on app_fragrances using gin ((top_notes || heart_notes || base_notes));
create index if not exists app_fragrances_kind_price_idx on app_fragrances (kind, price_usd);
create index if not exists app_fragrances_popularity_idx on app_fragrances (popularity_score desc, rating desc);
