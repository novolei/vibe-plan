import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Badge } from "@/components/ui/badge";
import {
  BuildMatrixEntryForm,
  BuildQtyAllocationForm,
  BuildStageForm,
  ConfigProfileForm,
  DemandProfileMappingForm,
  FunctionalTeamDemandForm,
} from "@/components/planning/action-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  const {
    allocationLogs,
    allocations,
    demands,
    matrixEntries,
    mappings,
    planningWarnings,
    profiles,
    project,
    stages,
  } = projectPageData;
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
  const allocationLabelById = new Map(
    allocations.map((allocation) => [
      allocation.id,
      `${profileLabelById.get(allocation.configProfileId) ?? "Profile"} / qty ${allocation.allocatedQty}`,
    ]),
  );
  const stageOptions = stages.map((stage) => ({
    label: stage.name,
    value: stage.id,
  }));
  const demandOptions = demands.map((demand) => ({
    label: demandLabelById.get(demand.id) ?? demand.team,
    value: demand.id,
  }));
  const profileOptions = profiles.map((profile) => ({
    label: profileLabelById.get(profile.id) ?? formatProfileLabel(profile),
    value: profile.id,
  }));
  const allocationOptions = allocations
    .filter((allocation) => allocation.status === "active")
    .map((allocation) => ({
      label: allocationLabelById.get(allocation.id) ?? allocation.id,
      value: allocation.id,
    }));

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
            <BuildStageForm projectId={project.id} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Planning warnings</CardTitle>
            <CardDescription>
              {planningWarnings.length} signal
              {planningWarnings.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {planningWarnings.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No warnings yet. Add demand, mappings, and allocation to start
                validation.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {planningWarnings.map((warning) => (
                  <div
                    className="rounded-lg border p-4 text-sm"
                    key={warning.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{warning.title}</div>
                      <Badge
                        variant={
                          warning.severity === "warning"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {warning.severity}
                      </Badge>
                    </div>
                    <p className="mt-2 text-muted-foreground">
                      {warning.detail}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Allocation change log</CardTitle>
            <CardDescription>
              {allocationLogs.length} audit{" "}
              {allocationLogs.length === 1 ? "entry" : "entries"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allocationLogs.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No allocation edits have been recorded.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Profile</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Before</TableHead>
                      <TableHead>After</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocationLogs
                      .slice()
                      .reverse()
                      .slice(0, 8)
                      .map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                          <TableCell>
                            {profileLabelById.get(log.configProfileId)}
                          </TableCell>
                          <TableCell>{log.fieldName}</TableCell>
                          <TableCell>
                            {formatLogValue(log.beforeValue)}
                          </TableCell>
                          <TableCell>
                            {formatLogValue(log.afterValue)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
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

            <FunctionalTeamDemandForm
              projectId={project.id}
              stageOptions={stageOptions}
            />
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

            <ConfigProfileForm
              projectId={project.id}
              stageOptions={stageOptions}
            />
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

            <DemandProfileMappingForm
              demandOptions={demandOptions}
              profileOptions={profileOptions}
              projectId={project.id}
            />
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

            <BuildQtyAllocationForm
              profileOptions={profileOptions}
              projectId={project.id}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Build matrix</CardTitle>
            <CardDescription>
              {matrixEntries.length} process/material mapping
              {matrixEntries.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {allocations.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Add build qty allocations before mapping process routes and
                material variants.
              </div>
            ) : matrixEntries.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No build matrix entries. Map each allocated profile to its
                process route and key material variant.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Allocation</TableHead>
                      <TableHead>Process route</TableHead>
                      <TableHead>Material variant</TableHead>
                      <TableHead>Readiness</TableHead>
                      <TableHead>Owners</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matrixEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {allocationLabelById.get(entry.buildQtyAllocationId)}
                        </TableCell>
                        <TableCell>{entry.buildProcessRoute}</TableCell>
                        <TableCell>{entry.keyMaterialVariant}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              entry.readinessStatus === "blocked"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {formatReadinessLabel(entry.readinessStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatOwnerTeams(
                            entry.processOwnerTeam,
                            entry.materialOwnerTeam,
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <BuildMatrixEntryForm
              allocationOptions={allocationOptions}
              projectId={project.id}
            />
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

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

function formatLogValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return JSON.stringify(value);
}

function formatReadinessLabel(value: "at_risk" | "blocked" | "greenlight") {
  if (value === "greenlight") {
    return "Greenlight";
  }

  if (value === "at_risk") {
    return "At Risk";
  }

  return "Blocked";
}

function formatOwnerTeams(processOwnerTeam: string, materialOwnerTeam: string) {
  const owners = [processOwnerTeam, materialOwnerTeam].filter(Boolean);

  return owners.length === 0 ? "-" : owners.join(" / ");
}
