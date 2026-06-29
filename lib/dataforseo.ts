import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/db-types";

export interface SerpTask {
  keyword: string;
  location_code: number;
  language_code: string;
  keyword_id: string;
  project_id: string;
  domain: string;
}

export interface SerpResult {
  keyword_id: string;
  project_id: string;
  rank_absolute: number | null;
  url: string | null;
  search_volume: number | null;
  serp_snapshot: SerpSnapshotItem[];
}

export interface SerpSnapshotItem {
  type: string;
  rank_absolute: number;
  url: string | null;
  title: string | null;
  description: string | null;
  domain: string | null;
}

export interface ResearchKeyword {
  keyword: string;
  location_code: number;
  language_code: string;
  search_volume: number | null;
  cpc: number | null;
  competition: number | null;
}

function getAuthHeaders() {
  const credentials = Buffer.from(
    `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
  ).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
  };
}

export async function checkKeywordsBatch(
  tasks: SerpTask[]
): Promise<SerpResult[]> {
  if (tasks.length === 0) return [];

  const payload = tasks.map((task) => ({
    keyword: task.keyword,
    location_code: task.location_code,
    language_code: task.language_code,
    device: "desktop",
    os: "windows",
    depth: 100,
  }));

  const response = await fetch(
    "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      next: { revalidate: 0 },
    }
  );

  if (!response.ok) {
    throw new Error(
      `DataForSEO SERP API error: ${response.status} ${response.statusText}`
    );
  }

  const raw = await response.json();
  console.log("DataForSEO SERP raw response:", JSON.stringify(raw).slice(0, 2000));
  const data = raw as {
    status_code?: number;
    status_message?: string;
    tasks: Array<{
      data: Array<{
        keyword: string;
        location_code: number;
        language_code: string;
      }>;
      result: Array<{
        keyword: string;
        type: string;
        items: Array<{
          type: string;
          rank_absolute: number;
          url?: string;
          domain?: string;
          title?: string;
          description?: string;
        }>;
        se_results_count: number;
      } | null>;
      status_code: number;
      status_message: string;
    } | null>;
  };

  if (!Array.isArray(data.tasks) || data.tasks.length === 0) {
    throw new Error(
      `DataForSEO returned no tasks. status_code=${raw?.status_code ?? "n/a"}, status_message=${raw?.status_message ?? "n/a"}`
    );
  }

  const results: SerpResult[] = [];

  for (const task of data.tasks) {
    if (!task) continue;
    if (task.status_code !== 20000) {
      throw new Error(
        `DataForSEO task failed: status_code=${task.status_code}, message=${task.status_message}`
      );
    }
    const taskData = task.data[0];

    const matchingTask = tasks.find(
      (t) =>
        t.keyword === taskData?.keyword &&
        t.location_code === taskData?.location_code &&
        t.language_code === taskData?.language_code
    );

    if (!matchingTask) continue;

    let rank_absolute: number | null = null;
    let url: string | null = null;
    const snapshot: SerpSnapshotItem[] = [];

    for (const taskResult of task.result ?? []) {
      if (!taskResult || !taskResult.items) continue;
      for (const item of taskResult.items) {
        const itemUrl = item.url ?? (item.domain ? `https://${item.domain}/` : null);
        const itemDomain = item.domain ?? (itemUrl ? extractDomain(itemUrl) : null);

        if (itemUrl && urlMatchesDomain(itemUrl, matchingTask.domain)) {
          rank_absolute = item.rank_absolute;
          url = itemUrl;
        }

        if (snapshot.length < 10 && (item.type === "organic" || item.type === "local_pack")) {
          snapshot.push({
            type: item.type,
            rank_absolute: item.rank_absolute,
            url: itemUrl ?? null,
            title: item.title ?? null,
            description: item.description ?? null,
            domain: itemDomain,
          });
        }
      }
    }

    snapshot.sort((a, b) => a.rank_absolute - b.rank_absolute);

    results.push({
      keyword_id: matchingTask.keyword_id,
      project_id: matchingTask.project_id,
      rank_absolute,
      url,
      search_volume: null,
      serp_snapshot: snapshot,
    });
  }

  return results;
}

export function urlMatchesDomain(url: string, domain: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const targetDomain = domain.toLowerCase().replace(/^www\./, "");
    return hostname === targetDomain || hostname.endsWith(`.${targetDomain}`);
  } catch {
    return false;
  }
}

export function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function fetchKeywordResearch(
  keyword: string,
  locationCode: number,
  languageCode: string
): Promise<ResearchKeyword[]> {
  const response = await fetch(
    "https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live",
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify([
        {
          keyword,
          location_code: locationCode,
          language_code: languageCode,
          depth: 100,
          limit: 50,
        },
      ]),
      next: { revalidate: 0 },
    }
  );

  if (!response.ok) {
    throw new Error(
      `DataForSEO Labs API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as {
    tasks: Array<{
      result: Array<
        | Array<{
            keyword: string;
            location_code: number;
            language_code: string;
            se_results_count: number;
            items: Array<{
              keyword_data: {
                keyword: string;
                keyword_info: {
                  search_volume: number | null;
                  cpc: number | null;
                  competition: number | null;
                };
              };
            }>;
          }>
        | null
        | undefined
      >;
    }>;
  };

  const suggestions: ResearchKeyword[] = [];

  for (const task of data.tasks) {
    const result = task.result?.[0];
    if (!result || !Array.isArray(result)) continue;
    for (const item of result) {
      if (!item || !item.items) continue;
      for (const keywordItem of item.items) {
        const info = keywordItem.keyword_data?.keyword_info;
        if (!info) continue;
        suggestions.push({
          keyword: keywordItem.keyword_data.keyword,
          location_code: locationCode,
          language_code: languageCode,
          search_volume: info.search_volume ?? null,
          cpc: info.cpc ?? null,
          competition: info.competition ?? null,
        });
      }
    }
  }

  return suggestions;
}

export async function saveRankings(results: SerpResult[]) {
  const supabase = await createServiceClient();

  const rows = results.map((result) => ({
    keyword_id: result.keyword_id,
    rank_absolute: result.rank_absolute,
    url: result.url,
    search_volume: result.search_volume,
    checked_at: new Date().toISOString(),
    serp_snapshot: result.serp_snapshot as unknown as Json,
  }));

  console.log("saveRankings inserting rows:", rows.length, JSON.stringify(rows[0]));
  const { error } = await supabase.from("rankings").insert(rows);

  if (error) {
    console.error("saveRankings insert error:", error);
    throw new Error(`Failed to save rankings: ${error.message}`);
  }
  console.log("saveRankings insert succeeded");
}

export async function fetchSearchVolumes(
  keywords: string[],
  locationCode: number,
  languageCode: string
): Promise<Map<string, number | null>> {
  if (keywords.length === 0) return new Map();

  const response = await fetch(
    "https://api.dataforseo.com/v3/keywords_data/google/search_volume/live",
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify([
        {
          keywords,
          location_code: locationCode,
          language_code: languageCode,
        },
      ]),
      next: { revalidate: 0 },
    }
  );

  if (!response.ok) {
    throw new Error(
      `DataForSEO Search Volume API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as {
    tasks: Array<{
      result: Array<{
        keyword: string;
        search_volume: number | null;
      } | null>;
    }>;
  };

  const volumes = new Map<string, number | null>();

  for (const task of data.tasks) {
    for (const item of task.result ?? []) {
      if (!item) continue;
      volumes.set(item.keyword, item.search_volume ?? null);
    }
  }

  return volumes;
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
