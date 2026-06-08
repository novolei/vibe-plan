import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { createBuildStageAction } from "@/app/workspace/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  getProjectForCurrentUser,
  listBuildStagesForProject,
} from "@/lib/domain/projects";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  await connection();

  const projectPageData = await loadProjectPageData(projectId);

  if (!projectPageData) {
    notFound();
  }

  const { project, stages } = projectPageData;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-3">
        <Link className="text-sm text-muted-foreground" href="/workspace">
          Workspace
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-normal">
              {project.name}
            </h1>
            <p className="max-w-3xl text-muted-foreground">
              {project.description}
            </p>
          </div>
          <Badge variant="secondary">{project.status}</Badge>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Build stages</CardTitle>
            <CardDescription>
              Define stages with a goal and description before demand intake.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stages.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No build stages yet. Create EVT, DVT, PVT, Pilot, or a custom
                stage to continue.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Goal</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stages.map((stage) => (
                    <TableRow key={stage.id}>
                      <TableCell>{stage.stageOrder}</TableCell>
                      <TableCell className="font-medium">
                        {stage.name}
                      </TableCell>
                      <TableCell>{stage.goal}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{stage.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create stage</CardTitle>
            <CardDescription>
              Template source is optional; all fields can be project overrides.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={createBuildStageAction}
              className="flex flex-col gap-4"
            >
              <input name="projectId" type="hidden" value={project.id} />
              <Input name="name" placeholder="Stage name, e.g. EVT" required />
              <Input name="goal" placeholder="Stage goal" required />
              <Textarea
                name="description"
                placeholder="Stage description"
                required
              />
              <Input
                name="templateSource"
                placeholder="Template source, optional"
              />
              <Button type="submit">Create stage</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

async function loadProjectPageData(projectId: string) {
  try {
    const [project, stages] = await Promise.all([
      getProjectForCurrentUser(projectId),
      listBuildStagesForProject(projectId),
    ]);

    return { project, stages };
  } catch {
    return null;
  }
}
