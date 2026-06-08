import Link from "next/link";
import { connection } from "next/server";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProjectAction } from "@/app/workspace/actions";
import { listProjectsForCurrentUser } from "@/lib/domain/projects";

export default async function WorkspacePage() {
  await connection();

  const projects = await listProjectsForCurrentUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-3">
        <Link className="text-sm text-muted-foreground" href="/">
          Vibe Plan
        </Link>
        <h1 className="text-3xl font-semibold tracking-normal">
          Planning Workspace
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          MVP v0.1 will build the first workflow here: project init, build
          stages, functional team demand, config profiles, demand mappings,
          allocation warnings, and change logs.
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>
              Start from project init, then define build stages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No projects yet. Create the first NPI project to begin stage
                planning.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {projects.map((project) => (
                  <Link
                    className="rounded-lg border p-4 transition-colors hover:bg-muted"
                    href={`/workspace/projects/${project.id}`}
                    key={project.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-medium">
                          {project.name}
                        </h2>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {project.description}
                        </p>
                      </div>
                      <Badge variant="secondary">{project.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create project</CardTitle>
            <CardDescription>
              Only name and description are required for project init.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createProjectAction} className="flex flex-col gap-4">
              <Input name="name" placeholder="Project name" required />
              <Textarea
                name="description"
                placeholder="Project description"
                required
              />
              <Button type="submit">Create project</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
