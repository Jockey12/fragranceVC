import type { Fragrance, FragranceGender, Projection } from "@/data/fragrances";
import { searchFragranceList, type FinderParams, type FragranceSearchResponse } from "@/lib/fragrance-search";

type FragellaNote = {
  name?: string;
  imageUrl?: string;
};

type FragellaFragrance = {
  Name?: string;
  Brand?: string;
  Year?: string;
  rating?: string;
  Country?: string;
  Price?: string;
  "Image URL"?: string;
  Gender?: string;
  Longevity?: string;
  Sillage?: string;
  Popularity?: string;
  OilType?: string;
  "General Notes"?: string[];
  "Main Accords"?: string[];
  "Main Accords Percentage"?: Record<string, string>;
  Notes?: {
    Top?: FragellaNote[];
    Middle?: FragellaNote[];
    Base?: FragellaNote[];
  };
  "Image Fallbacks"?: string[];
  "Purchase URL"?: string;
  "Season Ranking"?: { name?: string; score?: number }[];
  "Occasion Ranking"?: { name?: string; score?: number }[];
};

const popularityScores: Record<string, number> = {
  "very high": 95,
  high: 82,
  medium: 62,
  low: 35,
  "not popular": 12,
};

const longevityHours: Record<string, number> = {
  "very long lasting": 12,
  "long lasting": 9,
  moderate: 6,
  weak: 3,
  poor: 1,
};

const projectionMap: Record<string, Projection> = {
  enormous: "Beast mode",
  strong: "Strong",
  moderate: "Moderate",
  soft: "Skin scent",
  intimate: "Skin scent",
};

function normalize(value = "") {
  return value.toLowerCase().trim();
}

function parsePrice(value = "") {
  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function priceBand(price: number): Fragrance["priceBand"] {
  if (price <= 0 || price < 50) return "$";
  if (price < 150) return "$$";
  if (price < 280) return "$$$";
  return "$$$$";
}

function gender(value = ""): FragranceGender {
  const normalized = normalize(value);
  if (normalized.includes("women") || normalized.includes("female")) return "Feminine";
  if (normalized.includes("men") || normalized.includes("male")) return "Masculine";
  return "Unisex";
}

function noteNames(notes?: FragellaNote[]) {
  return (notes ?? []).map((note) => note.name).filter((note): note is string => Boolean(note));
}

function stableId(brand = "unknown", name = "fragrance") {
  return `${brand}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapFragellaFragrance(item: FragellaFragrance): Fragrance {
  const accords = item["Main Accords"] ?? Object.keys(item["Main Accords Percentage"] ?? {});
  const topNotes = noteNames(item.Notes?.Top);
  const heartNotes = noteNames(item.Notes?.Middle);
  const baseNotes = noteNames(item.Notes?.Base);
  const generalNotes = item["General Notes"] ?? [];
  const price = parsePrice(item.Price);
  const popularity = popularityScores[normalize(item.Popularity)] ?? 50;
  const projection = projectionMap[normalize(item.Sillage)] ?? "Moderate";
  const seasons = (item["Season Ranking"] ?? []).slice(0, 3).map((season) => normalize(season.name));
  const occasions = (item["Occasion Ranking"] ?? []).slice(0, 4).map((occasion) => normalize(occasion.name));

  return {
    id: stableId(item.Brand, item.Name),
    name: item.Name ?? "Unknown fragrance",
    house: item.Brand ?? "Unknown house",
    kind: "Original",
    year: Number(item.Year) || undefined,
    imageUrl: item["Image URL"],
    country: item.Country,
    price,
    priceBand: priceBand(price),
    popularity,
    rating: Number(item.rating) || 0,
    concentration: item.OilType || "Fragrance",
    gender: gender(item.Gender),
    topNotes: topNotes.length ? topNotes : generalNotes.slice(0, 3),
    heartNotes: heartNotes.length ? heartNotes : generalNotes.slice(3, 6),
    baseNotes: baseNotes.length ? baseNotes : generalNotes.slice(6, 9),
    accords: accords.map(normalize).filter(Boolean),
    moods: [...accords, item.Popularity ?? ""].map(normalize).filter(Boolean),
    occasions: occasions.length ? occasions : ["daily"],
    seasons: seasons.length ? seasons : ["all season"],
    projection,
    longevityHours: longevityHours[normalize(item.Longevity)] ?? 6,
    colorA: "#dfe8d8",
    colorB: "#243e39",
    description: [
      item.Brand,
      item.Name,
      accords.length ? `leans ${accords.slice(0, 3).join(", ")}` : "",
      item.Longevity ? `with ${normalize(item.Longevity)} longevity` : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

async function requestFragella(path: string, params: URLSearchParams, apiKey: string) {
  const url = new URL(`https://api.fragella.com/api/v1/${path}`);
  params.forEach((value, key) => url.searchParams.append(key, value));

  const response = await fetch(url, {
    headers: { "x-api-key": apiKey },
    next: { revalidate: 60 * 60 * 12 },
  });

  if (!response.ok) {
    throw new Error(`Fragella request failed with ${response.status}`);
  }

  return response.json() as Promise<FragellaFragrance[]>;
}

export async function fetchFragellaCatalogBatch(options: {
  apiKey: string;
  search?: string;
  limit: number;
}): Promise<Fragrance[]> {
  const requestParams = new URLSearchParams();
  const query = options.search?.trim();

  if (query) requestParams.set("search", query);
  requestParams.set("limit", String(options.limit));

  const payload = await requestFragella("fragrances", requestParams, options.apiKey);

  return payload.map(mapFragellaFragrance);
}

export async function searchFragellaFragrances(
  params: FinderParams,
  apiKey: string,
): Promise<FragranceSearchResponse> {
  const query = params.query?.trim() ?? "";
  const requestParams = new URLSearchParams();
  const matchLimit = 500;
  const focusedSearchLimit = 500;
  const defaultSeedSearch = (process.env.FRAGELLA_DEFAULT_SEARCH ?? "a").trim() || "a";
  let catalog: Fragrance[];

  if (params.accords?.length && query.length < 3) {
    requestParams.set("accords", params.accords.map((accord) => `${accord}:50`).join(","));
    requestParams.set("limit", String(matchLimit));
    const payload = await requestFragella("fragrances/match", requestParams, apiKey);
    catalog = payload.map(mapFragellaFragrance);
  } else {
    const searchTerm = query || params.accords?.[0] || defaultSeedSearch;
    catalog = await fetchFragellaCatalogBatch({
      apiKey,
      search: searchTerm,
      limit: focusedSearchLimit,
    });
  }

  return searchFragranceList(catalog, params, {
    source: "fragella",
    sourceLabel: "Fragella API",
    dataNotice: "Live Fragella results. Add a PostgreSQL import for unrestricted full-catalog browsing.",
  });
}
