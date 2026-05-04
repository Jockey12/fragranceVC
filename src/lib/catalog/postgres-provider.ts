import postgres from "postgres";

import type { Fragrance } from "@/data/fragrances";
import { searchFragranceList, type FinderParams, type FragranceSearchResponse } from "@/lib/fragrance-search";

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

let client: ReturnType<typeof postgres> | null = null;

function getClient(databaseUrl: string) {
  client ??= postgres(databaseUrl, {
    max: 5,
    prepare: false,
  });

  return client;
}

function priceBand(price: number): Fragrance["priceBand"] {
  if (price < 50) return "$";
  if (price < 150) return "$$";
  if (price < 280) return "$$$";
  return "$$$$";
}

function mapRow(row: FragranceRow): Fragrance {
  const price = Number(row.price_usd ?? 0);

  return {
    id: row.id,
    name: row.name,
    house: row.house,
    kind: row.kind ?? "Original",
    dupeFor: row.dupe_for ?? undefined,
    year: row.year ?? undefined,
    imageUrl: row.image_url ?? undefined,
    country: row.country ?? undefined,
    votes: row.rating_votes ?? undefined,
    price,
    priceBand: row.price_band ?? priceBand(price),
    popularity: Number(row.popularity_score ?? 50),
    rating: Number(row.rating ?? 0),
    concentration: row.concentration ?? "Fragrance",
    gender: row.gender ?? "Unisex",
    topNotes: row.top_notes ?? [],
    heartNotes: row.heart_notes ?? [],
    baseNotes: row.base_notes ?? [],
    accords: row.accords ?? [],
    moods: row.moods ?? [],
    occasions: row.occasions ?? [],
    seasons: row.seasons ?? [],
    projection: row.projection ?? "Moderate",
    longevityHours: Number(row.longevity_hours ?? 6),
    colorA: row.color_a ?? "#dfe8d8",
    colorB: row.color_b ?? "#243e39",
    description: row.description ?? `${row.name} by ${row.house}.`,
  };
}

export async function searchPostgresFragrances(
  params: FinderParams,
  databaseUrl: string,
): Promise<FragranceSearchResponse> {
  const sql = getClient(databaseUrl);
  const query = params.query?.trim() ?? "";
  const accords = params.accords ?? [];
  const limit = 60;

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
      (${query.length === 0} or search_vector @@ websearch_to_tsquery('english', ${query}) or name ilike ${`%${query}%`} or house ilike ${`%${query}%`})
      and (${accords.length === 0} or accords && ${accords})
      and (${params.kind === "dupe" ? "Dupe" : ""} = '' or kind = 'Dupe')
      and (${params.kind === "original" ? "Original" : ""} = '' or kind = 'Original')
      and (${params.budget !== "under-50"} or price_usd < 50)
      and (${params.budget !== "under-100"} or price_usd < 100)
      and (${params.budget !== "under-200"} or price_usd < 200)
      and (${params.budget !== "premium"} or price_usd >= 200)
      and (
        ${!params.gender || params.gender === "all"}
        or gender = 'Unisex'
        or lower(gender) = ${params.gender ?? "all"}
      )
    order by
      case when ${query.length > 0} then ts_rank_cd(search_vector, websearch_to_tsquery('english', ${query})) else 0 end desc,
      popularity_score desc nulls last,
      rating desc nulls last
    limit ${limit}
  `;

  return searchFragranceList(rows.map(mapRow), params, {
    source: "postgres",
    sourceLabel: "PostgreSQL full catalog",
    dataNotice: "Searching the configured PostgreSQL fragrance catalog.",
  });
}
