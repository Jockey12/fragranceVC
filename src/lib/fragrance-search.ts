import { fragrances, type Fragrance, type FragranceGender, type FragranceKind } from "@/data/fragrances";

export type FinderSort =
  | "match"
  | "price-asc"
  | "price-desc"
  | "popularity"
  | "dupe-first"
  | "original-first";

export type FinderKindFilter = "all" | "original" | "dupe";
export type FinderBudget = "all" | "under-50" | "under-100" | "under-200" | "premium";
export type FinderGender = "all" | "unisex" | "feminine" | "masculine";

export type FinderParams = {
  query?: string;
  accords?: string[];
  mood?: string;
  occasion?: string;
  budget?: FinderBudget;
  gender?: FinderGender;
  kind?: FinderKindFilter;
  sort?: FinderSort;
};

export type FragranceResult = Fragrance & {
  matchScore: number;
  matchedOn: string[];
};

export type CatalogSyncStatus = "syncing" | "complete" | "disabled" | "error";

export type CatalogSyncProgress = {
  status: CatalogSyncStatus;
  processedPrefixes: number;
  totalPrefixes: number;
  queueSize: number;
  latestBatchCount: number;
  lastPrefix?: string;
  note?: string;
};

export type FragranceSearchResponse = {
  results: FragranceResult[];
  total: number;
  databaseSize: number;
  source: "local" | "postgres" | "fragella";
  sourceLabel: string;
  dataNotice?: string;
  sync?: CatalogSyncProgress;
};

const tokenAliases: Record<string, string[]> = {
  expensive: ["luxury", "polished", "quiet luxury", "signature"],
  rich: ["luxury", "amber", "boozy", "vanilla"],
  "old money": ["luxury", "polished", "woody", "clean"],
  sexy: ["seductive", "date night", "evening"],
  hot: ["seductive", "sweet", "spicy"],
  masculine: ["masculine", "woody", "spicy", "blue"],
  feminine: ["feminine", "floral", "rose", "sweet"],
  beach: ["aquatic", "salty", "vacation", "fresh"],
  summer: ["fresh", "citrus", "aquatic", "vacation"],
  winter: ["amber", "vanilla", "spicy", "cozy"],
  gym: ["clean", "fresh", "shower fresh", "skin"],
  office: ["professional", "clean", "polished", "daily"],
  club: ["party", "night out", "loud", "sweet"],
  date: ["date night", "seductive", "romantic"],
  laundry: ["clean", "musk", "fresh laundry", "soapy"],
  soap: ["clean", "soapy", "powdery"],
  dessert: ["gourmand", "vanilla", "sweet"],
  smoky: ["smoky", "leather", "tobacco"],
};

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getSearchText(fragrance: Fragrance) {
  return [
    fragrance.name,
    fragrance.house,
    fragrance.kind,
    fragrance.dupeFor ?? "",
    fragrance.concentration,
    fragrance.gender,
    fragrance.description,
    ...fragrance.topNotes,
    ...fragrance.heartNotes,
    ...fragrance.baseNotes,
    ...fragrance.accords,
    ...fragrance.moods,
    ...fragrance.occasions,
    ...fragrance.seasons,
  ]
    .map(normalize)
    .join(" ");
}

function getQueryTerms(query = "") {
  const rawTerms = normalize(query)
    .split(/[\s,./|]+/)
    .map((term) => term.replace(/[^a-z0-9'-]/g, ""))
    .filter((term) => term.length > 1);

  const expanded = rawTerms.flatMap((term) => [term, ...(tokenAliases[term] ?? [])]);
  const phraseAliases = Object.entries(tokenAliases)
    .filter(([phrase]) => phrase.includes(" ") && normalize(query).includes(phrase))
    .flatMap(([, aliases]) => aliases);

  return unique([...expanded, ...phraseAliases].map(normalize));
}

function matchesBudget(fragrance: Fragrance, budget: FinderBudget) {
  if (budget === "all") return true;
  if (budget === "under-50") return fragrance.price < 50;
  if (budget === "under-100") return fragrance.price < 100;
  if (budget === "under-200") return fragrance.price < 200;
  return fragrance.price >= 200;
}

function matchesKind(fragrance: Fragrance, kind: FinderKindFilter) {
  if (kind === "all") return true;
  return fragrance.kind.toLowerCase() === kind;
}

function matchesGender(fragrance: Fragrance, gender: FinderGender) {
  if (gender === "all") return true;
  const target = gender.charAt(0).toUpperCase() + gender.slice(1);
  return fragrance.gender === "Unisex" || fragrance.gender === (target as FragranceGender);
}

function scoreFragrance(fragrance: Fragrance, params: Required<FinderParams>): FragranceResult {
  const text = getSearchText(fragrance);
  const matchedOn: string[] = [];
  let score = 0;

  for (const term of getQueryTerms(params.query)) {
    if (text.includes(term)) {
      score += 9;
      matchedOn.push(term);
    }
  }

  for (const accord of params.accords.map(normalize)) {
    if (fragrance.accords.map(normalize).includes(accord)) {
      score += 18;
      matchedOn.push(accord);
    } else if (text.includes(accord)) {
      score += 8;
      matchedOn.push(accord);
    }
  }

  const mood = normalize(params.mood);
  if (mood && mood !== "any") {
    if (fragrance.moods.map(normalize).includes(mood)) {
      score += 18;
      matchedOn.push(mood);
    } else if (text.includes(mood)) {
      score += 8;
      matchedOn.push(mood);
    }
  }

  const occasion = normalize(params.occasion);
  if (occasion && occasion !== "any") {
    if (fragrance.occasions.map(normalize).includes(occasion)) {
      score += 16;
      matchedOn.push(occasion);
    } else if (text.includes(occasion)) {
      score += 7;
      matchedOn.push(occasion);
    }
  }

  score += fragrance.popularity / 8;
  score += fragrance.rating * 2;

  if (params.kind === "dupe" && fragrance.kind === "Dupe") score += 8;
  if (params.kind === "original" && fragrance.kind === "Original") score += 8;
  if (params.budget.startsWith("under") && fragrance.kind === "Dupe") score += 3;

  return {
    ...fragrance,
    matchScore: Math.min(99, Math.round(score)),
    matchedOn: unique(matchedOn).slice(0, 6),
  };
}

function sortResults(results: FragranceResult[], sort: FinderSort) {
  return [...results].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price || b.matchScore - a.matchScore;
    if (sort === "price-desc") return b.price - a.price || b.matchScore - a.matchScore;
    if (sort === "popularity") return b.popularity - a.popularity || b.matchScore - a.matchScore;
    if (sort === "dupe-first") {
      return kindRank(a.kind, "Dupe") - kindRank(b.kind, "Dupe") || b.matchScore - a.matchScore;
    }
    if (sort === "original-first") {
      return kindRank(a.kind, "Original") - kindRank(b.kind, "Original") || b.matchScore - a.matchScore;
    }

    return b.matchScore - a.matchScore || b.popularity - a.popularity;
  });
}

function kindRank(kind: FragranceKind, preferred: FragranceKind) {
  return kind === preferred ? 0 : 1;
}

export function searchFragranceList(
  catalog: Fragrance[],
  params: FinderParams = {},
  metadata: Pick<FragranceSearchResponse, "source" | "sourceLabel" | "dataNotice"> = {
    source: "local",
    sourceLabel: "Local starter catalog",
    dataNotice: "Connect Fragella or import FragDB into PostgreSQL for a full perfume catalog.",
  },
): FragranceSearchResponse {
  const fullParams: Required<FinderParams> = {
    query: params.query ?? "",
    accords: params.accords ?? [],
    mood: params.mood ?? "any",
    occasion: params.occasion ?? "any",
    budget: params.budget ?? "all",
    gender: params.gender ?? "all",
    kind: params.kind ?? "all",
    sort: params.sort ?? "match",
  };

  const hasIntent =
    fullParams.query.trim().length > 0 ||
    fullParams.accords.length > 0 ||
    fullParams.mood !== "any" ||
    fullParams.occasion !== "any";

  const results = catalog
    .filter((fragrance) => matchesBudget(fragrance, fullParams.budget))
    .filter((fragrance) => matchesKind(fragrance, fullParams.kind))
    .filter((fragrance) => matchesGender(fragrance, fullParams.gender))
    .map((fragrance) => scoreFragrance(fragrance, fullParams))
    .filter((fragrance) => !hasIntent || fragrance.matchScore >= 18);

  const sortedResults = sortResults(results, fullParams.sort);

  return {
    results: sortedResults,
    total: sortedResults.length,
    databaseSize: catalog.length,
    ...metadata,
  };
}

export function searchFragrances(params: FinderParams = {}): FragranceSearchResponse {
  return searchFragranceList(fragrances, params);
}
