export type AllocationChange = {
  afterValue: unknown;
  beforeValue: unknown;
  fieldName: string;
};

export type AllocationChangeLogValue = {
  actorUserId: string;
  afterValue: unknown;
  beforeValue: unknown;
  buildQtyAllocationId: string;
  buildStageId: string;
  configProfileId: string;
  fieldName: string;
  projectId: string;
  reason: string;
};

export function buildAllocationChangeLogValues(input: {
  actorUserId: string;
  allocationId: string;
  changes: AllocationChange[];
  configProfileId: string;
  projectId: string;
  reason: string;
  stageId: string;
}): AllocationChangeLogValue[] {
  return input.changes
    .filter((change) => !Object.is(change.beforeValue, change.afterValue))
    .map((change) => ({
      actorUserId: input.actorUserId,
      afterValue: change.afterValue,
      beforeValue: change.beforeValue,
      buildQtyAllocationId: input.allocationId,
      buildStageId: input.stageId,
      configProfileId: input.configProfileId,
      fieldName: change.fieldName,
      projectId: input.projectId,
      reason: input.reason,
    }));
}
