import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPlanningWarnings } from "@/lib/domain/planning-rules";

describe("planning quantity warnings", () => {
  it("warns when a demand is under-mapped or over-mapped", () => {
    const underMapped = buildPlanningWarnings({
      allocations: [],
      demands: [{ id: "demand-1", requestedQty: 10, team: "EE" }],
      mappings: [
        {
          configProfileId: "profile-1",
          contributionQty: 6,
          functionalTeamDemandId: "demand-1",
        },
      ],
      profiles: [],
    });

    assert.equal(underMapped[0]?.title, "Demand is under-mapped");
    assert.equal(underMapped[0]?.detail, "EE requested 10, mapped 6.");

    const overMapped = buildPlanningWarnings({
      allocations: [],
      demands: [{ id: "demand-2", requestedQty: 4, team: "SW/FW" }],
      mappings: [
        {
          configProfileId: "profile-1",
          contributionQty: 7,
          functionalTeamDemandId: "demand-2",
        },
      ],
      profiles: [],
    });

    assert.equal(overMapped[0]?.title, "Demand is over-mapped");
    assert.equal(overMapped[0]?.detail, "SW/FW requested 4, mapped 7.");
  });

  it("warns when active allocation does not match mapped profile demand", () => {
    const belowMapped = buildPlanningWarnings({
      allocations: [
        { allocatedQty: 5, configProfileId: "profile-1", status: "active" },
      ],
      demands: [],
      mappings: [
        {
          configProfileId: "profile-1",
          contributionQty: 8,
          functionalTeamDemandId: "demand-1",
        },
      ],
      profiles: [
        {
          id: "profile-1",
          productRevision: "A0",
          testPurpose: "Bring-up",
        },
      ],
    });

    assert.equal(belowMapped[0]?.title, "Allocation is below mapped demand");
    assert.equal(
      belowMapped[0]?.detail,
      "A0 / Bring-up mapped 8, allocated 5.",
    );

    const aboveMapped = buildPlanningWarnings({
      allocations: [
        { allocatedQty: 12, configProfileId: "profile-1", status: "active" },
      ],
      demands: [],
      mappings: [
        {
          configProfileId: "profile-1",
          contributionQty: 8,
          functionalTeamDemandId: "demand-1",
        },
      ],
      profiles: [
        {
          id: "profile-1",
          productRevision: "A0",
          testPurpose: "Bring-up",
        },
      ],
    });

    assert.equal(aboveMapped[0]?.title, "Allocation exceeds mapped demand");
  });

  it("returns an aligned info signal when mapped demand matches active allocation", () => {
    const warnings = buildPlanningWarnings({
      allocations: [
        { allocatedQty: 10, configProfileId: "profile-1", status: "active" },
        { allocatedQty: 99, configProfileId: "profile-1", status: "on_hold" },
      ],
      demands: [{ id: "demand-1", requestedQty: 10, team: "MFG" }],
      mappings: [
        {
          configProfileId: "profile-1",
          contributionQty: 10,
          functionalTeamDemandId: "demand-1",
        },
      ],
      profiles: [
        {
          id: "profile-1",
          productRevision: "A0",
          testPurpose: "Line trial",
        },
      ],
    });

    assert.deepEqual(warnings, [
      {
        detail: "Mapped demand and active allocations are currently aligned.",
        id: "planning-aligned",
        severity: "info",
        title: "Planning quantities aligned",
      },
    ]);
  });
});
