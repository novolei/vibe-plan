import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Badge } from "@/components/ui/badge";
import {
  AIGenerateStageSummaryForm,
  AIProposalReviewForm,
  BlockerForm,
  BuildMatrixEntryForm,
  BuildQtyAllocationForm,
  BuildStageForm,
  ConfigProfileForm,
  DemandProfileMappingForm,
  FunctionalTeamDemandForm,
  ReadinessSignalForm,
  ScheduleDependencyForm,
  ScheduleTaskForm,
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
import { listAiProposalsForProject } from "@/lib/domain/ai-proposals";
import {
  computeWorstChildReadiness,
  listReadinessRecordsForProject,
  type ReadinessStatus,
} from "@/lib/domain/readiness";
import { listScheduleRecordsForProject } from "@/lib/domain/schedule";

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
    aiOperations,
    aiProposals,
    demands,
    matrixEntries,
    mappings,
    planningWarnings,
    profiles,
    project,
    readinessAuditLogs,
    readinessSignals,
    readinessWarnings,
    scheduleAuditLogs,
    scheduleDependencies,
    scheduleLinks,
    scheduleTasks,
    scheduleWarnings,
    blockers,
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
  const matrixEntryLabelById = new Map(
    matrixEntries.map((entry) => [
      entry.id,
      allocationLabelById.get(entry.buildQtyAllocationId) ?? entry.id,
    ]),
  );
  const readinessTargetOptions = [
    { label: `Project / ${project.name}`, value: `project:${project.id}` },
    ...stages.map((stage) => ({
      label: `Stage / ${stage.name}`,
      value: `build_stage:${stage.id}`,
    })),
    ...matrixEntries.map((entry) => ({
      label: `Matrix / ${matrixEntryLabelById.get(entry.id) ?? entry.id}`,
      value: `build_matrix_entry:${entry.id}`,
    })),
  ];
  const readinessSignalOptions = readinessSignals.map((signal) => ({
    label: `${formatReadinessLabel(signal.status)} / ${targetLabelFor(
      signal.targetType,
      signal.targetId,
      {
        matrixEntryLabelById,
        projectName: project.name,
        stageNameById,
      },
    )} / ${signal.summary}`,
    value: signal.id,
  }));
  const matrixReadinessStatusesByStageId = new Map<string, ReadinessStatus[]>();

  for (const entry of matrixEntries) {
    const statuses =
      matrixReadinessStatusesByStageId.get(entry.buildStageId) ?? [];
    statuses.push(entry.readinessStatus);
    matrixReadinessStatusesByStageId.set(entry.buildStageId, statuses);
  }

  const signalReadinessStatusesByStageId = new Map<string, ReadinessStatus[]>();

  for (const signal of readinessSignals) {
    if (!signal.buildStageId) {
      continue;
    }

    const statuses =
      signalReadinessStatusesByStageId.get(signal.buildStageId) ?? [];
    statuses.push(signal.status);
    signalReadinessStatusesByStageId.set(signal.buildStageId, statuses);
  }

  const stageReadinessRows = stages.map((stage) => {
    const statuses = [
      ...(matrixReadinessStatusesByStageId.get(stage.id) ?? []),
      ...(signalReadinessStatusesByStageId.get(stage.id) ?? []),
    ];

    return {
      signalCount: signalReadinessStatusesByStageId.get(stage.id)?.length ?? 0,
      stage,
      status: computeWorstChildReadiness(statuses),
    };
  });
  const visibleBlockers = blockers.filter(
    (blocker) => blocker.status !== "resolved",
  );
  const scheduleLinkedObjectOptions = [
    { label: `Project / ${project.name}`, value: `project:${project.id}` },
    ...stages.map((stage) => ({
      label: `Stage / ${stage.name}`,
      value: `build_stage:${stage.id}`,
    })),
    ...profiles.map((profile) => ({
      label: `Profile / ${profileLabelById.get(profile.id) ?? profile.id}`,
      value: `config_profile:${profile.id}`,
    })),
    ...allocations.map((allocation) => ({
      label: `Allocation / ${allocationLabelById.get(allocation.id) ?? allocation.id}`,
      value: `build_qty_allocation:${allocation.id}`,
    })),
    ...matrixEntries.map((entry) => ({
      label: `Matrix / ${matrixEntryLabelById.get(entry.id) ?? entry.id}`,
      value: `build_matrix_entry:${entry.id}`,
    })),
    ...readinessSignals.map((signal) => ({
      label: `Readiness / ${signal.summary}`,
      value: `readiness_signal:${signal.id}`,
    })),
    ...blockers.map((blocker) => ({
      label: `Blocker / ${blocker.title}`,
      value: `blocker:${blocker.id}`,
    })),
  ];
  const scheduleTaskOptions = scheduleTasks.map((task) => ({
    label: task.title,
    value: task.id,
  }));
  const scheduleLinksByTaskId = new Map<string, typeof scheduleLinks>();

  for (const link of scheduleLinks) {
    const existing = scheduleLinksByTaskId.get(link.scheduleTaskId) ?? [];
    existing.push(link);
    scheduleLinksByTaskId.set(link.scheduleTaskId, existing);
  }

  const scheduleTaskById = new Map(
    scheduleTasks.map((task) => [task.id, task]),
  );
  const operationsByProposalId = new Map<string, typeof aiOperations>();

  for (const operation of aiOperations) {
    const existing = operationsByProposalId.get(operation.aiProposalId) ?? [];
    existing.push(operation);
    operationsByProposalId.set(operation.aiProposalId, existing);
  }

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
            <CardTitle>Schedule extension</CardTitle>
            <CardDescription>
              {scheduleTasks.length} task{scheduleTasks.length === 1 ? "" : "s"}{" "}
              / {scheduleDependencies.length} dependenc
              {scheduleDependencies.length === 1 ? "y" : "ies"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {scheduleWarnings.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No schedule dependency warnings.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {scheduleWarnings.map((warning) => (
                  <div className="rounded-lg border p-4" key={warning.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">{warning.title}</div>
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
                    <p className="mt-2 text-sm text-muted-foreground">
                      {warning.detail}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="mb-4 text-sm font-medium">
                  Add schedule task
                </div>
                <ScheduleTaskForm
                  linkedObjectOptions={scheduleLinkedObjectOptions}
                  projectId={project.id}
                  stageOptions={stageOptions}
                />
              </div>
              <div className="rounded-lg border p-4">
                <div className="mb-4 text-sm font-medium">Add dependency</div>
                <ScheduleDependencyForm
                  projectId={project.id}
                  taskOptions={scheduleTaskOptions}
                />
              </div>
            </div>

            {scheduleTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No schedule tasks.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Linked object</TableHead>
                      <TableHead>Planned</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Owner</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduleTasks.map((task) => {
                      const primaryLink = scheduleLinksByTaskId.get(
                        task.id,
                      )?.[0];

                      return (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">
                            {task.title}
                          </TableCell>
                          <TableCell>
                            {stageNameById.get(task.buildStageId)}
                          </TableCell>
                          <TableCell>
                            {primaryLink
                              ? scheduleLinkedObjectLabel(
                                  primaryLink.linkedObjectType,
                                  primaryLink.linkedObjectId,
                                  {
                                    allocationLabelById,
                                    blockerTitleById: new Map(
                                      blockers.map((blocker) => [
                                        blocker.id,
                                        blocker.title,
                                      ]),
                                    ),
                                    matrixEntryLabelById,
                                    profileLabelById,
                                    projectName: project.name,
                                    readinessSignalLabelById: new Map(
                                      readinessSignals.map((signal) => [
                                        signal.id,
                                        signal.summary,
                                      ]),
                                    ),
                                    stageNameById,
                                  },
                                )
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {formatDateOnly(task.plannedStartDate)} -{" "}
                            {formatDateOnly(task.plannedEndDate)}
                          </TableCell>
                          <TableCell>
                            {formatStatusLabel(task.status)}
                          </TableCell>
                          <TableCell>{task.ownerUserId}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {scheduleDependencies.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No schedule dependencies.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Predecessor</TableHead>
                      <TableHead>Successor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Lag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduleDependencies.map((dependency) => (
                      <TableRow key={dependency.id}>
                        <TableCell>
                          {scheduleTaskById.get(dependency.predecessorTaskId)
                            ?.title ?? "-"}
                        </TableCell>
                        <TableCell>
                          {scheduleTaskById.get(dependency.successorTaskId)
                            ?.title ?? "-"}
                        </TableCell>
                        <TableCell>
                          {formatStatusLabel(dependency.dependencyType)}
                        </TableCell>
                        <TableCell>{dependency.lagDays}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              {scheduleAuditLogs.length} schedule audit{" "}
              {scheduleAuditLogs.length === 1 ? "entry" : "entries"}
            </div>
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

      <section className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Readiness and blockers</CardTitle>
            <CardDescription>
              {readinessSignals.length} signal
              {readinessSignals.length === 1 ? "" : "s"} /{" "}
              {visibleBlockers.length} active blocker
              {visibleBlockers.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-lg border p-4 xl:col-span-2">
                <div className="mb-3 text-sm font-medium">
                  Stage readiness summary
                </div>
                {stageReadinessRows.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    No stages for readiness rollup.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stage</TableHead>
                        <TableHead>Rollup</TableHead>
                        <TableHead>Signals</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stageReadinessRows.map((row) => (
                        <TableRow key={row.stage.id}>
                          <TableCell className="font-medium">
                            {row.stage.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                row.status === "blocked"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {formatReadinessLabel(row.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{row.signalCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-3 text-sm font-medium">
                  Readiness warnings
                </div>
                {readinessWarnings.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No readiness warnings.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {readinessWarnings.map((warning) => (
                      <div className="rounded-lg border p-3" key={warning.id}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium">
                            {warning.title}
                          </div>
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
                        <p className="mt-2 text-sm text-muted-foreground">
                          {warning.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="mb-4 text-sm font-medium">
                  Add readiness signal
                </div>
                <ReadinessSignalForm
                  projectId={project.id}
                  targetOptions={readinessTargetOptions}
                />
              </div>
              <div className="rounded-lg border p-4">
                <div className="mb-4 text-sm font-medium">Add blocker</div>
                <BlockerForm
                  projectId={project.id}
                  readinessSignalOptions={readinessSignalOptions}
                  targetOptions={readinessTargetOptions}
                />
              </div>
            </div>

            {readinessSignals.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No readiness signals.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Target</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Summary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readinessSignals.map((signal) => (
                      <TableRow key={signal.id}>
                        <TableCell>
                          {targetLabelFor(signal.targetType, signal.targetId, {
                            matrixEntryLabelById: new Map(
                              matrixEntries.map((entry) => [
                                entry.id,
                                allocationLabelById.get(
                                  entry.buildQtyAllocationId,
                                ) ?? entry.id,
                              ]),
                            ),
                            projectName: project.name,
                            stageNameById,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              signal.status === "blocked"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {formatReadinessLabel(signal.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{signal.ownerTeam || "-"}</TableCell>
                        <TableCell>{signal.summary}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {visibleBlockers.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No active blockers.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Blocker</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Impact</TableHead>
                      <TableHead>Mitigation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleBlockers.map((blocker) => (
                      <TableRow key={blocker.id}>
                        <TableCell className="font-medium">
                          {blocker.title}
                        </TableCell>
                        <TableCell>
                          {formatStatusLabel(blocker.status)}
                        </TableCell>
                        <TableCell>{blocker.ownerTeam}</TableCell>
                        <TableCell>{blocker.severity}</TableCell>
                        <TableCell>
                          {formatNullableDateTime(blocker.dueDate)}
                        </TableCell>
                        <TableCell>{blocker.impact}</TableCell>
                        <TableCell>{blocker.mitigation || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              {readinessAuditLogs.length} readiness audit{" "}
              {readinessAuditLogs.length === 1 ? "entry" : "entries"}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>AI Planning Copilot</CardTitle>
            <CardDescription>
              {aiProposals.length} proposal{aiProposals.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="rounded-lg border p-4">
              <div className="mb-4 flex flex-col gap-1">
                <h2 className="text-sm font-medium">Stage summary</h2>
                <p className="text-sm text-muted-foreground">
                  Draft a reviewable stage planning proposal from current
                  demand, allocation, and matrix records.
                </p>
              </div>
              <AIGenerateStageSummaryForm
                projectId={project.id}
                stageOptions={stageOptions}
              />
            </div>

            {aiProposals.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No AI proposals.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {aiProposals
                  .slice()
                  .reverse()
                  .map((proposal) => {
                    const operations =
                      operationsByProposalId.get(proposal.id) ?? [];

                    return (
                      <div className="rounded-lg border p-4" key={proposal.id}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-sm font-medium">
                                {proposal.title}
                              </h2>
                              <Badge variant="secondary">
                                {formatStatusLabel(proposal.proposalType)}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {proposal.summary}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant={
                                proposal.humanDisposition === "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {formatStatusLabel(proposal.humanDisposition)}
                            </Badge>
                            <Badge variant="secondary">
                              {formatConfidence(proposal.confidence)}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg bg-muted/40 p-3">
                            <div className="text-xs font-medium uppercase text-muted-foreground">
                              Rationale
                            </div>
                            <p className="mt-2 text-sm">{proposal.rationale}</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-3">
                            <div className="text-xs font-medium uppercase text-muted-foreground">
                              Source
                            </div>
                            <p className="mt-2 text-sm">
                              {formatSourceContext(proposal.sourceContext)}
                            </p>
                          </div>
                        </div>

                        {operations.length > 0 ? (
                          <div className="mt-4 overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Operation</TableHead>
                                  <TableHead>Target</TableHead>
                                  <TableHead>Validation</TableHead>
                                  <TableHead>Execution</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {operations.map((operation) => (
                                  <TableRow key={operation.id}>
                                    <TableCell>
                                      {formatStatusLabel(
                                        operation.operationType,
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {formatTargetLabel(
                                        operation.targetType,
                                        operation.targetId,
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {formatStatusLabel(
                                        operation.validationStatus,
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {formatStatusLabel(
                                        operation.executionStatus,
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : null}

                        <div className="mt-4 border-t pt-4">
                          {proposal.humanDisposition === "pending" ? (
                            <AIProposalReviewForm
                              projectId={project.id}
                              proposalId={proposal.id}
                            />
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Reviewed{" "}
                              {formatNullableDateTime(proposal.reviewedAt)}
                              {proposal.reviewNotes
                                ? `: ${proposal.reviewNotes}`
                                : ""}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

async function loadProjectPageData(projectId: string) {
  try {
    const [
      project,
      stages,
      planningRecords,
      aiProposalRecords,
      readinessRecords,
      scheduleRecords,
    ] = await Promise.all([
      getProjectForCurrentUser(projectId),
      listBuildStagesForProject(projectId),
      listPlanningRecordsForProject(projectId),
      listAiProposalsForProject(projectId),
      listReadinessRecordsForProject(projectId),
      listScheduleRecordsForProject(projectId),
    ]);

    return {
      project,
      stages,
      ...planningRecords,
      ...aiProposalRecords,
      ...readinessRecords,
      ...scheduleRecords,
    };
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

function formatNullableDateTime(value: Date | null) {
  return value ? formatDateTime(value) : "-";
}

function formatDateOnly(value: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
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

function targetLabelFor(
  targetType: string,
  targetId: string,
  input: {
    matrixEntryLabelById: Map<string, string>;
    projectName: string;
    stageNameById: Map<string, string>;
  },
) {
  if (targetType === "project") {
    return `Project / ${input.projectName}`;
  }

  if (targetType === "build_stage") {
    return `Stage / ${input.stageNameById.get(targetId) ?? targetId.slice(0, 8)}`;
  }

  if (targetType === "build_matrix_entry") {
    return `Matrix / ${input.matrixEntryLabelById.get(targetId) ?? targetId.slice(0, 8)}`;
  }

  return `${formatStatusLabel(targetType)} / ${targetId.slice(0, 8)}`;
}

function scheduleLinkedObjectLabel(
  linkedObjectType: string,
  linkedObjectId: string,
  input: {
    allocationLabelById: Map<string, string>;
    blockerTitleById: Map<string, string>;
    matrixEntryLabelById: Map<string, string>;
    profileLabelById: Map<string, string>;
    projectName: string;
    readinessSignalLabelById: Map<string, string>;
    stageNameById: Map<string, string>;
  },
) {
  if (linkedObjectType === "project") {
    return `Project / ${input.projectName}`;
  }

  if (linkedObjectType === "build_stage") {
    return `Stage / ${input.stageNameById.get(linkedObjectId) ?? linkedObjectId.slice(0, 8)}`;
  }

  if (linkedObjectType === "config_profile") {
    return `Profile / ${input.profileLabelById.get(linkedObjectId) ?? linkedObjectId.slice(0, 8)}`;
  }

  if (linkedObjectType === "build_qty_allocation") {
    return `Allocation / ${input.allocationLabelById.get(linkedObjectId) ?? linkedObjectId.slice(0, 8)}`;
  }

  if (linkedObjectType === "build_matrix_entry") {
    return `Matrix / ${input.matrixEntryLabelById.get(linkedObjectId) ?? linkedObjectId.slice(0, 8)}`;
  }

  if (linkedObjectType === "readiness_signal") {
    return `Readiness / ${input.readinessSignalLabelById.get(linkedObjectId) ?? linkedObjectId.slice(0, 8)}`;
  }

  if (linkedObjectType === "blocker") {
    return `Blocker / ${input.blockerTitleById.get(linkedObjectId) ?? linkedObjectId.slice(0, 8)}`;
  }

  return `${formatStatusLabel(linkedObjectType)} / ${linkedObjectId.slice(0, 8)}`;
}

function formatConfidence(value: number | null) {
  return value === null ? "confidence -" : `confidence ${value}%`;
}

function formatSourceContext(value: unknown) {
  if (!value || typeof value !== "object") {
    return "-";
  }

  const context = value as {
    allocations?: unknown[];
    demands?: unknown[];
    matrixEntries?: unknown[];
    profiles?: unknown[];
    stage?: { name?: string };
  };

  return [
    context.stage?.name ?? "stage",
    `${context.demands?.length ?? 0} demands`,
    `${context.profiles?.length ?? 0} profiles`,
    `${context.allocations?.length ?? 0} allocations`,
    `${context.matrixEntries?.length ?? 0} matrix entries`,
  ].join(" / ");
}

function formatStatusLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatTargetLabel(targetType: string, targetId: string | null) {
  return targetId
    ? `${formatStatusLabel(targetType)} / ${targetId.slice(0, 8)}`
    : formatStatusLabel(targetType);
}
