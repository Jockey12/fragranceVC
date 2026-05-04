import { searchFragellaFragrances } from "@/lib/catalog/fragella-provider";
import { searchPostgresFragrances } from "@/lib/catalog/postgres-provider";
import { searchFragrances, type FinderParams, type FragranceSearchResponse } from "@/lib/fragrance-search";

export async function searchCatalog(params: FinderParams): Promise<FragranceSearchResponse> {
  const requestedSource = process.env.FRAGRANCE_DATA_SOURCE;
  const databaseUrl = process.env.DATABASE_URL;
  const fragellaApiKey = process.env.FRAGELLA_API_KEY;

  try {
    if ((requestedSource === "postgres" || (!requestedSource && databaseUrl)) && databaseUrl) {
      return await searchPostgresFragrances(params, databaseUrl);
    }

    if ((requestedSource === "fragella" || (!requestedSource && fragellaApiKey)) && fragellaApiKey) {
      return await searchFragellaFragrances(params, fragellaApiKey);
    }
  } catch (error) {
    console.error(error);
  }

  return searchFragrances(params);
}
