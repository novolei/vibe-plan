export type ReadinessStatus = "at_risk" | "blocked" | "greenlight";
export type BlockerStatus =
  | "accepted_risk"
  | "mitigating"
  | "open"
  | "resolved";
export type ReadinessTargetType =
  | "build_matrix_entry"
  | "build_stage"
  | "project";

export type ReadinessWarning = {
  detail: string;
  id: string;
  severity: "info" | "warning";
  title: string;
};

export function computeWorstChildReadiness(
  statuses: ReadinessStatus[],
): ReadinessStatus {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("at_risk")) {
    return "at_risk";
  }

  return "greenlight";
}

export function buildReadinessWarnings(input: {
  blockers: Array<{
    id: string;
    readinessSignalId: string | null;
    status: BlockerStatus;
    title: string;
  }>;
  readinessSignals: Array<{
    id: string;
    status: ReadinessStatus;
    summary: string;
  }>;
}): ReadinessWarning[] {
  const activeBlockersBySignalId = new Map<string, number>();

  for (const blocker of input.blockers) {
    if (
      blocker.readinessSignalId &&
      (blocker.status === "open" || blocker.status === "mitigating")
    ) {
      activeBlockersBySignalId.set(
        blocker.readinessSignalId,
        (activeBlockersBySignalId.get(blocker.readinessSignalId) ?? 0) + 1,
      );
    }
  }

  return input.readinessSignals
    .filter(
      (signal) =>
        signal.status === "blocked" && !activeBlockersBySignalId.has(signal.id),
    )
    .map((signal) => ({
      detail: `${signal.summary || "Blocked readiness signal"} needs an open blocker or manual override rationale.`,
      id: `blocked-signal-without-blocker-${signal.id}`,
      severity: "warning" as const,
      title: "Blocked signal has no active blocker",
    }));
}
