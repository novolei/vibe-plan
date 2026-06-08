import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAllocationChangeLogValues } from "@/lib/domain/allocation-change-logs";

describe("allocation change log values", () => {
  it("creates one audit row per changed allocation field", () => {
    const rows = buildAllocationChangeLogValues({
      actorUserId: "user-1",
      allocationId: "allocation-1",
      changes: [
        { afterValue: 12, beforeValue: 10, fieldName: "allocated_qty" },
        {
          afterValue: "Need extra firmware units",
          beforeValue: "Initial request",
          fieldName: "rationale",
        },
        { afterValue: "active", beforeValue: "active", fieldName: "status" },
      ],
      configProfileId: "profile-1",
      projectId: "project-1",
      reason: "Planner update",
      stageId: "stage-1",
    });

    assert.deepEqual(
      rows.map((row) => ({
        afterValue: row.afterValue,
        beforeValue: row.beforeValue,
        fieldName: row.fieldName,
      })),
      [
        { afterValue: 12, beforeValue: 10, fieldName: "allocated_qty" },
        {
          afterValue: "Need extra firmware units",
          beforeValue: "Initial request",
          fieldName: "rationale",
        },
      ],
    );
    assert.equal(rows[0]?.actorUserId, "user-1");
    assert.equal(rows[0]?.buildQtyAllocationId, "allocation-1");
    assert.equal(rows[0]?.reason, "Planner update");
  });

  it("does not create audit rows when submitted values are unchanged", () => {
    const rows = buildAllocationChangeLogValues({
      actorUserId: "user-1",
      allocationId: "allocation-1",
      changes: [
        { afterValue: 10, beforeValue: 10, fieldName: "allocated_qty" },
        { afterValue: "same", beforeValue: "same", fieldName: "rationale" },
      ],
      configProfileId: "profile-1",
      projectId: "project-1",
      reason: "No-op save",
      stageId: "stage-1",
    });

    assert.deepEqual(rows, []);
  });
});
