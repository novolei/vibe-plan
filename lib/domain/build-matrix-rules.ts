import type { BuildQtyAllocation } from "@/db/schema";

export function assertBuildMatrixAllocationIsActive(
  allocation: Pick<BuildQtyAllocation, "deletedAt" | "status">,
) {
  if (allocation.deletedAt || allocation.status !== "active") {
    throw new Error("Build matrix entry requires an active allocation");
  }
}
