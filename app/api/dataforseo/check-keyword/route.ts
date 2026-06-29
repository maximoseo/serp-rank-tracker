import { createClient } from "@/lib/supabase/server";
import {
  checkKeywordsBatch,
  fetchSearchVolumes,
  saveRankings,
  type SerpTask,
} from "@/lib/dataforseo";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    projectId?: string;
    keywords?: Array<{
      keyword: string;
      location_code?: number;
      language_code?: string;
    }>;
  };

  if (!body.projectId || !body.keywords || body.keywords.length === 0) {
    return NextResponse.json(
      { error: "Project ID and keywords are required" },
      { status: 400 }
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", body.projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }

  const keywordRows = body.keywords.map((k) => ({
    project_id: project.id,
    keyword: k.keyword.trim(),
    location_code: k.location_code ?? 2840,
    language_code: k.language_code ?? "en",
  }));

  const { data: insertedKeywords, error: insertError } = await supabase
    .from("keywords")
    .insert(keywordRows)
    .select();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  const tasks: SerpTask[] = (insertedKeywords ?? []).map((k) => ({
    keyword: k.keyword,
    location_code: k.location_code,
    language_code: k.language_code,
    keyword_id: k.id,
    project_id: project.id,
    domain: project.domain,
  }));

  try {
    const [results, volumes] = await Promise.all([
      checkKeywordsBatch(tasks),
      fetchSearchVolumes(
        tasks.map((t) => t.keyword),
        tasks[0]?.location_code ?? 2840,
        tasks[0]?.language_code ?? "en"
      ),
    ]);

    for (const result of results) {
      const task = tasks.find((t) => t.keyword_id === result.keyword_id);
      if (task) {
        result.search_volume = volumes.get(task.keyword) ?? null;
      }
    }

    await saveRankings(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `DataForSEO error: ${message}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, count: tasks.length });
}
