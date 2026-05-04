import { searchFragellaFragrances } from "@/lib/catalog/fragella-provider";
import {
  countPostgresFragrances,
  getFragellaCacheSyncProgress,
  isPostgresCatalogReady,
  runFragellaCacheSyncStep,
  searchPostgresFragrances,
  upsertFragrances,
} from "@/lib/catalog/postgres-provider";
import {
  sanitizeFinderParams,
  searchFragrances,
  type CatalogSyncProgress,
  type FinderParams,
  type FragranceSearchResponse,
} from "@/lib/fragrance-search";

function localFallback(params: FinderParams, message?: string): FragranceSearchResponse {
  const localResults = searchFragrances(params);

  return {
    ...localResults,
    sourceLabel: "Local starter catalog (fallback)",
    dataNotice: message ?? localResults.dataNotice,
  };
}

function parsePositiveInt(value: string | undefined, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;

  return Math.min(parsed, max);
}

function hasSearchIntent(params: FinderParams) {
  return Boolean(
    params.query?.trim() ||
      (params.accords?.length ?? 0) > 0 ||
      (params.mood && params.mood !== "any") ||
      (params.occasion && params.occasion !== "any"),
  );
}

function describeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes(" 429") || message.includes("429")) {
    return "Fragella API rate limit reached. Upgrade plan or reduce sync request frequency.";
  }
  if (message.includes(" 401") || message.includes("401")) {
    return "Fragella API key is invalid or unauthorized.";
  }
  return message;
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
  const safeParams = sanitizeFinderParams(params);
  const requestedSource = process.env.FRAGRANCE_DATA_SOURCE;
  const databaseUrl = process.env.DATABASE_URL;
  const fragellaApiKey = process.env.FRAGELLA_API_KEY;
  const staticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";
  const syncLimit = parsePositiveInt(process.env.FRAGELLA_SYNC_BATCH_LIMIT, 500, 500);
  const syncMaxDepth = parsePositiveInt(process.env.FRAGELLA_SYNC_MAX_DEPTH, 3, 4);
  const syncMinIntervalSeconds = parsePositiveInt(process.env.FRAGELLA_SYNC_MIN_INTERVAL_SECONDS, 30, 3600);
  const shouldRunSyncStep = !hasSearchIntent(safeParams);

  if (staticExport) {
    return localFallback(safeParams, "Static export mode is enabled, so live API/database search is unavailable.");
  }

  if (requestedSource === "postgres" && !databaseUrl) {
    return localFallback(safeParams, "FRAGRANCE_DATA_SOURCE is set to postgres, but DATABASE_URL is missing.");
  }

  if (requestedSource === "fragella" && !fragellaApiKey) {
    return localFallback(safeParams, "FRAGRANCE_DATA_SOURCE is set to fragella, but FRAGELLA_API_KEY is missing.");
  }

  try {
    if (databaseUrl) {
      const catalogReady = await isPostgresCatalogReady(databaseUrl);
      if (!catalogReady) {
        if (!fragellaApiKey) {
          return localFallback(
            safeParams,
            "PostgreSQL catalog tables are missing and FRAGELLA_API_KEY is unavailable. Run database/schema.sql in Neon.",
          );
        }

        const fragellaResults = await searchFragellaFragrances(safeParams, fragellaApiKey);

        return {
          ...fragellaResults,
          sourceLabel: "Fragella API (database setup pending)",
          dataNotice: "Run database/schema.sql in Neon to enable PostgreSQL cache and sync storage.",
          sync: {
            status: "disabled",
            processedPrefixes: 0,
            totalPrefixes: 0,
            queueSize: 0,
            latestBatchCount: fragellaResults.results.length,
            note: "Database schema missing.",
          },
        };
      }

      const syncProgress = fragellaApiKey
        ? shouldRunSyncStep
          ? await runFragellaCacheSyncStep({
              databaseUrl,
              apiKey: fragellaApiKey,
              limit: syncLimit,
              maxDepth: syncMaxDepth,
              minIntervalSeconds: syncMinIntervalSeconds,
            })
          : await getFragellaCacheSyncProgress(
              databaseUrl,
              "Sync runs during broad browsing. Refine filters without triggering extra sync requests.",
            )
        : await getFragellaCacheSyncProgress(
            databaseUrl,
            "FRAGELLA_API_KEY is missing, so cache sync is paused. Existing cache results are still searchable.",
          );

      const [postgresResults, databaseSize] = await Promise.all([
        searchPostgresFragrances(safeParams, databaseUrl),
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

      const fragellaResults = await searchFragellaFragrances(safeParams, fragellaApiKey);
      let warmedDatabaseSize = databaseSize;
      let cacheWriteNotice: string | undefined;
      try {
        await upsertFragrances(fragellaResults.results, databaseUrl);
        warmedDatabaseSize = await countPostgresFragrances(databaseUrl);
      } catch (error) {
        console.error(error);
        cacheWriteNotice = `Live results loaded, but cache write failed (${describeError(error)}).`;
      }

      return {
        ...fragellaResults,
        databaseSize: warmedDatabaseSize,
        sourceLabel: "Fragella API + warming Postgres cache",
        dataNotice:
          cacheWriteNotice ??
          syncNotice(syncProgress) ??
          "Cache is warming up. Showing live Fragella results and saving them into PostgreSQL.",
        sync: syncProgress,
      };
    }

    if ((requestedSource === "fragella" || (!requestedSource && fragellaApiKey)) && fragellaApiKey) {
      const fragellaResults = await searchFragellaFragrances(safeParams, fragellaApiKey);

      return fragellaResults;
    }
  } catch (error) {
    console.error(error);
    const rootError = describeError(error);

    if (fragellaApiKey) {
      try {
        const fragellaResults = await searchFragellaFragrances(safeParams, fragellaApiKey);

        return {
          ...fragellaResults,
          sourceLabel: "Fragella API (Postgres unavailable)",
          dataNotice: `PostgreSQL query failed (${rootError}); serving live Fragella results.`,
          sync: {
            status: "error",
            processedPrefixes: 0,
            totalPrefixes: 0,
            queueSize: 0,
            latestBatchCount: fragellaResults.results.length,
            note: "PostgreSQL is unavailable or not initialized.",
          },
        };
      } catch (fragellaError) {
        console.error(fragellaError);
        return localFallback(safeParams, describeError(fragellaError));
      }
    }

    return localFallback(safeParams, `Live catalog lookup failed (${rootError}), so the local starter catalog is being used.`);
  }

  return searchFragrances(safeParams);
}
