import Link from "next/link";
import { connection } from "next/server";
import { FolderKanban, Plus, Route } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectCreateForm } from "@/components/planning/action-forms";
import { listProjectsForCurrentUser } from "@/lib/domain/projects";

export default async function WorkspacePage() {
  await connection();

  const projects = await listProjectsForCurrentUser();

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border bg-white px-5 py-5 shadow-sm">
          <Link
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
            href="/"
          >
            <Route className="size-4" aria-hidden="true" />
            Vibe Plan
          </Link>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                Planning Workspace
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Start from Project Init, then move through stage planning,
                demand, profile, allocation, matrix, schedule, and readiness.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-xl border bg-slate-50 px-3 py-2">
                <div className="text-xs uppercase text-slate-500">Projects</div>
                <div className="mt-1 text-lg font-semibold">
                  {projects.length}
                </div>
              </div>
              <div className="rounded-xl border bg-slate-50 px-3 py-2">
                <div className="text-xs uppercase text-slate-500">Flow</div>
                <div className="mt-1 font-semibold">Stage-first</div>
              </div>
              <div className="rounded-xl border bg-slate-50 px-3 py-2">
                <div className="text-xs uppercase text-slate-500">AI</div>
                <div className="mt-1 font-semibold">Copilot</div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban
                  className="size-4 text-sky-700"
                  aria-hidden="true"
                />
                Projects
              </CardTitle>
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
                      className="rounded-xl border bg-white p-4 transition-colors hover:border-sky-200 hover:bg-sky-50/40"
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
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-4 text-sky-700" aria-hidden="true" />
                Create project
              </CardTitle>
              <CardDescription>
                Only name and description are required for project init.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectCreateForm />
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
