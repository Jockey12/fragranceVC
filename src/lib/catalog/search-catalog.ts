import { searchFragellaFragrances } from "@/lib/catalog/fragella-provider";
import { countPostgresFragrances, searchPostgresFragrances, upsertFragrances } from "@/lib/catalog/postgres-provider";
import { searchFragrances, type FinderParams, type FragranceSearchResponse } from "@/lib/fragrance-search";

export async function searchCatalog(params: FinderParams): Promise<FragranceSearchResponse> {
  const requestedSource = process.env.FRAGRANCE_DATA_SOURCE;
  const databaseUrl = process.env.DATABASE_URL;
  const fragellaApiKey = process.env.FRAGELLA_API_KEY;
  const staticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

  if (staticExport) {
    return searchFragrances(params);
  }

  try {
    if ((requestedSource === "postgres" || (!requestedSource && databaseUrl)) && databaseUrl) {
      const postgresResults = await searchPostgresFragrances(params, databaseUrl);

      if (postgresResults.results.length || !fragellaApiKey) {
        return postgresResults;
      }
    }

    if ((requestedSource === "fragella" || (!requestedSource && fragellaApiKey)) && fragellaApiKey) {
      const fragellaResults = await searchFragellaFragrances(params, fragellaApiKey);

      if (databaseUrl) {
        await upsertFragrances(fragellaResults.results, databaseUrl);
        const databaseSize = await countPostgresFragrances(databaseUrl);

        return {
          ...fragellaResults,
          databaseSize,
          sourceLabel: "Fragella API + Postgres cache",
          dataNotice: "Live Fragella API results were saved into the configured PostgreSQL fragrance database.",
        };
      }

      return fragellaResults;
    }
  } catch (error) {
    console.error(error);
  }

  return searchFragrances(params);
}
