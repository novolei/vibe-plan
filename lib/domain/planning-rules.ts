export type PlanningWarning = {
  detail: string;
  id: string;
  severity: "info" | "warning";
  title: string;
};

type AllocationRecord = {
  allocatedQty: number;
  configProfileId: string;
  status: string;
};

type DemandRecord = {
  id: string;
  requestedQty: number;
  team: string;
};

type MappingRecord = {
  configProfileId: string;
  contributionQty: number;
  functionalTeamDemandId: string;
};

type ProfileRecord = {
  id: string;
  productRevision: string;
  testPurpose: string;
};

export function buildPlanningWarnings(input: {
  allocations: AllocationRecord[];
  demands: DemandRecord[];
  mappings: MappingRecord[];
  profiles: ProfileRecord[];
}): PlanningWarning[] {
  const warnings: PlanningWarning[] = [];
  const activeAllocationByProfileId = new Map(
    input.allocations
      .filter((allocation) => allocation.status === "active")
      .map((allocation) => [allocation.configProfileId, allocation]),
  );

  for (const demand of input.demands) {
    const mappedQty = input.mappings
      .filter((mapping) => mapping.functionalTeamDemandId === demand.id)
      .reduce((sum, mapping) => sum + mapping.contributionQty, 0);

    if (mappedQty !== demand.requestedQty) {
      warnings.push({
        detail: `${demand.team} requested ${demand.requestedQty}, mapped ${mappedQty}.`,
        id: `demand-${demand.id}-mapped-qty`,
        severity: "warning",
        title:
          mappedQty > demand.requestedQty
            ? "Demand is over-mapped"
            : "Demand is under-mapped",
      });
    }
  }

  for (const profile of input.profiles) {
    const mappedQty = input.mappings
      .filter((mapping) => mapping.configProfileId === profile.id)
      .reduce((sum, mapping) => sum + mapping.contributionQty, 0);
    const allocatedQty =
      activeAllocationByProfileId.get(profile.id)?.allocatedQty ?? 0;

    if (mappedQty !== allocatedQty) {
      warnings.push({
        detail: `${profile.productRevision} / ${profile.testPurpose} mapped ${mappedQty}, allocated ${allocatedQty}.`,
        id: `profile-${profile.id}-allocated-qty`,
        severity: "warning",
        title:
          allocatedQty > mappedQty
            ? "Allocation exceeds mapped demand"
            : "Allocation is below mapped demand",
      });
    }
  }

  if (warnings.length === 0 && input.profiles.length > 0) {
    warnings.push({
      detail: "Mapped demand and active allocations are currently aligned.",
      id: "planning-aligned",
      severity: "info",
      title: "Planning quantities aligned",
    });
  }

  return warnings;
}
