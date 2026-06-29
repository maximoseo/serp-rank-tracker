import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, TrendingUp, Search, ArrowLeft, Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { AddKeywordModal } from "@/components/add-keyword-modal";
import { KeywordTable } from "@/components/keyword-table";
import { VisibilityChart } from "@/components/visibility-chart";
import type { Tables } from "@/lib/db-types";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

function computeStats(rankings: Tables<"rankings">[]) {
  const latestByKeyword: Record<string, Tables<"rankings">> = {};
  for (const ranking of rankings) {
    if (ranking.rank_absolute == null) continue;
    const existing = latestByKeyword[ranking.keyword_id];
    if (
      !existing ||
      new Date(ranking.checked_at).getTime() > new Date(existing.checked_at).getTime()
    ) {
      latestByKeyword[ranking.keyword_id] = ranking;
    }
  }

  const latest = Object.values(latestByKeyword);
  const total = latest.length;
  const top3 = latest.filter((r) => r.rank_absolute && r.rank_absolute <= 3).length;
  const top10 = latest.filter((r) => r.rank_absolute && r.rank_absolute <= 10).length;
  const average =
    total > 0
      ? Math.round(
          (latest.reduce((sum, r) => sum + (r.rank_absolute ?? 0), 0) / total) * 10
        ) / 10
      : null;

  return { total, top3, top10, average };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  const { data: keywords } = await supabase
    .from("keywords")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const keywordIds = (keywords ?? []).map((k) => k.id);

  const { data: rankings } =
    keywordIds.length > 0
      ? await supabase
          .from("rankings")
          .select("*")
          .in("keyword_id", keywordIds)
          .order("checked_at", { ascending: false })
      : { data: [] };

  const stats = computeStats(rankings ?? []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/"
            className="mb-1 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to projects
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground">{project.domain}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/${id}/research`}>
            <Button variant="outline">
              <Lightbulb className="mr-2 h-4 w-4" />
              Research
            </Button>
          </Link>
          <AddKeywordModal projectId={id}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add keywords
            </Button>
          </AddKeywordModal>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Average position"
          value={stats.average ? stats.average.toString() : "-"}
          icon={TrendingUp}
          description="Lower is better"
        />
        <StatCard
          title="Keywords in top 3"
          value={stats.top3.toString()}
          icon={Search}
          description="Positions 1-3"
        />
        <StatCard
          title="Keywords in top 10"
          value={stats.top10.toString()}
          icon={Search}
          description="Positions 1-10"
        />
        <StatCard
          title="Total keywords tracked"
          value={(keywords ?? []).length.toString()}
          icon={Search}
          description="All keywords"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visibility over time</CardTitle>
          <CardDescription>
            Average ranking position across all tracked keywords.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VisibilityChart rankings={rankings ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keywords</CardTitle>
          <CardDescription>
            Current rankings and changes from the previous check.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KeywordTable keywords={keywords ?? []} rankings={rankings ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
