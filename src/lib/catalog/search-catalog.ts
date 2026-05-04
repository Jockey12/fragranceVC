import { searchFragellaFragrances } from "@/lib/catalog/fragella-provider";
import {
  countPostgresFragrances,
  getFragellaCacheSyncProgress,
  runFragellaCacheSyncStep,
  searchPostgresFragrances,
  upsertFragrances,
} from "@/lib/catalog/postgres-provider";
import { searchFragrances, type CatalogSyncProgress, type FinderParams, type FragranceSearchResponse } from "@/lib/fragrance-search";

function localFallback(params: FinderParams, message?: string): FragranceSearchResponse {
  const localResults = searchFragrances(params);

  return {
    ...localResults,
    sourceLabel: "Local starter catalog (fallback)",
    dataNotice: message ?? localResults.dataNotice,
  };
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function syncNotice(sync?: CatalogSyncProgress) {
  if (!sync) return undefined;
  if (sync.status === "syncing") {
    return `Cache syncing in progress: ${sync.processedPrefixes}/${sync.totalPrefixes} prefixes scanned${
      sync.lastPrefix ? ` (last: "${sync.lastPrefix}")` : ""
    }.`;
  }
  if (sync.status === "complete") {
    return "Cache sync is complete. Results are served from the full PostgreSQL cache.";
  }
  if (sync.status === "disabled") {
    return sync.note;
  }
  if (sync.status === "error") {
    return sync.note ?? "Cache sync encountered an error.";
  }
  return undefined;
}

export async function searchCatalog(params: FinderParams): Promise<FragranceSearchResponse> {
  const requestedSource = process.env.FRAGRANCE_DATA_SOURCE;
  const databaseUrl = process.env.DATABASE_URL;
  const fragellaApiKey = process.env.FRAGELLA_API_KEY;
  const staticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";
  const syncLimit = parsePositiveInt(process.env.FRAGELLA_SYNC_BATCH_LIMIT, 500);
  const syncMaxDepth = parsePositiveInt(process.env.FRAGELLA_SYNC_MAX_DEPTH, 3);

  if (staticExport) {
    return localFallback(params, "Static export mode is enabled, so live API/database search is unavailable.");
  }

  if (requestedSource === "postgres" && !databaseUrl) {
    return localFallback(params, "FRAGRANCE_DATA_SOURCE is set to postgres, but DATABASE_URL is missing.");
  }

  if (requestedSource === "fragella" && !fragellaApiKey) {
    return localFallback(params, "FRAGRANCE_DATA_SOURCE is set to fragella, but FRAGELLA_API_KEY is missing.");
  }

  try {
    if (databaseUrl) {
      const syncProgress = fragellaApiKey
        ? await runFragellaCacheSyncStep({
            databaseUrl,
            apiKey: fragellaApiKey,
            limit: syncLimit,
            maxDepth: syncMaxDepth,
          })
        : await getFragellaCacheSyncProgress(
            databaseUrl,
            "FRAGELLA_API_KEY is missing, so cache sync is paused. Existing cache results are still searchable.",
          );

      const [postgresResults, databaseSize] = await Promise.all([
        searchPostgresFragrances(params, databaseUrl),
        countPostgresFragrances(databaseUrl),
      ]);

      if (postgresResults.results.length || !fragellaApiKey) {
        return {
          ...postgresResults,
          databaseSize,
          sourceLabel: "PostgreSQL cache + Fragella sync",
          dataNotice: syncNotice(syncProgress) ?? postgresResults.dataNotice,
          sync: syncProgress,
        };
      }

      const fragellaResults = await searchFragellaFragrances(params, fragellaApiKey);
      await upsertFragrances(fragellaResults.results, databaseUrl);
      const warmedDatabaseSize = await countPostgresFragrances(databaseUrl);

      return {
        ...fragellaResults,
        databaseSize: warmedDatabaseSize,
        sourceLabel: "Fragella API + warming Postgres cache",
        dataNotice:
          syncNotice(syncProgress) ??
          "Cache is warming up. Showing live Fragella results and saving them into PostgreSQL.",
        sync: syncProgress,
      };
    }

    if ((requestedSource === "fragella" || (!requestedSource && fragellaApiKey)) && fragellaApiKey) {
      const fragellaResults = await searchFragellaFragrances(params, fragellaApiKey);

      return fragellaResults;
    }
  } catch (error) {
    console.error(error);

    return localFallback(params, "Live catalog lookup failed, so the local starter catalog is being used.");
  }

  return searchFragrances(params);
}
