import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { e2ePool } from "@/tests/e2e/test-db";
import {
  deleteProjectFixture,
  seedMvpWorkflowFixture,
} from "@/tests/e2e/workspace-fixtures";

describe("MVP workflow fixture", () => {
  after(async () => {
    await e2ePool.end();
  });

  it("creates the Project -> Stage -> Demand -> Profile -> Mapping -> Allocation records used by the walkthrough", async (t) => {
    const fixture = await seedMvpWorkflowFixture();

    t.after(async () => {
      await deleteProjectFixture(fixture.project.id);
    });

    assert.equal(fixture.project.name.startsWith("MVP Walkthrough"), true);
    assert.equal(fixture.stage.name, "EVT");
    assert.equal(fixture.demand.requestedQty, 12);
    assert.equal(fixture.profile.productRevision, "A0");
    assert.equal(fixture.mapping.contributionQty, 12);
    assert.equal(fixture.allocation.allocatedQty, 10);
  });
});
