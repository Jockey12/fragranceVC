import { NextResponse } from "next/server";

import { searchCatalog } from "@/lib/catalog/search-catalog";
import {
  type FinderBudget,
  type FinderGender,
  type FinderKindFilter,
  type FinderSort,
  sanitizeFinderParams,
} from "@/lib/fragrance-search";

export const runtime = "nodejs";

const sortValues = new Set<FinderSort>([
  "match",
  "price-asc",
  "price-desc",
  "popularity",
  "dupe-first",
  "original-first",
]);

const kindValues = new Set<FinderKindFilter>(["all", "original", "dupe"]);
const budgetValues = new Set<FinderBudget>(["all", "under-50", "under-100", "under-200", "premium"]);
const genderValues = new Set<FinderGender>(["all", "unisex", "feminine", "masculine"]);
const MAX_REQUEST_URL_LENGTH = 2048;

function pickParam<T extends string>(value: string | null, allowed: Set<T>, fallback: T) {
  return value && allowed.has(value as T) ? (value as T) : fallback;
}

export async function GET(request: Request) {
  if (request.url.length > MAX_REQUEST_URL_LENGTH) {
    return NextResponse.json({ error: "Search request is too large." }, { status: 414 });
  }

  const { searchParams } = new URL(request.url);

  const response = await searchCatalog(sanitizeFinderParams({
    query: searchParams.get("query") ?? "",
    accords: searchParams.getAll("accord"),
    mood: searchParams.get("mood") ?? "any",
    occasion: searchParams.get("occasion") ?? "any",
    budget: pickParam(searchParams.get("budget"), budgetValues, "all"),
    gender: pickParam(searchParams.get("gender"), genderValues, "all"),
    kind: pickParam(searchParams.get("kind"), kindValues, "all"),
    sort: pickParam(searchParams.get("sort"), sortValues, "match"),
  }));

  return NextResponse.json(response);
}
