import { createServiceClient } from "@/lib/supabase/server";

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

  const data = (await response.json()) as {
    tasks: Array<{
      data: Array<{
        keyword: string;
        location_code: number;
        language_code: string;
      }>;
      result: Array<
        | Array<{
            keyword: string;
            items: Array<{
              type: string;
              rank_absolute: number;
              url: string;
            }>;
            se_results_count: number;
          }>
        | null
        | undefined
      >;
      status_code: number;
      status_message: string;
    }>;
  };

  const results: SerpResult[] = [];

  for (const task of data.tasks) {
    const taskData = task.data[0];
    const taskResult = task.result?.[0];

    const matchingTask = tasks.find(
      (t) =>
        t.keyword === taskData?.keyword &&
        t.location_code === taskData?.location_code &&
        t.language_code === taskData?.language_code
    );

    if (!matchingTask) continue;

    let rank_absolute: number | null = null;
    let url: string | null = null;

    if (taskResult && Array.isArray(taskResult)) {
      for (const result of taskResult) {
        if (!result || !result.items) continue;
        for (const item of result.items) {
          if (
            item.type === "organic" &&
            item.url &&
            urlMatchesDomain(item.url, matchingTask.domain)
          ) {
            rank_absolute = item.rank_absolute;
            url = item.url;
            break;
          }
        }
        if (rank_absolute) break;
      }
    }

    results.push({
      keyword_id: matchingTask.keyword_id,
      project_id: matchingTask.project_id,
      rank_absolute,
      url,
      search_volume: null,
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
  }));

  const { error } = await supabase.from("rankings").insert(rows);

  if (error) {
    throw new Error(`Failed to save rankings: ${error.message}`);
  }
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
