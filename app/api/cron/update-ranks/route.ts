import { createServiceClient } from "@/lib/supabase/server";
import {
  checkKeywordsBatch,
  chunkArray,
  fetchSearchVolumes,
  saveRankings,
  type SerpTask,
} from "@/lib/dataforseo";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  const { data: keywords, error } = await supabase
    .from("keywords")
    .select("*, projects(domain, user_id)")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!keywords || keywords.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const tasks: SerpTask[] = keywords.map((k) => ({
    keyword: k.keyword,
    location_code: k.location_code,
    language_code: k.language_code,
    keyword_id: k.id,
    project_id: k.project_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    domain: (k as any).projects.domain as string,
  }));

  const batches = chunkArray(tasks, 100);
  let totalResults = 0;

  for (const batch of batches) {
    try {
      const [results, volumes] = await Promise.all([
        checkKeywordsBatch(batch),
        fetchSearchVolumes(
          batch.map((t) => t.keyword),
          batch[0]?.location_code ?? 2840,
          batch[0]?.language_code ?? "en"
        ),
      ]);

      for (const result of results) {
        const task = batch.find((t) => t.keyword_id === result.keyword_id);
        if (task) {
          result.search_volume = volumes.get(task.keyword) ?? null;
        }
      }

      await saveRankings(results);
      totalResults += results.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: `DataForSEO error: ${message}` },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ updated: totalResults });
}
