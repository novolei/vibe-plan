export type ScheduleDependencyType =
  | "finish_to_finish"
  | "finish_to_start"
  | "start_to_finish"
  | "start_to_start";
export type ScheduleTaskStatus =
  | "blocked"
  | "canceled"
  | "done"
  | "in_progress"
  | "todo";

export type ScheduleWarning = {
  detail: string;
  id: string;
  severity: "info" | "warning";
  title: string;
};

export function hasFinishToStartConflict(input: {
  lagDays: number;
  predecessorEndDate: Date;
  successorStartDate: Date;
}) {
  const earliestStart = new Date(input.predecessorEndDate);
  earliestStart.setDate(earliestStart.getDate() + input.lagDays);

  return input.successorStartDate < earliestStart;
}

export function assertScheduleTaskHasActiveLink(
  links: Array<{ deletedAt: Date | null }>,
) {
  if (!links.some((link) => link.deletedAt === null)) {
    throw new Error("Schedule task requires at least one active planning link");
  }
}

export function buildScheduleDependencyWarnings(input: {
  dependencies: Array<{
    dependencyType: ScheduleDependencyType;
    id: string;
    lagDays: number;
    predecessorTaskId: string;
    successorTaskId: string;
  }>;
  tasks: Array<{
    id: string;
    plannedEndDate: Date;
    plannedStartDate: Date;
    title: string;
  }>;
}): ScheduleWarning[] {
  const taskById = new Map(input.tasks.map((task) => [task.id, task]));

  return input.dependencies.flatMap((dependency) => {
    if (dependency.dependencyType !== "finish_to_start") {
      return [];
    }

    const predecessor = taskById.get(dependency.predecessorTaskId);
    const successor = taskById.get(dependency.successorTaskId);

    if (!predecessor || !successor) {
      return [];
    }

    if (
      !hasFinishToStartConflict({
        lagDays: dependency.lagDays,
        predecessorEndDate: predecessor.plannedEndDate,
        successorStartDate: successor.plannedStartDate,
      })
    ) {
      return [];
    }

    return [
      {
        detail: `${successor.title} starts before ${predecessor.title} finishes with ${dependency.lagDays} lag day(s).`,
        id: `finish-to-start-conflict-${dependency.id}`,
        severity: "warning" as const,
        title: "Finish-to-start dependency conflict",
      },
    ];
  });
}
