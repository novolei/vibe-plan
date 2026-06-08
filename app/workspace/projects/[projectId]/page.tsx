import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import {
  createBuildStageAction,
  createConfigProfileAction,
  createDemandProfileMappingAction,
  createFunctionalTeamDemandAction,
  upsertBuildQtyAllocationAction,
} from "@/app/workspace/actions";
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
  listPlanningRecordsForProject,
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

  const { allocations, demands, mappings, profiles, project, stages } =
    projectPageData;
  const stageNameById = new Map(stages.map((stage) => [stage.id, stage.name]));
  const demandLabelById = new Map(
    demands.map((demand) => [
      demand.id,
      `${demand.team} / ${stageNameById.get(demand.buildStageId) ?? "Stage"} / ${demand.requestedQty}`,
    ]),
  );
  const profileLabelById = new Map(
    profiles.map((profile) => [profile.id, formatProfileLabel(profile)]),
  );
  const activeAllocationByProfileId = new Map(
    allocations
      .filter((allocation) => allocation.status === "active")
      .map((allocation) => [allocation.configProfileId, allocation]),
  );

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

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Functional team demands</CardTitle>
            <CardDescription>
              {demands.length} request{demands.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {demands.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No demand requests.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Purpose</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {demands.map((demand) => (
                      <TableRow key={demand.id}>
                        <TableCell className="font-medium">
                          {demand.team}
                        </TableCell>
                        <TableCell>
                          {stageNameById.get(demand.buildStageId)}
                        </TableCell>
                        <TableCell>{demand.requestedQty}</TableCell>
                        <TableCell>{demand.priority}</TableCell>
                        <TableCell>{demand.purpose}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <form
              action={createFunctionalTeamDemandAction}
              className="grid gap-3 sm:grid-cols-2"
            >
              <input name="projectId" type="hidden" value={project.id} />
              <select
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={stages.length === 0}
                name="buildStageId"
                required
              >
                <option value="">Build stage</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
              <Input name="team" placeholder="Team, e.g. EE" required />
              <Input name="purpose" placeholder="Purpose" required />
              <Input
                min={0}
                name="requestedQty"
                placeholder="Requested qty"
                required
                type="number"
              />
              <Input name="priority" placeholder="Priority" required />
              <Input name="notes" placeholder="Notes" />
              <Button
                className="sm:col-span-2"
                disabled={stages.length === 0}
                type="submit"
              >
                Add demand
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Config profiles</CardTitle>
            <CardDescription>
              {profiles.length} profile{profiles.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {profiles.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No config profiles.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profile</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Process</TableHead>
                      <TableHead>Material</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">
                          {formatProfileLabel(profile)}
                        </TableCell>
                        <TableCell>
                          {stageNameById.get(profile.buildStageId)}
                        </TableCell>
                        <TableCell>{profile.processVariant}</TableCell>
                        <TableCell>{profile.materialVariant}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <form
              action={createConfigProfileAction}
              className="grid gap-3 sm:grid-cols-2"
            >
              <input name="projectId" type="hidden" value={project.id} />
              <select
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={stages.length === 0}
                name="buildStageId"
                required
              >
                <option value="">Build stage</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
              <Input
                name="productRevision"
                placeholder="Product revision"
                required
              />
              <Input name="testPurpose" placeholder="Test purpose" required />
              <Input
                name="marketOrRegion"
                placeholder="Market or region"
                required
              />
              <Input name="variant" placeholder="Variant" required />
              <Input
                name="processVariant"
                placeholder="Process variant"
                required
              />
              <Input
                name="materialVariant"
                placeholder="Material variant"
                required
              />
              <Button
                className="sm:col-span-2"
                disabled={stages.length === 0}
                type="submit"
              >
                Add profile
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Demand to profile mapping</CardTitle>
            <CardDescription>
              {mappings.length} mapping{mappings.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {mappings.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No demand mappings.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Demand</TableHead>
                      <TableHead>Profile</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell>
                          {demandLabelById.get(mapping.functionalTeamDemandId)}
                        </TableCell>
                        <TableCell>
                          {profileLabelById.get(mapping.configProfileId)}
                        </TableCell>
                        <TableCell>{mapping.contributionQty}</TableCell>
                        <TableCell>{mapping.weight ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <form
              action={createDemandProfileMappingAction}
              className="grid gap-3"
            >
              <input name="projectId" type="hidden" value={project.id} />
              <select
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={demands.length === 0}
                name="functionalTeamDemandId"
                required
              >
                <option value="">Demand</option>
                {demands.map((demand) => (
                  <option key={demand.id} value={demand.id}>
                    {demandLabelById.get(demand.id)}
                  </option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={profiles.length === 0}
                name="configProfileId"
                required
              >
                <option value="">Config profile</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profileLabelById.get(profile.id)}
                  </option>
                ))}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  min={0}
                  name="contributionQty"
                  placeholder="Contribution qty"
                  required
                  type="number"
                />
                <Input
                  min={0}
                  name="weight"
                  placeholder="Weight"
                  type="number"
                />
              </div>
              <Input name="rationale" placeholder="Rationale" />
              <Button
                disabled={demands.length === 0 || profiles.length === 0}
                type="submit"
              >
                Add mapping
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Build qty allocations</CardTitle>
            <CardDescription>
              {allocations.length} allocation
              {allocations.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {profiles.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No profiles for allocation.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profile</TableHead>
                      <TableHead>Allocated</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rationale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((profile) => {
                      const allocation = activeAllocationByProfileId.get(
                        profile.id,
                      );

                      return (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">
                            {profileLabelById.get(profile.id)}
                          </TableCell>
                          <TableCell>{allocation?.allocatedQty ?? 0}</TableCell>
                          <TableCell>
                            {allocation?.status ?? "unallocated"}
                          </TableCell>
                          <TableCell>{allocation?.rationale ?? "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <form
              action={upsertBuildQtyAllocationAction}
              className="grid gap-3"
            >
              <input name="projectId" type="hidden" value={project.id} />
              <select
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={profiles.length === 0}
                name="configProfileId"
                required
              >
                <option value="">Config profile</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profileLabelById.get(profile.id)}
                  </option>
                ))}
              </select>
              <Input
                min={0}
                name="allocatedQty"
                placeholder="Allocated qty"
                required
                type="number"
              />
              <Input name="rationale" placeholder="Rationale" />
              <Button disabled={profiles.length === 0} type="submit">
                Set allocation
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

async function loadProjectPageData(projectId: string) {
  try {
    const [project, stages, planningRecords] = await Promise.all([
      getProjectForCurrentUser(projectId),
      listBuildStagesForProject(projectId),
      listPlanningRecordsForProject(projectId),
    ]);

    return { project, stages, ...planningRecords };
  } catch {
    return null;
  }
}

function formatProfileLabel(profile: {
  marketOrRegion: string;
  productRevision: string;
  testPurpose: string;
  variant: string;
}) {
  return [
    profile.productRevision,
    profile.testPurpose,
    profile.marketOrRegion,
    profile.variant,
  ].join(" / ");
}
