import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  AlertTriangle,
  Bot,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Factory,
  FileSpreadsheet,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  Menu,
  SlidersHorizontal,
  Target,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BomCsvImportPanel } from "@/components/planning/bom-csv-import-panel";
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
import type { ScheduleTask } from "@/db/schema";
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
  searchParams: Promise<{
    stageId?: string | string[];
    step?: string | string[];
  }>;
};

const workflowStepIds = [
  "project",
  "demand",
  "profile",
  "allocation",
  "matrix",
  "bom",
  "schedule",
  "readiness",
  "dashboard",
] as const;

type WorkflowStepId = (typeof workflowStepIds)[number];

export default async function ProjectPage({
  params,
  searchParams,
}: ProjectPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
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

  const requestedStep = firstSearchParamValue(resolvedSearchParams.step);
  const activeStep = workflowStepIds.includes(requestedStep as WorkflowStepId)
    ? (requestedStep as WorkflowStepId)
    : "dashboard";
  const requestedStageId = firstSearchParamValue(resolvedSearchParams.stageId);
  const activeStage =
    stages.find((stage) => stage.id === requestedStageId) ?? stages[0] ?? null;
  const activeStageId = activeStage?.id;
  const stageScopedDemands = activeStageId
    ? demands.filter((demand) => demand.buildStageId === activeStageId)
    : demands;
  const stageScopedProfiles = activeStageId
    ? profiles.filter((profile) => profile.buildStageId === activeStageId)
    : profiles;
  const stageScopedProfileIds = new Set(
    stageScopedProfiles.map((profile) => profile.id),
  );
  const stageScopedAllocations = allocations.filter((allocation) =>
    stageScopedProfileIds.has(allocation.configProfileId),
  );
  const stageScopedMatrixEntries = activeStageId
    ? matrixEntries.filter((entry) => entry.buildStageId === activeStageId)
    : matrixEntries;
  const stageScopedScheduleTasks = activeStageId
    ? scheduleTasks.filter((task) => task.buildStageId === activeStageId)
    : scheduleTasks;
  const stageScopedReadiness =
    stageReadinessRows.find((row) => row.stage.id === activeStageId)?.status ??
    computeWorstChildReadiness([
      ...stageReadinessRows.map((row) => row.status),
    ]);
  const unresolvedWarningCount =
    planningWarnings.length +
    readinessWarnings.length +
    scheduleWarnings.length;
  const latestAiProposal = aiProposals.at(-1);
  const workflowSteps: WorkflowStep[] = [
    {
      count: stages.length,
      description: "Project context and build stages",
      href: projectStepHref(project.id, "project", activeStageId),
      icon: ClipboardList,
      id: "project",
      label: "Project",
      status: stages.length > 0 ? "ready" : "open",
    },
    {
      count: stageScopedDemands.length,
      description: "X-function build qty requests",
      href: projectStepHref(project.id, "demand", activeStageId),
      icon: Target,
      id: "demand",
      label: "Demand",
      status: stageScopedDemands.length > 0 ? "ready" : "open",
    },
    {
      count: stageScopedProfiles.length,
      description: "Structured config profiles",
      href: projectStepHref(project.id, "profile", activeStageId),
      icon: SlidersHorizontal,
      id: "profile",
      label: "Profiles",
      status: stageScopedProfiles.length > 0 ? "ready" : "open",
    },
    {
      count: stageScopedAllocations.length,
      description: "Request to allocation decisions",
      href: projectStepHref(project.id, "allocation", activeStageId),
      icon: GitBranch,
      id: "allocation",
      label: "Allocation",
      status: stageScopedAllocations.length > 0 ? "ready" : "open",
    },
    {
      count: stageScopedMatrixEntries.length,
      description: "Process and material mapping",
      href: projectStepHref(project.id, "matrix", activeStageId),
      icon: Factory,
      id: "matrix",
      label: "Matrix",
      status: stageScopedMatrixEntries.length > 0 ? "ready" : "open",
    },
    {
      count: null,
      description: "CSV preview and column validation",
      href: projectStepHref(project.id, "bom", activeStageId),
      icon: FileSpreadsheet,
      id: "bom",
      label: "BOM CSV",
      status: "open",
    },
    {
      count: stageScopedScheduleTasks.length,
      description: "Schedule tasks and dependencies",
      href: projectStepHref(project.id, "schedule", activeStageId),
      icon: CalendarDays,
      id: "schedule",
      label: "Schedule",
      status: stageScopedScheduleTasks.length > 0 ? "ready" : "open",
    },
    {
      count: visibleBlockers.length,
      description: "Greenlight, risk, blockers",
      href: projectStepHref(project.id, "readiness", activeStageId),
      icon: ListChecks,
      id: "readiness",
      label: "Readiness",
      status:
        stageScopedReadiness === "blocked"
          ? "blocked"
          : stageScopedReadiness === "at_risk"
            ? "warning"
            : "ready",
    },
    {
      count: stageScopedMatrixEntries.length,
      description: "Final build matrix and timeline",
      href: projectStepHref(project.id, "dashboard", activeStageId),
      icon: LayoutDashboard,
      id: "dashboard",
      label: "Final",
      status: unresolvedWarningCount > 0 ? "warning" : "ready",
    },
  ];
  const activeWorkflowIndex = Math.max(
    workflowSteps.findIndex((step) => step.id === activeStep),
    0,
  );
  const activeWorkflowStep =
    workflowSteps[activeWorkflowIndex] ?? workflowSteps[0];
  const nextWorkflowStep =
    workflowSteps[Math.min(activeWorkflowIndex + 1, workflowSteps.length - 1)];
  const overallHealth = overallHealthForReadiness(stageScopedReadiness);
  const readinessPercent = readinessPercentFor(stageScopedReadiness);
  const scheduleRisk = riskLabelFor(
    scheduleWarnings.length + readinessWarnings.length,
  );
  const materialRisk = riskLabelFor(
    planningWarnings.length + (stageScopedMatrixEntries.length === 0 ? 1 : 0),
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="relative rounded-2xl border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.08)]">
          <div className="grid divide-y divide-slate-200 xl:min-h-[88px] xl:grid-cols-[260px_minmax(390px,1fr)_auto] xl:divide-x xl:divide-y-0">
            <div className="flex items-center gap-4 px-5 py-5">
              <a
                aria-label="Jump to workflow navigation"
                className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                href="#workflow-rail"
              >
                <Menu className="size-5" aria-hidden="true" />
              </a>
              <Link
                className="group inline-flex items-center gap-3"
                href="/workspace"
              >
                <span className="flex size-9 items-center justify-center rounded-xl border border-cyan-100 bg-cyan-50 text-cyan-600 transition-colors group-hover:border-cyan-200">
                  <Workflow className="size-5" aria-hidden="true" />
                </span>
                <span className="text-[24px] font-semibold leading-none tracking-normal text-slate-950">
                  Vibe Plan
                </span>
              </Link>
            </div>

            <div className="grid gap-4 px-6 py-4 md:grid-cols-[minmax(140px,1fr)_minmax(170px,0.9fr)] md:items-center">
              <div className="min-w-0 md:border-r md:border-slate-200 md:pr-6">
                <div className="text-[12px] font-semibold text-slate-400">
                  Project
                </div>
                <details className="group relative mt-1 max-w-full">
                  <summary className="inline-flex max-w-full cursor-pointer list-none items-center gap-2 text-[18px] font-semibold leading-tight text-slate-950 outline-none hover:text-sky-800 focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 [&::-webkit-details-marker]:hidden">
                    <span className="truncate">{project.name}</span>
                    <ChevronDown
                      className="size-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="absolute left-0 z-30 mt-3 w-[300px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                    <div className="text-[11px] font-semibold uppercase tracking-normal text-slate-400">
                      Current project
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-950">
                      {project.name}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {project.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                      <span className="text-slate-500">Status</span>
                      <Badge variant="secondary">{project.status}</Badge>
                    </div>
                    <Link
                      className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      href="/workspace"
                    >
                      Project list
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                </details>
              </div>

              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-slate-400">
                  Stage
                </div>
                <details className="group relative mt-1 w-full max-w-[245px]">
                  <summary className="flex h-12 w-full cursor-pointer list-none items-center justify-between rounded-lg border border-slate-200 bg-white px-4 text-[18px] font-semibold leading-tight text-slate-950 shadow-sm outline-none transition-colors hover:border-sky-200 hover:bg-sky-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 [&::-webkit-details-marker]:hidden">
                    <span className="truncate">
                      {activeWorkflowIndex + 1}. {activeWorkflowStep.label}
                    </span>
                    <ChevronDown
                      className="size-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="absolute left-0 z-30 mt-3 w-[280px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    {workflowSteps.map((step, index) => {
                      const Icon = step.icon;

                      return (
                        <Link
                          className={[
                            "grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                            step.id === activeStep
                              ? "bg-sky-50 text-sky-950"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                          ].join(" ")}
                          href={step.href}
                          key={step.id}
                        >
                          <span
                            className={[
                              "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold",
                              step.id === activeStep
                                ? "bg-sky-700 text-white"
                                : "bg-slate-100 text-slate-500",
                            ].join(" ")}
                          >
                            {index + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 font-medium">
                              <Icon className="size-3.5" aria-hidden="true" />
                              {step.label}
                            </span>
                            <span className="block truncate text-[11px] text-slate-500">
                              {step.description}
                            </span>
                          </span>
                          <WorkflowStatusDot status={step.status} />
                        </Link>
                      );
                    })}
                  </div>
                </details>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center xl:justify-end">
              <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 lg:flex lg:rounded-none lg:border-0">
                <TopStatusMetric
                  label="Overall Health"
                  tone={overallHealth.tone}
                  value={overallHealth.label}
                  withDot
                />
                <TopStatusMetric
                  label="Readiness"
                  tone={readinessTone(stageScopedReadiness)}
                  value={`${readinessPercent}%`}
                />
                <TopStatusMetric
                  label="Schedule Risk"
                  tone={riskTone(scheduleRisk)}
                  value={scheduleRisk}
                />
                <TopStatusMetric
                  label="Material Risk"
                  tone={riskTone(materialRisk)}
                  value={materialRisk}
                />
              </div>

              <Link
                className="inline-flex h-14 shrink-0 items-center justify-center gap-3 whitespace-nowrap rounded-lg bg-sky-800 px-6 text-[17px] font-semibold text-white shadow-sm transition-colors hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                href={nextWorkflowStep.href}
              >
                Save & Continue
                <ChevronRight className="size-5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_310px]">
          <aside
            className="h-fit scroll-mt-4 rounded-xl border bg-white p-3 shadow-sm lg:sticky lg:top-4"
            id="workflow-rail"
          >
            <div className="mb-3 flex items-center gap-2 px-2 text-sm font-medium text-slate-900">
              <Workflow className="size-4 text-sky-700" aria-hidden="true" />
              ADR workflow
            </div>
            <nav className="grid gap-1">
              {workflowSteps.map((step, index) => (
                <WorkflowStepLink
                  active={activeStep === step.id}
                  index={index + 1}
                  key={step.id}
                  step={step}
                />
              ))}
            </nav>
          </aside>

          <div className="grid min-w-0 gap-6">
            <section
              className={sectionClass(
                activeStep,
                "project",
                "grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]",
              )}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Build stages</CardTitle>
                  <CardDescription>
                    Define stages with a goal and description before demand
                    intake.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stages.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                      No build stages yet. Create EVT, DVT, PVT, Pilot, or a
                      custom stage to continue.
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
                    Template source is optional; all fields can be project
                    overrides.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BuildStageForm projectId={project.id} />
                </CardContent>
              </Card>
            </section>

            <section
              className={sectionClass(
                activeStep,
                "dashboard",
                "grid gap-4 xl:grid-cols-2",
              )}
            >
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>Final dashboard</CardTitle>
                  <CardDescription>
                    Consolidated build matrix, schedule, readiness, and
                    allocation posture for {activeStage?.name ?? "all stages"}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <DashboardTabs />
                  <div className="grid gap-3 md:grid-cols-4">
                    <MetricTile
                      label="Profiles"
                      value={stageScopedProfiles.length}
                    />
                    <MetricTile
                      label="Matrix rows"
                      value={stageScopedMatrixEntries.length}
                    />
                    <MetricTile
                      label="Schedule tasks"
                      value={stageScopedScheduleTasks.length}
                    />
                    <MetricTile
                      label="Stage readiness"
                      tone={readinessTone(stageScopedReadiness)}
                      value={formatReadinessLabel(stageScopedReadiness)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Process / material build matrix</CardTitle>
                  <CardDescription>
                    Matrix rows are grouped by allocated config profile.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stageScopedProfiles.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                      No config profiles for this stage yet.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Config profile</TableHead>
                          <TableHead>Allocated</TableHead>
                          <TableHead>Process route</TableHead>
                          <TableHead>Material variant</TableHead>
                          <TableHead>Readiness</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stageScopedProfiles.map((profile) => {
                          const allocation = activeAllocationByProfileId.get(
                            profile.id,
                          );
                          const entry = allocation
                            ? stageScopedMatrixEntries.find(
                                (matrixEntry) =>
                                  matrixEntry.buildQtyAllocationId ===
                                  allocation.id,
                              )
                            : undefined;

                          return (
                            <TableRow key={profile.id}>
                              <TableCell className="font-medium">
                                {profileLabelById.get(profile.id)}
                              </TableCell>
                              <TableCell>
                                {allocation?.allocatedQty ?? 0}
                              </TableCell>
                              <TableCell>
                                {entry?.buildProcessRoute ?? (
                                  <span className="text-amber-600">
                                    unmapped
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {entry?.keyMaterialVariant ?? (
                                  <span className="text-amber-600">
                                    unmapped
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {entry ? (
                                  <ReadinessBadge
                                    status={entry.readinessStatus}
                                  />
                                ) : (
                                  <Badge
                                    className="bg-amber-50 text-amber-700"
                                    variant="outline"
                                  >
                                    Partial
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>Mapped / Required by config profile</span>
                    <span className="text-emerald-700">Greenlight</span>
                    <span className="text-amber-700">Partial</span>
                    <span className="text-red-700">Blocked</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Schedule preview</CardTitle>
                  <CardDescription>
                    Timeline-ready task list before full Gantt visualization.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stageScopedScheduleTasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                      No schedule tasks for this stage yet.
                    </div>
                  ) : (
                    <ScheduleGanttPreview
                      compact
                      stageNameById={stageNameById}
                      tasks={stageScopedScheduleTasks}
                    />
                  )}
                </CardContent>
              </Card>

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
                      No warnings yet. Add demand, mappings, and allocation to
                      start validation.
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
                                <TableCell>
                                  {formatDateTime(log.createdAt)}
                                </TableCell>
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

            <section
              className={sectionClass(
                activeStep,
                "demand",
                "profile",
                "grid gap-6",
              )}
            >
              <Card className={activeStep === "demand" ? "" : "hidden"}>
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
                    defaultStageId={activeStageId}
                    projectId={project.id}
                    stageOptions={stageOptions}
                  />
                </CardContent>
              </Card>

              <Card className={activeStep === "profile" ? "" : "hidden"}>
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
                    defaultStageId={activeStageId}
                    projectId={project.id}
                    stageOptions={stageOptions}
                  />
                </CardContent>
              </Card>
            </section>

            <section
              className={sectionClass(
                activeStep,
                "allocation",
                "grid gap-6 xl:grid-cols-2",
              )}
            >
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
                                {demandLabelById.get(
                                  mapping.functionalTeamDemandId,
                                )}
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
                                <TableCell>
                                  {allocation?.allocatedQty ?? 0}
                                </TableCell>
                                <TableCell>
                                  {allocation?.status ?? "unallocated"}
                                </TableCell>
                                <TableCell>
                                  {allocation?.rationale ?? "-"}
                                </TableCell>
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

            <section className={sectionClass(activeStep, "bom", "grid gap-6")}>
              <Card>
                <CardHeader>
                  <CardTitle>BOM CSV import</CardTitle>
                  <CardDescription>
                    Preview process/material BOM rows before a future backend
                    import commits them to the build matrix.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BomCsvImportPanel />
                </CardContent>
              </Card>
            </section>

            <section
              className={sectionClass(activeStep, "schedule", "grid gap-6")}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Schedule extension</CardTitle>
                  <CardDescription>
                    {scheduleTasks.length} task
                    {scheduleTasks.length === 1 ? "" : "s"} /{" "}
                    {scheduleDependencies.length} dependenc
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

                  <div className="grid gap-6 xl:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <div className="mb-4 text-sm font-medium">
                        Add schedule task
                      </div>
                      <ScheduleTaskForm
                        defaultStageId={activeStageId}
                        linkedObjectOptions={scheduleLinkedObjectOptions}
                        projectId={project.id}
                        stageOptions={stageOptions}
                      />
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="mb-4 text-sm font-medium">
                        Add dependency
                      </div>
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
                    <div className="grid gap-4">
                      <div className="rounded-lg border p-4">
                        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-sm font-medium">
                              Visual Gantt preview
                            </div>
                            <div className="text-xs text-slate-500">
                              Relative timeline view derived from planned
                              start/end dates.
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {scheduleTasks.length} task
                            {scheduleTasks.length === 1 ? "" : "s"}
                          </div>
                        </div>
                        <ScheduleGanttPreview
                          stageNameById={stageNameById}
                          tasks={scheduleTasks}
                        />
                      </div>

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
                                {scheduleTaskById.get(
                                  dependency.predecessorTaskId,
                                )?.title ?? "-"}
                              </TableCell>
                              <TableCell>
                                {scheduleTaskById.get(
                                  dependency.successorTaskId,
                                )?.title ?? "-"}
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

            <section
              className={sectionClass(activeStep, "matrix", "grid gap-6")}
            >
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
                      Add build qty allocations before mapping process routes
                      and material variants.
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
                                {allocationLabelById.get(
                                  entry.buildQtyAllocationId,
                                )}
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

            <section
              className={sectionClass(activeStep, "readiness", "grid gap-6")}
            >
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
                            <div
                              className="rounded-lg border p-3"
                              key={warning.id}
                            >
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
                      <div className="mb-4 text-sm font-medium">
                        Add blocker
                      </div>
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
                                {targetLabelFor(
                                  signal.targetType,
                                  signal.targetId,
                                  {
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
                                  },
                                )}
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

            <section className="hidden">
              <Card>
                <CardHeader>
                  <CardTitle>AI Planning Copilot</CardTitle>
                  <CardDescription>
                    {aiProposals.length} proposal
                    {aiProposals.length === 1 ? "" : "s"}
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
                      defaultStageId={activeStageId}
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
                            <div
                              className="rounded-lg border p-4"
                              key={proposal.id}
                            >
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
                                    {formatStatusLabel(
                                      proposal.humanDisposition,
                                    )}
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
                                  <p className="mt-2 text-sm">
                                    {proposal.rationale}
                                  </p>
                                </div>
                                <div className="rounded-lg bg-muted/40 p-3">
                                  <div className="text-xs font-medium uppercase text-muted-foreground">
                                    Source
                                  </div>
                                  <p className="mt-2 text-sm">
                                    {formatSourceContext(
                                      proposal.sourceContext,
                                    )}
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
                                    {formatNullableDateTime(
                                      proposal.reviewedAt,
                                    )}
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
          </div>

          <aside className="grid h-fit grid-cols-1 gap-4 lg:col-start-2 xl:col-start-auto xl:sticky xl:top-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="size-4 text-sky-700" aria-hidden="true" />
                  AI review
                </CardTitle>
                <CardDescription>
                  Draft summaries and keep human disposition visible.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 border-b text-sm">
                  <div className="border-b-2 border-sky-700 px-2 pb-2 text-center font-medium text-sky-800">
                    Suggestions
                  </div>
                  <div className="px-2 pb-2 text-center text-slate-500">
                    Activity
                  </div>
                </div>
                <AIGenerateStageSummaryForm
                  defaultStageId={activeStageId}
                  projectId={project.id}
                  stageOptions={stageOptions}
                />
                <div className="rounded-lg border bg-slate-50 p-3">
                  <div className="text-xs font-medium uppercase text-slate-500">
                    Latest proposal
                  </div>
                  {latestAiProposal ? (
                    <div className="mt-2 grid gap-2">
                      <div className="text-sm font-medium">
                        {latestAiProposal.title}
                      </div>
                      <p className="line-clamp-3 text-sm text-slate-600">
                        {latestAiProposal.summary}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {formatStatusLabel(latestAiProposal.humanDisposition)}
                        </Badge>
                        <Badge variant="secondary">
                          {formatConfidence(latestAiProposal.confidence)}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      No proposal yet.
                    </p>
                  )}
                </div>
                <div className="rounded-lg border bg-white p-3">
                  <div className="mb-2 text-sm font-medium">Next actions</div>
                  <div className="grid gap-2 text-sm text-slate-600">
                    <label className="flex items-start gap-2">
                      <input className="mt-1" type="checkbox" readOnly />
                      Complete unmapped process/material rows.
                    </label>
                    <label className="flex items-start gap-2">
                      <input className="mt-1" type="checkbox" readOnly />
                      Review allocation warnings before baseline.
                    </label>
                    <label className="flex items-start gap-2">
                      <input className="mt-1" type="checkbox" readOnly />
                      Validate readiness blockers for Greenlight.
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle
                    className="size-4 text-amber-600"
                    aria-hidden="true"
                  />
                  Review signals
                </CardTitle>
                <CardDescription>
                  Non-blocking warnings across allocation, readiness, and
                  schedule.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {unresolvedWarningCount === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
                    No active review signals.
                  </div>
                ) : (
                  [
                    ...planningWarnings,
                    ...readinessWarnings,
                    ...scheduleWarnings,
                  ]
                    .slice(0, 5)
                    .map((warning) => (
                      <div
                        className="rounded-lg border bg-slate-50 p-3"
                        key={warning.id}
                      >
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
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                          {warning.detail}
                        </p>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </main>
  );
}

type WorkflowStepStatus = "blocked" | "open" | "ready" | "warning";

type WorkflowStep = {
  count: number | null;
  description: string;
  href: string;
  icon: LucideIcon;
  id: WorkflowStepId;
  label: string;
  status: WorkflowStepStatus;
};

type MetricTone = "default" | "good" | "warning" | "bad";
type RiskLabel = "Low" | "Medium" | "High";

function DashboardTabs() {
  return (
    <div className="flex flex-wrap gap-1 border-b text-sm">
      {[
        "Process / Material Matrix",
        "Allocation Summary",
        "Schedule Preview",
        "Readiness Overview",
      ].map((label, index) => (
        <div
          className={[
            "border-b-2 px-3 py-2 font-medium",
            index === 0
              ? "border-sky-700 text-sky-800"
              : "border-transparent text-slate-500",
          ].join(" ")}
          key={label}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

function TopStatusMetric({
  label,
  tone = "default",
  value,
  withDot = false,
}: {
  label: string;
  tone?: MetricTone;
  value: ReactNode;
  withDot?: boolean;
}) {
  const valueClassName =
    tone === "good"
      ? "text-emerald-700"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "bad"
          ? "text-red-600"
          : "text-slate-950";
  const dotClassName =
    tone === "good"
      ? "bg-emerald-600"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "bad"
          ? "bg-red-500"
          : "bg-slate-400";

  return (
    <div className="min-w-[112px] border-b border-r border-slate-200 px-3.5 py-3 last:border-r-0 even:border-r-0 lg:border-b-0 lg:even:border-r lg:last:border-r-0">
      <div className="whitespace-nowrap text-[11px] font-semibold leading-none text-slate-500">
        {label}
      </div>
      <div
        className={[
          "mt-2 flex items-center gap-2 whitespace-nowrap text-[20px] font-semibold leading-none tracking-normal",
          valueClassName,
        ].join(" ")}
      >
        {withDot ? (
          <span
            className={`size-2.5 rounded-full ${dotClassName}`}
            aria-hidden="true"
          />
        ) : null}
        <span>{value}</span>
      </div>
    </div>
  );
}

function ScheduleGanttPreview({
  compact = false,
  stageNameById,
  tasks,
}: {
  compact?: boolean;
  stageNameById: Map<string, string>;
  tasks: ScheduleTask[];
}) {
  const range = scheduleDateRange(tasks);

  if (!range) {
    return null;
  }

  const ticks = scheduleRangeTicks(range.start, range.end);

  return (
    <div className="overflow-x-auto">
      <div className={compact ? "min-w-[520px]" : "min-w-[720px]"}>
        <div
          className={[
            "grid items-end gap-3 border-b border-slate-200 pb-2",
            compact
              ? "grid-cols-[150px_minmax(260px,1fr)]"
              : "grid-cols-[210px_minmax(360px,1fr)]",
          ].join(" ")}
        >
          <div className="text-[11px] font-semibold uppercase tracking-normal text-slate-500">
            Task
          </div>
          <div className="relative h-5">
            {ticks.map((tick, index) => (
              <div
                className={[
                  "absolute top-0 whitespace-nowrap text-[11px] font-medium text-slate-500",
                  index === 0
                    ? "translate-x-0"
                    : index === ticks.length - 1
                      ? "-translate-x-full"
                      : "-translate-x-1/2",
                ].join(" ")}
                key={tick.date.toISOString()}
                style={{ left: `${tick.left}%` }}
              >
                {formatDateOnly(tick.date)}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2 pt-3">
          {tasks.map((task) => {
            const position = scheduleTaskPosition(task, range);

            return (
              <div
                className={[
                  "grid items-center gap-3",
                  compact
                    ? "grid-cols-[150px_minmax(260px,1fr)]"
                    : "grid-cols-[210px_minmax(360px,1fr)]",
                ].join(" ")}
                key={task.id}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-950">
                    {task.title}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="truncate">
                      {stageNameById.get(task.buildStageId) ?? "Stage"}
                    </span>
                    <span aria-hidden="true">/</span>
                    <span>{formatStatusLabel(task.status)}</span>
                  </div>
                </div>

                <div className="relative h-9 rounded-lg bg-slate-100 ring-1 ring-inset ring-slate-200">
                  {ticks.map((tick) => (
                    <div
                      aria-hidden="true"
                      className="absolute inset-y-0 w-px bg-white"
                      key={`${task.id}-${tick.date.toISOString()}`}
                      style={{ left: `${tick.left}%` }}
                    />
                  ))}
                  <div
                    className={[
                      "absolute top-1/2 flex h-5 -translate-y-1/2 items-center rounded-full px-2 shadow-sm",
                      scheduleStatusBarClass(task.status),
                    ].join(" ")}
                    style={{
                      left: `${position.left}%`,
                      width: `${position.width}%`,
                    }}
                    title={`${task.title}: ${formatDateOnly(
                      task.plannedStartDate,
                    )} - ${formatDateOnly(task.plannedEndDate)}`}
                  >
                    <span className="truncate text-[11px] font-semibold text-white">
                      {task.priority}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
          <ScheduleLegendItem className="bg-slate-400" label="Todo" />
          <ScheduleLegendItem className="bg-sky-700" label="In Progress" />
          <ScheduleLegendItem className="bg-emerald-600" label="Done" />
          <ScheduleLegendItem className="bg-red-600" label="Blocked" />
        </div>
      </div>
    </div>
  );
}

function ScheduleLegendItem({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${className}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function WorkflowStepLink({
  active,
  index,
  step,
}: {
  active: boolean;
  index: number;
  step: WorkflowStep;
}) {
  const Icon = step.icon;

  return (
    <Link
      className={[
        "group grid grid-cols-[28px_minmax(0,1fr)_auto] gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
        active
          ? "bg-sky-50 text-sky-950 ring-1 ring-sky-200"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
      ].join(" ")}
      href={step.href}
    >
      <span
        className={[
          "flex size-7 items-center justify-center rounded-full text-xs font-semibold",
          active
            ? "bg-sky-700 text-white"
            : step.status === "ready"
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              : "bg-slate-100 text-slate-500",
        ].join(" ")}
      >
        {index}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4" aria-hidden="true" />
          {step.label}
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">
          {step.description}
        </span>
      </span>
      <span className="flex items-start pt-0.5">
        <WorkflowStatusDot status={step.status} />
      </span>
    </Link>
  );
}

function WorkflowStatusDot({ status }: { status: WorkflowStepStatus }) {
  const className =
    status === "ready"
      ? "bg-emerald-500"
      : status === "warning"
        ? "bg-amber-500"
        : status === "blocked"
          ? "bg-red-500"
          : "bg-slate-300";

  return (
    <span
      aria-hidden="true"
      className={`mt-1 size-2 rounded-full ${className}`}
    />
  );
}

function MetricTile({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: MetricTone;
  value: ReactNode;
}) {
  return (
    <div
      className={[
        "rounded-lg border px-3 py-2",
        tone === "good"
          ? "border-emerald-200 bg-emerald-50"
          : tone === "warning"
            ? "border-amber-200 bg-amber-50"
            : tone === "bad"
              ? "border-red-200 bg-red-50"
              : "bg-slate-50",
      ].join(" ")}
    >
      <div className="text-[11px] font-medium uppercase tracking-normal text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-base font-semibold text-slate-950">
        {value}
      </div>
    </div>
  );
}

function ReadinessBadge({ status }: { status: ReadinessStatus }) {
  if (status === "blocked") {
    return <Badge variant="destructive">{formatReadinessLabel(status)}</Badge>;
  }

  if (status === "greenlight") {
    return (
      <Badge className="bg-emerald-50 text-emerald-700" variant="outline">
        {formatReadinessLabel(status)}
      </Badge>
    );
  }

  return (
    <Badge className="bg-amber-50 text-amber-700" variant="outline">
      {formatReadinessLabel(status)}
    </Badge>
  );
}

function sectionClass(
  activeStep: WorkflowStepId,
  ...stepsAndClassName: string[]
) {
  const className = stepsAndClassName.at(-1) ?? "";
  const steps = stepsAndClassName.slice(0, -1);

  return steps.includes(activeStep) ? className : "hidden";
}

function projectStepHref(
  projectId: string,
  step: WorkflowStepId,
  stageId?: string,
) {
  const params = new URLSearchParams({ step });

  if (stageId) {
    params.set("stageId", stageId);
  }

  return `/workspace/projects/${projectId}?${params.toString()}`;
}

function firstSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function readinessTone(status: ReadinessStatus): MetricTone {
  if (status === "greenlight") {
    return "good";
  }

  if (status === "blocked") {
    return "bad";
  }

  return "warning";
}

function readinessPercentFor(status: ReadinessStatus) {
  if (status === "greenlight") {
    return 78;
  }

  if (status === "blocked") {
    return 36;
  }

  return 64;
}

function overallHealthForReadiness(status: ReadinessStatus): {
  label: string;
  tone: MetricTone;
} {
  if (status === "greenlight") {
    return { label: "On Track", tone: "good" };
  }

  if (status === "blocked") {
    return { label: "Blocked", tone: "bad" };
  }

  return { label: "At Risk", tone: "warning" };
}

function riskLabelFor(issueCount: number): RiskLabel {
  if (issueCount <= 0) {
    return "Low";
  }

  if (issueCount <= 3) {
    return "Medium";
  }

  return "High";
}

function riskTone(risk: RiskLabel): MetricTone {
  if (risk === "Low") {
    return "good";
  }

  if (risk === "High") {
    return "bad";
  }

  return "warning";
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

function scheduleDateRange(tasks: ScheduleTask[]) {
  if (tasks.length === 0) {
    return null;
  }

  const starts = tasks.map((task) => startOfDate(task.plannedStartDate));
  const ends = tasks.map((task) => startOfDate(task.plannedEndDate));

  return {
    end: new Date(Math.max(...ends.map((date) => date.getTime()))),
    start: new Date(Math.min(...starts.map((date) => date.getTime()))),
  };
}

function scheduleRangeTicks(start: Date, end: Date) {
  const totalDays = Math.max(daysBetween(start, end), 1);
  const tickCount = totalDays < 7 ? 3 : 4;

  return Array.from({ length: tickCount }, (_, index) => {
    const left = (index / (tickCount - 1)) * 100;
    const date = new Date(start);
    date.setDate(start.getDate() + Math.round((totalDays * left) / 100));

    return { date, left };
  });
}

function scheduleTaskPosition(
  task: ScheduleTask,
  range: { end: Date; start: Date },
) {
  const totalDays = Math.max(daysBetween(range.start, range.end) + 1, 1);
  const taskStartOffset = Math.max(
    daysBetween(range.start, startOfDate(task.plannedStartDate)),
    0,
  );
  const taskDuration = Math.max(
    daysBetween(
      startOfDate(task.plannedStartDate),
      startOfDate(task.plannedEndDate),
    ) + 1,
    1,
  );
  const left = Math.min((taskStartOffset / totalDays) * 100, 96);
  const rawWidth = (taskDuration / totalDays) * 100;
  const width = Math.min(Math.max(rawWidth, 8), 100 - left);

  return { left, width };
}

function scheduleStatusBarClass(status: string) {
  if (status === "blocked") {
    return "bg-red-600";
  }

  if (status === "done") {
    return "bg-emerald-600";
  }

  if (status === "in_progress") {
    return "bg-sky-700";
  }

  return "bg-slate-400";
}

function startOfDate(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);

  return date;
}

function daysBetween(start: Date, end: Date) {
  const dayInMs = 24 * 60 * 60 * 1000;

  return Math.round(
    (startOfDate(end).getTime() - startOfDate(start).getTime()) / dayInMs,
  );
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
