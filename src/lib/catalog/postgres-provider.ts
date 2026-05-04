import postgres from "postgres";

import type { Fragrance } from "@/data/fragrances";
import { fetchFragellaCatalogBatch } from "@/lib/catalog/fragella-provider";
import {
  searchFragranceList,
  type CatalogSyncProgress,
  type FinderParams,
  type FragranceSearchResponse,
  sanitizeFinderParams,
} from "@/lib/fragrance-search";
import { clampNumber, sanitizeCssColor, sanitizeExternalImageUrl, sanitizePlainText, sanitizeTextArray } from "@/lib/safety";

type FragranceRow = {
  id: string;
  name: string;
  house: string;
  kind: Fragrance["kind"];
  dupe_for: string | null;
  year: number | null;
  image_url: string | null;
  country: string | null;
  price_usd: number | null;
  price_band: Fragrance["priceBand"] | null;
  popularity_score: number | null;
  rating: number | null;
  rating_votes: number | null;
  concentration: string | null;
  gender: Fragrance["gender"] | null;
  top_notes: string[] | null;
  heart_notes: string[] | null;
  base_notes: string[] | null;
  accords: string[] | null;
  moods: string[] | null;
  occasions: string[] | null;
  seasons: string[] | null;
  projection: Fragrance["projection"] | null;
  longevity_hours: number | null;
  color_a: string | null;
  color_b: string | null;
  description: string | null;
};

type SyncStateRow = {
  status: "syncing" | "complete";
  queue: string[];
  processed_prefixes: number;
  total_prefixes: number;
  last_prefix: string | null;
  latest_batch_count: number;
  updated_at: string;
};

const FRAGELLA_SYNC_LOCK_KEY = 782331;
const DEFAULT_SYNC_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789".split("");

let client: ReturnType<typeof postgres> | null = null;

function getClient(databaseUrl: string) {
  client ??= postgres(databaseUrl, {
    max: 5,
    prepare: false,
  });

  return client;
}

async function ensureSyncStateTable(sql: ReturnType<typeof postgres>) {
  await sql`
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
    )
  `;

  await sql`
    insert into fragrance_cache_sync_state (id, status, queue, processed_prefixes, total_prefixes)
    values (1, 'syncing', ${DEFAULT_SYNC_CHARS}, 0, ${DEFAULT_SYNC_CHARS.length})
    on conflict (id) do nothing
  `;
}

async function readSyncState(sql: ReturnType<typeof postgres>) {
  const rows = await sql<SyncStateRow[]>`
    select status, queue, processed_prefixes, total_prefixes, last_prefix, latest_batch_count, updated_at
    from fragrance_cache_sync_state
    where id = 1
  `;

  return rows[0];
}

function buildSyncProgress(syncState: SyncStateRow, note?: string): CatalogSyncProgress {
  return {
    status: syncState.status,
    processedPrefixes: syncState.processed_prefixes,
    totalPrefixes: syncState.total_prefixes,
    queueSize: syncState.queue.length,
    latestBatchCount: syncState.latest_batch_count,
    lastPrefix: syncState.last_prefix ?? undefined,
    note,
  };
}

function priceBand(price: number): Fragrance["priceBand"] {
  if (price < 50) return "$";
  if (price < 150) return "$$";
  if (price < 280) return "$$$";
  return "$$$$";
}

function mapRow(row: FragranceRow): Fragrance {
  const price = clampNumber(row.price_usd, 0, 0, 10000);

  return {
    id: sanitizePlainText(row.id, 180) || "unknown-fragrance",
    name: sanitizePlainText(row.name, 160) || "Unknown fragrance",
    house: sanitizePlainText(row.house, 120) || "Unknown house",
    kind: row.kind ?? "Original",
    dupeFor: sanitizePlainText(row.dupe_for, 160) || undefined,
    year: clampNumber(row.year, 0, 0, new Date().getFullYear() + 1) || undefined,
    imageUrl: sanitizeExternalImageUrl(row.image_url),
    country: sanitizePlainText(row.country, 80) || undefined,
    votes: clampNumber(row.rating_votes, 0, 0, 100000000) || undefined,
    price,
    priceBand: row.price_band ?? priceBand(price),
    popularity: clampNumber(row.popularity_score, 50, 0, 100),
    rating: clampNumber(row.rating, 0, 0, 5),
    concentration: sanitizePlainText(row.concentration, 80) || "Fragrance",
    gender: row.gender ?? "Unisex",
    topNotes: sanitizeTextArray(row.top_notes ?? [], 8, 48),
    heartNotes: sanitizeTextArray(row.heart_notes ?? [], 8, 48),
    baseNotes: sanitizeTextArray(row.base_notes ?? [], 8, 48),
    accords: sanitizeTextArray(row.accords ?? [], 12, 48),
    moods: sanitizeTextArray(row.moods ?? [], 10, 48),
    occasions: sanitizeTextArray(row.occasions ?? [], 10, 48),
    seasons: sanitizeTextArray(row.seasons ?? [], 8, 32),
    projection: row.projection ?? "Moderate",
    longevityHours: clampNumber(row.longevity_hours, 6, 0, 48),
    colorA: sanitizeCssColor(row.color_a, "#dfe8d8"),
    colorB: sanitizeCssColor(row.color_b, "#243e39"),
    description: sanitizePlainText(row.description, 500) || `${row.name} by ${row.house}.`,
  };
}

function toDbFragrance(fragrance: Fragrance) {
  return {
    id: fragrance.id,
    name: fragrance.name,
    house: fragrance.house,
    kind: fragrance.kind,
    dupe_for: fragrance.dupeFor ?? null,
    year: fragrance.year ?? null,
    image_url: fragrance.imageUrl ?? null,
    country: fragrance.country ?? null,
    price_usd: fragrance.price || null,
    price_band: fragrance.priceBand,
    popularity_score: fragrance.popularity,
    rating: fragrance.rating || null,
    rating_votes: fragrance.votes ?? null,
    concentration: fragrance.concentration,
    gender: fragrance.gender,
    top_notes: fragrance.topNotes,
    heart_notes: fragrance.heartNotes,
    base_notes: fragrance.baseNotes,
    accords: fragrance.accords,
    moods: fragrance.moods,
    occasions: fragrance.occasions,
    seasons: fragrance.seasons,
    projection: fragrance.projection,
    longevity_hours: fragrance.longevityHours,
    color_a: fragrance.colorA,
    color_b: fragrance.colorB,
    description: fragrance.description,
    raw: JSON.stringify({
      provider: "fragella",
      imageUrl: fragrance.imageUrl,
      importedAt: new Date().toISOString(),
    }),
  };
}

export async function upsertFragrances(fragrances: Fragrance[], databaseUrl: string) {
  if (!fragrances.length) return 0;

  const sql = getClient(databaseUrl);

  await sql.begin(async (transaction) => {
    for (const fragrance of fragrances) {
      const row = toDbFragrance(fragrance);

      try {
        await transaction`
          insert into app_fragrances (
            id,
            name,
            house,
            kind,
            dupe_for,
            year,
            image_url,
            country,
            price_usd,
            price_band,
            popularity_score,
            rating,
            rating_votes,
            concentration,
            gender,
            top_notes,
            heart_notes,
            base_notes,
            accords,
            moods,
            occasions,
            seasons,
            projection,
            longevity_hours,
            color_a,
            color_b,
            description,
            raw,
            search_vector,
            updated_at
          )
          values (
            ${row.id},
            ${row.name},
            ${row.house},
            ${row.kind},
            ${row.dupe_for},
            ${row.year},
            ${row.image_url},
            ${row.country},
            ${row.price_usd},
            ${row.price_band},
            ${row.popularity_score},
            ${row.rating},
            ${row.rating_votes},
            ${row.concentration},
            ${row.gender},
            ${row.top_notes},
            ${row.heart_notes},
            ${row.base_notes},
            ${row.accords},
            ${row.moods},
            ${row.occasions},
            ${row.seasons},
            ${row.projection},
            ${row.longevity_hours},
            ${row.color_a},
            ${row.color_b},
            ${row.description},
            ${row.raw}::jsonb,
            (
              setweight(to_tsvector('english', unaccent(${row.name})), 'A') ||
              setweight(to_tsvector('english', unaccent(${row.house})), 'A') ||
              setweight(to_tsvector('english', unaccent(${row.description ?? ""})), 'B') ||
              setweight(to_tsvector('english', unaccent(${(row.accords ?? []).join(" ")})), 'B') ||
              setweight(
                to_tsvector(
                  'english',
                  unaccent(${[...(row.top_notes ?? []), ...(row.heart_notes ?? []), ...(row.base_notes ?? [])].join(" ")})
                ),
                'C'
              ) ||
              setweight(
                to_tsvector(
                  'english',
                  unaccent(${[...(row.moods ?? []), ...(row.occasions ?? []), ...(row.seasons ?? [])].join(" ")})
                ),
                'D'
              )
            ),
            now()
          )
          on conflict (id) do update set
            name = excluded.name,
            house = excluded.house,
            kind = excluded.kind,
            dupe_for = excluded.dupe_for,
            year = excluded.year,
            image_url = excluded.image_url,
            country = excluded.country,
            price_usd = excluded.price_usd,
            price_band = excluded.price_band,
            popularity_score = excluded.popularity_score,
            rating = excluded.rating,
            rating_votes = excluded.rating_votes,
            concentration = excluded.concentration,
            gender = excluded.gender,
            top_notes = excluded.top_notes,
            heart_notes = excluded.heart_notes,
            base_notes = excluded.base_notes,
            accords = excluded.accords,
            moods = excluded.moods,
            occasions = excluded.occasions,
            seasons = excluded.seasons,
            projection = excluded.projection,
            longevity_hours = excluded.longevity_hours,
            color_a = excluded.color_a,
            color_b = excluded.color_b,
            description = excluded.description,
            raw = app_fragrances.raw || excluded.raw,
            search_vector = (
              setweight(to_tsvector('english', unaccent(coalesce(excluded.name, ''))), 'A') ||
              setweight(to_tsvector('english', unaccent(coalesce(excluded.house, ''))), 'A') ||
              setweight(to_tsvector('english', unaccent(coalesce(excluded.description, ''))), 'B') ||
              setweight(to_tsvector('english', unaccent(array_to_string(coalesce(excluded.accords, '{}'::text[]), ' '))), 'B') ||
              setweight(
                to_tsvector(
                  'english',
                  unaccent(
                    array_to_string(
                      coalesce(excluded.top_notes, '{}'::text[]) ||
                      coalesce(excluded.heart_notes, '{}'::text[]) ||
                      coalesce(excluded.base_notes, '{}'::text[]),
                      ' '
                    )
                  )
                ),
                'C'
              ) ||
              setweight(
                to_tsvector(
                  'english',
                  unaccent(
                    array_to_string(
                      coalesce(excluded.moods, '{}'::text[]) ||
                      coalesce(excluded.occasions, '{}'::text[]) ||
                      coalesce(excluded.seasons, '{}'::text[]),
                      ' '
                    )
                  )
                ),
                'D'
              )
            ),
            updated_at = now()
        `;
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
        const generatedSearchVector =
          message.includes("search_vector") && (message.includes("generated") || message.includes("cannot insert"));

        if (!generatedSearchVector) {
          throw error;
        }

        await transaction`
          insert into app_fragrances (
            id,
            name,
            house,
            kind,
            dupe_for,
            year,
            image_url,
            country,
            price_usd,
            price_band,
            popularity_score,
            rating,
            rating_votes,
            concentration,
            gender,
            top_notes,
            heart_notes,
            base_notes,
            accords,
            moods,
            occasions,
            seasons,
            projection,
            longevity_hours,
            color_a,
            color_b,
            description,
            raw,
            updated_at
          )
          values (
            ${row.id},
            ${row.name},
            ${row.house},
            ${row.kind},
            ${row.dupe_for},
            ${row.year},
            ${row.image_url},
            ${row.country},
            ${row.price_usd},
            ${row.price_band},
            ${row.popularity_score},
            ${row.rating},
            ${row.rating_votes},
            ${row.concentration},
            ${row.gender},
            ${row.top_notes},
            ${row.heart_notes},
            ${row.base_notes},
            ${row.accords},
            ${row.moods},
            ${row.occasions},
            ${row.seasons},
            ${row.projection},
            ${row.longevity_hours},
            ${row.color_a},
            ${row.color_b},
            ${row.description},
            ${row.raw}::jsonb,
            now()
          )
          on conflict (id) do update set
            name = excluded.name,
            house = excluded.house,
            kind = excluded.kind,
            dupe_for = excluded.dupe_for,
            year = excluded.year,
            image_url = excluded.image_url,
            country = excluded.country,
            price_usd = excluded.price_usd,
            price_band = excluded.price_band,
            popularity_score = excluded.popularity_score,
            rating = excluded.rating,
            rating_votes = excluded.rating_votes,
            concentration = excluded.concentration,
            gender = excluded.gender,
            top_notes = excluded.top_notes,
            heart_notes = excluded.heart_notes,
            base_notes = excluded.base_notes,
            accords = excluded.accords,
            moods = excluded.moods,
            occasions = excluded.occasions,
            seasons = excluded.seasons,
            projection = excluded.projection,
            longevity_hours = excluded.longevity_hours,
            color_a = excluded.color_a,
            color_b = excluded.color_b,
            description = excluded.description,
            raw = app_fragrances.raw || excluded.raw,
            updated_at = now()
        `;
      }
    }
  });

  await sql`
    insert into fragrance_import_batches (source, source_version, row_count, metadata)
    values ('fragella-api', 'search-cache', ${fragrances.length}, ${JSON.stringify({ mode: "upsert" })}::jsonb)
  `;

  return fragrances.length;
}

export async function countPostgresFragrances(databaseUrl: string) {
  const sql = getClient(databaseUrl);
  const rows = await sql<{ count: string }[]>`select count(*)::text as count from app_fragrances`;

  return Number(rows[0]?.count ?? 0);
}

export async function isPostgresCatalogReady(databaseUrl: string) {
  const sql = getClient(databaseUrl);
  const rows = await sql<{ ready: boolean }[]>`
    select
      exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'app_fragrances')
      and exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'app_fragrances' and column_name = 'search_vector')
      and exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'fragrance_import_batches')
    as ready
  `;

  return Boolean(rows[0]?.ready);
}

export async function getFragellaCacheSyncProgress(databaseUrl: string, note?: string): Promise<CatalogSyncProgress> {
  const sql = getClient(databaseUrl);
  await ensureSyncStateTable(sql);
  const syncState = await readSyncState(sql);

  if (!syncState) {
    return {
      status: "error",
      processedPrefixes: 0,
      totalPrefixes: 0,
      queueSize: 0,
      latestBatchCount: 0,
      note: note ?? "Cache sync state is unavailable.",
    };
  }

  return buildSyncProgress(syncState, note);
}

export async function runFragellaCacheSyncStep(options: {
  databaseUrl: string;
  apiKey: string;
  limit: number;
  maxDepth: number;
  minIntervalSeconds: number;
}): Promise<CatalogSyncProgress> {
  const sql = getClient(options.databaseUrl);
  await ensureSyncStateTable(sql);

  const lockRows = await sql<{ locked: boolean }[]>`
    select pg_try_advisory_lock(${FRAGELLA_SYNC_LOCK_KEY}) as locked
  `;

  if (!lockRows[0]?.locked) {
    return getFragellaCacheSyncProgress(options.databaseUrl, "Cache sync is busy; continuing on the next refresh.");
  }

  try {
    const syncState = await readSyncState(sql);

    if (!syncState) {
      return {
        status: "error",
        processedPrefixes: 0,
        totalPrefixes: 0,
        queueSize: 0,
        latestBatchCount: 0,
        note: "Cache sync state could not be initialized.",
      };
    }

    const queue = [...(syncState.queue ?? [])];

    if (!queue.length) {
      await sql`
        update fragrance_cache_sync_state
        set status = 'complete', updated_at = now()
        where id = 1
      `;

      const completeState = await readSyncState(sql);

      return buildSyncProgress(
        completeState ?? {
          ...syncState,
          status: "complete",
          queue: [],
        },
        "Fragella cache sync completed.",
      );
    }

    if (options.minIntervalSeconds > 0) {
      const nextAllowedAt = Date.parse(syncState.updated_at) + options.minIntervalSeconds * 1000;
      if (Number.isFinite(nextAllowedAt) && Date.now() < nextAllowedAt) {
        return buildSyncProgress(syncState, "Sync pacing is active to reduce Fragella API usage.");
      }
    }

    const currentPrefix = queue.shift() ?? "";
    const batch = await fetchFragellaCatalogBatch({
      apiKey: options.apiKey,
      search: currentPrefix,
      limit: options.limit,
    });

    await upsertFragrances(batch, options.databaseUrl);

    const isSaturated = batch.length >= options.limit;
    const canExpand = currentPrefix.length < options.maxDepth;
    const expandedPrefixes = isSaturated && canExpand ? DEFAULT_SYNC_CHARS.map((token) => `${currentPrefix}${token}`) : [];
    const nextQueue = expandedPrefixes.length ? [...expandedPrefixes, ...queue] : queue;

    await sql`
      update fragrance_cache_sync_state
      set
        status = ${nextQueue.length > 0 ? "syncing" : "complete"},
        queue = ${nextQueue},
        processed_prefixes = processed_prefixes + 1,
        total_prefixes = total_prefixes + ${expandedPrefixes.length},
        last_prefix = ${currentPrefix},
        latest_batch_count = ${batch.length},
        updated_at = now()
      where id = 1
    `;

    const nextState = await readSyncState(sql);

    return buildSyncProgress(
      nextState ?? {
        ...syncState,
        queue: nextQueue,
        processed_prefixes: syncState.processed_prefixes + 1,
        total_prefixes: syncState.total_prefixes + expandedPrefixes.length,
        last_prefix: currentPrefix,
        latest_batch_count: batch.length,
        status: nextQueue.length > 0 ? "syncing" : "complete",
      },
      nextQueue.length > 0
        ? `Caching catalog prefixes (${(nextState ?? syncState).processed_prefixes}/${(nextState ?? syncState).total_prefixes}).`
        : "Fragella cache sync completed.",
    );
  } catch (error) {
    console.error(error);

    return {
      status: "error",
      processedPrefixes: 0,
      totalPrefixes: 0,
      queueSize: 0,
      latestBatchCount: 0,
      note: "Cache sync step failed.",
    };
  } finally {
    await sql`select pg_advisory_unlock(${FRAGELLA_SYNC_LOCK_KEY})`;
  }
}

export async function searchPostgresFragrances(
  params: FinderParams,
  databaseUrl: string,
): Promise<FragranceSearchResponse> {
  const safeParams = sanitizeFinderParams(params);
  const sql = getClient(databaseUrl);
  const query = safeParams.query?.trim() ?? "";
  const tsQuery = query.length > 0 ? query : null;
  const accords = safeParams.accords ?? [];

  const rows = await sql<FragranceRow[]>`
    select
      id,
      name,
      house,
      kind,
      dupe_for,
      year,
      image_url,
      country,
      price_usd,
      price_band,
      popularity_score,
      rating,
      rating_votes,
      concentration,
      gender,
      top_notes,
      heart_notes,
      base_notes,
      accords,
      moods,
      occasions,
      seasons,
      projection,
      longevity_hours,
      color_a,
      color_b,
      description
    from app_fragrances
    where
      (
        ${tsQuery === null}
        or (search_vector @@ websearch_to_tsquery('english', ${tsQuery}))
        or name ilike ${`%${query}%`}
        or house ilike ${`%${query}%`}
      )
      and (${accords.length === 0} or accords && ${accords})
      and (${safeParams.kind === "dupe" ? "Dupe" : ""} = '' or kind = 'Dupe')
      and (${safeParams.kind === "original" ? "Original" : ""} = '' or kind = 'Original')
      and (${safeParams.budget !== "under-50"} or price_usd < 50)
      and (${safeParams.budget !== "under-100"} or price_usd < 100)
      and (${safeParams.budget !== "under-200"} or price_usd < 200)
      and (${safeParams.budget !== "premium"} or price_usd >= 200)
      and (
        ${!safeParams.gender || safeParams.gender === "all"}
        or gender = 'Unisex'
        or lower(gender) = ${safeParams.gender ?? "all"}
      )
    order by
      case when ${tsQuery !== null} then ts_rank_cd(search_vector, websearch_to_tsquery('english', ${tsQuery})) else 0 end desc,
      popularity_score desc nulls last,
      rating desc nulls last
  `;

  return searchFragranceList(rows.map(mapRow), params, {
    source: "postgres",
    sourceLabel: "PostgreSQL full catalog",
    dataNotice: "Searching the configured PostgreSQL fragrance catalog.",
  });
}
