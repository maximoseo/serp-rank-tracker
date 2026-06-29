import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ResearchSuggestions } from "@/components/research-suggestions";

interface ResearchPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResearchPage({ params }: ResearchPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) {
    return (
      <div className="mx-auto max-w-6xl">
        <p className="text-muted-foreground">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to project
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Keyword research</h1>
        <p className="text-muted-foreground">
          Discover related keywords for {project.domain}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Find related keywords</CardTitle>
          <CardDescription>
            Enter a seed keyword and we will suggest related keywords from DataForSEO Labs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResearchSuggestions projectId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
