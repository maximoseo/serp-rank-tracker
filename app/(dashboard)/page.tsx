import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { AddProjectModal } from "@/components/add-project-modal";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load projects: ${error.message}`);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your websites and keyword rankings.
          </p>
        </div>
        <AddProjectModal>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add project
          </Button>
        </AddProjectModal>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <CardDescription>{project.domain}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle>No projects yet</CardTitle>
            <CardDescription>
              Create your first project to start tracking keyword rankings.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <AddProjectModal>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add project
              </Button>
            </AddProjectModal>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
