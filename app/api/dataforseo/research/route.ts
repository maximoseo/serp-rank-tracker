import { createClient } from "@/lib/supabase/server";
import { fetchKeywordResearch } from "@/lib/dataforseo";
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
    keyword?: string;
  };

  if (!body.projectId || !body.keyword) {
    return NextResponse.json(
      { error: "Project ID and keyword are required" },
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

  try {
    const suggestions = await fetchKeywordResearch(
      body.keyword.trim(),
      2840,
      "en"
    );
    return NextResponse.json({ suggestions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `DataForSEO error: ${message}` },
      { status: 502 }
    );
  }
}
