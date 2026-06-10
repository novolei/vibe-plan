"use client";

import { useActionState } from "react";

import {
  createBlockerAction,
  createBuildMatrixEntryAction,
  createBuildStageAction,
  createConfigProfileAction,
  createDemandProfileMappingAction,
  createFunctionalTeamDemandAction,
  createProjectAction,
  createReadinessSignalAction,
  createReadinessSignoffAction,
  createScheduleDependencyAction,
  createScheduleTaskAction,
  generateStageSummaryProposalAction,
  reviewAiProposalAction,
  type WorkspaceActionState,
  upsertBuildQtyAllocationAction,
} from "@/app/workspace/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Option = {
  label: string;
  value: string;
};

type ProjectScopedFormProps = {
  projectId: string;
};

const selectClassName =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

const initialWorkspaceActionState: WorkspaceActionState = {
  message: "",
  status: "idle",
};

export function ProjectCreateForm() {
  const [state, action, pending] = useActionState(
    createProjectAction,
    initialWorkspaceActionState,
  );

  return (
    <form action={action} className="flex flex-col gap-4" key={formKey(state)}>
      <Input
        aria-describedby={fieldErrorId("name")}
        aria-invalid={hasFieldError(state, "name")}
        defaultValue={valueFor(state, "name")}
        name="name"
        placeholder="Project name"
        required
      />
      <FieldError name="name" state={state} />
      <Textarea
        aria-describedby={fieldErrorId("description")}
        aria-invalid={hasFieldError(state, "description")}
        defaultValue={valueFor(state, "description")}
        name="description"
        placeholder="Project description"
        required
      />
      <FieldError name="description" state={state} />
      <SubmitButton pending={pending}>Create project</SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}

export function BuildStageForm({ projectId }: ProjectScopedFormProps) {
  const [state, action, pending] = useActionState(
    createBuildStageAction,
    initialWorkspaceActionState,
  );

  return (
    <form action={action} className="flex flex-col gap-4" key={formKey(state)}>
      <input name="projectId" type="hidden" value={projectId} />
      <Input
        aria-describedby={fieldErrorId("name")}
        aria-invalid={hasFieldError(state, "name")}
        defaultValue={valueFor(state, "name")}
        name="name"
        placeholder="Stage name, e.g. EVT"
        required
      />
      <FieldError name="name" state={state} />
      <Input
        aria-describedby={fieldErrorId("goal")}
        aria-invalid={hasFieldError(state, "goal")}
        defaultValue={valueFor(state, "goal")}
        name="goal"
        placeholder="Stage goal"
        required
      />
      <FieldError name="goal" state={state} />
      <Textarea
        aria-describedby={fieldErrorId("description")}
        aria-invalid={hasFieldError(state, "description")}
        defaultValue={valueFor(state, "description")}
        name="description"
        placeholder="Stage description"
        required
      />
      <FieldError name="description" state={state} />
      <Input
        defaultValue={valueFor(state, "templateSource")}
        name="templateSource"
        placeholder="Template source, optional"
      />
      <SubmitButton pending={pending}>Create stage</SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}

export function FunctionalTeamDemandForm({
  defaultStageId,
  projectId,
  stageOptions,
}: ProjectScopedFormProps & {
  defaultStageId?: string;
  stageOptions: Option[];
}) {
  const [state, action, pending] = useActionState(
    createFunctionalTeamDemandAction,
    initialWorkspaceActionState,
  );
  const disabled = stageOptions.length === 0;

  return (
    <form
      action={action}
      className="grid gap-3 sm:grid-cols-2"
      key={formKey(state)}
    >
      <input name="projectId" type="hidden" value={projectId} />
      <SelectField
        disabled={disabled}
        name="buildStageId"
        options={stageOptions}
        placeholder="Build stage"
        preferredValue={defaultStageId}
        state={state}
      />
      <Input
        aria-describedby={fieldErrorId("team")}
        aria-invalid={hasFieldError(state, "team")}
        defaultValue={valueFor(state, "team")}
        name="team"
        placeholder="Team, e.g. EE"
        required
      />
      <FieldError name="buildStageId" state={state} />
      <FieldError name="team" state={state} />
      <Input
        aria-describedby={fieldErrorId("purpose")}
        aria-invalid={hasFieldError(state, "purpose")}
        defaultValue={valueFor(state, "purpose")}
        name="purpose"
        placeholder="Purpose"
        required
      />
      <Input
        aria-describedby={fieldErrorId("requestedQty")}
        aria-invalid={hasFieldError(state, "requestedQty")}
        defaultValue={valueFor(state, "requestedQty")}
        min={0}
        name="requestedQty"
        placeholder="Requested qty"
        required
        type="number"
      />
      <FieldError name="purpose" state={state} />
      <FieldError name="requestedQty" state={state} />
      <Input
        aria-describedby={fieldErrorId("priority")}
        aria-invalid={hasFieldError(state, "priority")}
        defaultValue={valueFor(state, "priority")}
        name="priority"
        placeholder="Priority"
        required
      />
      <Input
        defaultValue={valueFor(state, "notes")}
        name="notes"
        placeholder="Notes"
      />
      <FieldError name="priority" state={state} />
      <div />
      <SubmitButton
        className="sm:col-span-2"
        disabled={disabled}
        pending={pending}
      >
        Add demand
      </SubmitButton>
      <ActionMessage className="sm:col-span-2" state={state} />
    </form>
  );
}

export function ConfigProfileForm({
  defaultStageId,
  projectId,
  stageOptions,
}: ProjectScopedFormProps & {
  defaultStageId?: string;
  stageOptions: Option[];
}) {
  const [state, action, pending] = useActionState(
    createConfigProfileAction,
    initialWorkspaceActionState,
  );
  const disabled = stageOptions.length === 0;

  return (
    <form
      action={action}
      className="grid gap-3 sm:grid-cols-2"
      key={formKey(state)}
    >
      <input name="projectId" type="hidden" value={projectId} />
      <SelectField
        disabled={disabled}
        name="buildStageId"
        options={stageOptions}
        placeholder="Build stage"
        preferredValue={defaultStageId}
        state={state}
      />
      <Input
        aria-describedby={fieldErrorId("productRevision")}
        aria-invalid={hasFieldError(state, "productRevision")}
        defaultValue={valueFor(state, "productRevision")}
        name="productRevision"
        placeholder="Product revision"
        required
      />
      <FieldError name="buildStageId" state={state} />
      <FieldError name="productRevision" state={state} />
      <Input
        aria-describedby={fieldErrorId("testPurpose")}
        aria-invalid={hasFieldError(state, "testPurpose")}
        defaultValue={valueFor(state, "testPurpose")}
        name="testPurpose"
        placeholder="Test purpose"
        required
      />
      <Input
        aria-describedby={fieldErrorId("marketOrRegion")}
        aria-invalid={hasFieldError(state, "marketOrRegion")}
        defaultValue={valueFor(state, "marketOrRegion")}
        name="marketOrRegion"
        placeholder="Market or region"
        required
      />
      <FieldError name="testPurpose" state={state} />
      <FieldError name="marketOrRegion" state={state} />
      <Input
        aria-describedby={fieldErrorId("variant")}
        aria-invalid={hasFieldError(state, "variant")}
        defaultValue={valueFor(state, "variant")}
        name="variant"
        placeholder="Variant"
        required
      />
      <Input
        aria-describedby={fieldErrorId("processVariant")}
        aria-invalid={hasFieldError(state, "processVariant")}
        defaultValue={valueFor(state, "processVariant")}
        name="processVariant"
        placeholder="Process variant"
        required
      />
      <FieldError name="variant" state={state} />
      <FieldError name="processVariant" state={state} />
      <Input
        aria-describedby={fieldErrorId("materialVariant")}
        aria-invalid={hasFieldError(state, "materialVariant")}
        defaultValue={valueFor(state, "materialVariant")}
        name="materialVariant"
        placeholder="Material variant"
        required
      />
      <div />
      <FieldError name="materialVariant" state={state} />
      <div />
      <SubmitButton
        className="sm:col-span-2"
        disabled={disabled}
        pending={pending}
      >
        Add profile
      </SubmitButton>
      <ActionMessage className="sm:col-span-2" state={state} />
    </form>
  );
}

export function DemandProfileMappingForm({
  demandOptions,
  profileOptions,
  projectId,
}: ProjectScopedFormProps & {
  demandOptions: Option[];
  profileOptions: Option[];
}) {
  const [state, action, pending] = useActionState(
    createDemandProfileMappingAction,
    initialWorkspaceActionState,
  );
  const disabled = demandOptions.length === 0 || profileOptions.length === 0;

  return (
    <form action={action} className="grid gap-3" key={formKey(state)}>
      <input name="projectId" type="hidden" value={projectId} />
      <SelectField
        disabled={demandOptions.length === 0}
        name="functionalTeamDemandId"
        options={demandOptions}
        placeholder="Demand"
        state={state}
      />
      <FieldError name="functionalTeamDemandId" state={state} />
      <SelectField
        disabled={profileOptions.length === 0}
        name="configProfileId"
        options={profileOptions}
        placeholder="Config profile"
        state={state}
      />
      <FieldError name="configProfileId" state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          aria-describedby={fieldErrorId("contributionQty")}
          aria-invalid={hasFieldError(state, "contributionQty")}
          defaultValue={valueFor(state, "contributionQty")}
          min={0}
          name="contributionQty"
          placeholder="Contribution qty"
          required
          type="number"
        />
        <Input
          aria-describedby={fieldErrorId("weight")}
          aria-invalid={hasFieldError(state, "weight")}
          defaultValue={valueFor(state, "weight")}
          min={0}
          name="weight"
          placeholder="Weight"
          type="number"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldError name="contributionQty" state={state} />
        <FieldError name="weight" state={state} />
      </div>
      <Input
        defaultValue={valueFor(state, "rationale")}
        name="rationale"
        placeholder="Rationale"
      />
      <SubmitButton disabled={disabled} pending={pending}>
        Add mapping
      </SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}

export function BuildQtyAllocationForm({
  profileOptions,
  projectId,
}: ProjectScopedFormProps & {
  profileOptions: Option[];
}) {
  const [state, action, pending] = useActionState(
    upsertBuildQtyAllocationAction,
    initialWorkspaceActionState,
  );
  const disabled = profileOptions.length === 0;

  return (
    <form action={action} className="grid gap-3" key={formKey(state)}>
      <input name="projectId" type="hidden" value={projectId} />
      <SelectField
        disabled={disabled}
        name="configProfileId"
        options={profileOptions}
        placeholder="Config profile"
        state={state}
      />
      <FieldError name="configProfileId" state={state} />
      <Input
        aria-describedby={fieldErrorId("allocatedQty")}
        aria-invalid={hasFieldError(state, "allocatedQty")}
        defaultValue={valueFor(state, "allocatedQty")}
        min={0}
        name="allocatedQty"
        placeholder="Allocated qty"
        required
        type="number"
      />
      <FieldError name="allocatedQty" state={state} />
      <Input
        defaultValue={valueFor(state, "rationale")}
        name="rationale"
        placeholder="Rationale"
      />
      <SubmitButton disabled={disabled} pending={pending}>
        Set allocation
      </SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}

export function BuildMatrixEntryForm({
  allocationOptions,
  projectId,
}: ProjectScopedFormProps & {
  allocationOptions: Option[];
}) {
  const [state, action, pending] = useActionState(
    createBuildMatrixEntryAction,
    initialWorkspaceActionState,
  );
  const disabled = allocationOptions.length === 0;

  return (
    <form
      action={action}
      className="grid gap-3 sm:grid-cols-2"
      key={formKey(state)}
    >
      <input name="projectId" type="hidden" value={projectId} />
      <SelectField
        disabled={disabled}
        name="buildQtyAllocationId"
        options={allocationOptions}
        placeholder="Allocation"
        state={state}
      />
      <SelectField
        disabled={disabled}
        name="readinessStatus"
        options={[
          { label: "Greenlight", value: "greenlight" },
          { label: "At Risk", value: "at_risk" },
          { label: "Blocked", value: "blocked" },
        ]}
        placeholder="Readiness"
        state={state}
      />
      <FieldError name="buildQtyAllocationId" state={state} />
      <FieldError name="readinessStatus" state={state} />
      <Input
        aria-describedby={fieldErrorId("buildProcessRoute")}
        aria-invalid={hasFieldError(state, "buildProcessRoute")}
        defaultValue={valueFor(state, "buildProcessRoute")}
        name="buildProcessRoute"
        placeholder="Build process route"
        required
      />
      <Input
        aria-describedby={fieldErrorId("keyMaterialVariant")}
        aria-invalid={hasFieldError(state, "keyMaterialVariant")}
        defaultValue={valueFor(state, "keyMaterialVariant")}
        name="keyMaterialVariant"
        placeholder="Key material variant"
        required
      />
      <FieldError name="buildProcessRoute" state={state} />
      <FieldError name="keyMaterialVariant" state={state} />
      <Input
        defaultValue={valueFor(state, "processOwnerTeam")}
        name="processOwnerTeam"
        placeholder="Process owner team"
      />
      <Input
        defaultValue={valueFor(state, "materialOwnerTeam")}
        name="materialOwnerTeam"
        placeholder="Material owner team"
      />
      <Textarea
        className="sm:col-span-2"
        defaultValue={valueFor(state, "notes")}
        name="notes"
        placeholder="Matrix notes"
      />
      <SubmitButton
        className="sm:col-span-2"
        disabled={disabled}
        pending={pending}
      >
        Save matrix entry
      </SubmitButton>
      <ActionMessage className="sm:col-span-2" state={state} />
    </form>
  );
}

export function AIGenerateStageSummaryForm({
  defaultStageId,
  projectId,
  stageOptions,
}: ProjectScopedFormProps & {
  defaultStageId?: string;
  stageOptions: Option[];
}) {
  const [state, action, pending] = useActionState(
    generateStageSummaryProposalAction,
    initialWorkspaceActionState,
  );
  const disabled = stageOptions.length === 0;

  return (
    <form action={action} className="grid gap-3" key={formKey(state)}>
      <input name="projectId" type="hidden" value={projectId} />
      <SelectField
        disabled={disabled}
        name="buildStageId"
        options={stageOptions}
        placeholder="Build stage"
        preferredValue={defaultStageId}
        state={state}
      />
      <FieldError name="buildStageId" state={state} />
      <SubmitButton disabled={disabled} pending={pending}>
        Generate summary proposal
      </SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}

export function AIProposalReviewForm({
  projectId,
  proposalId,
}: ProjectScopedFormProps & {
  proposalId: string;
}) {
  const [state, action, pending] = useActionState(
    reviewAiProposalAction,
    initialWorkspaceActionState,
  );

  return (
    <form action={action} className="grid gap-3" key={formKey(state)}>
      <input name="projectId" type="hidden" value={projectId} />
      <input name="proposalId" type="hidden" value={proposalId} />
      <Textarea
        defaultValue={valueFor(state, "reviewNotes")}
        name="reviewNotes"
        placeholder="Review notes"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending}
          name="disposition"
          type="submit"
          value="accepted"
        >
          Accept
        </Button>
        <Button
          disabled={pending}
          name="disposition"
          type="submit"
          value="rejected"
          variant="outline"
        >
          Reject
        </Button>
        <Button
          disabled={pending}
          name="disposition"
          type="submit"
          value="revised"
          variant="secondary"
        >
          Revise
        </Button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

export function ReadinessSignalForm({
  projectId,
  targetOptions,
}: ProjectScopedFormProps & {
  targetOptions: Option[];
}) {
  const [state, action, pending] = useActionState(
    createReadinessSignalAction,
    initialWorkspaceActionState,
  );
  const disabled = targetOptions.length === 0;

  return (
    <form
      action={action}
      className="grid gap-3 sm:grid-cols-2"
      key={formKey(state)}
    >
      <input name="projectId" type="hidden" value={projectId} />
      <SelectField
        disabled={disabled}
        name="targetKey"
        options={targetOptions}
        placeholder="Readiness target"
        state={state}
      />
      <SelectField
        disabled={disabled}
        name="status"
        options={[
          { label: "Greenlight", value: "greenlight" },
          { label: "At Risk", value: "at_risk" },
          { label: "Blocked", value: "blocked" },
        ]}
        placeholder="Readiness"
        state={state}
      />
      <FieldError name="targetKey" state={state} />
      <FieldError name="status" state={state} />
      <Input
        aria-describedby={fieldErrorId("summary")}
        aria-invalid={hasFieldError(state, "summary")}
        className="sm:col-span-2"
        defaultValue={valueFor(state, "summary")}
        name="summary"
        placeholder="Readiness summary"
        required
      />
      <FieldError className="sm:col-span-2" name="summary" state={state} />
      <Input
        defaultValue={valueFor(state, "ownerTeam")}
        name="ownerTeam"
        placeholder="Owner team"
      />
      <Input
        defaultValue={valueFor(state, "rationale")}
        name="rationale"
        placeholder="Rationale"
      />
      <SubmitButton
        className="sm:col-span-2"
        disabled={disabled}
        pending={pending}
      >
        Save readiness signal
      </SubmitButton>
      <ActionMessage className="sm:col-span-2" state={state} />
    </form>
  );
}

export function BlockerForm({
  projectId,
  readinessSignalOptions,
  targetOptions,
}: ProjectScopedFormProps & {
  readinessSignalOptions: Option[];
  targetOptions: Option[];
}) {
  const [state, action, pending] = useActionState(
    createBlockerAction,
    initialWorkspaceActionState,
  );
  const disabled = targetOptions.length === 0;

  return (
    <form
      action={action}
      className="grid gap-3 sm:grid-cols-2"
      key={formKey(state)}
    >
      <input name="projectId" type="hidden" value={projectId} />
      <SelectField
        disabled={disabled}
        name="targetKey"
        options={targetOptions}
        placeholder="Blocker target"
        state={state}
      />
      <SelectField
        disabled={disabled}
        name="readinessSignalId"
        options={readinessSignalOptions}
        placeholder="Linked readiness signal"
        required={false}
        state={state}
      />
      <FieldError name="targetKey" state={state} />
      <FieldError name="readinessSignalId" state={state} />
      <Input
        aria-describedby={fieldErrorId("title")}
        aria-invalid={hasFieldError(state, "title")}
        defaultValue={valueFor(state, "title")}
        name="title"
        placeholder="Blocker title"
        required
      />
      <SelectField
        disabled={disabled}
        name="status"
        options={[
          { label: "Open", value: "open" },
          { label: "Mitigating", value: "mitigating" },
          { label: "Resolved", value: "resolved" },
          { label: "Accepted Risk", value: "accepted_risk" },
        ]}
        placeholder="Blocker status"
        state={state}
      />
      <FieldError name="title" state={state} />
      <FieldError name="status" state={state} />
      <Input
        aria-describedby={fieldErrorId("severity")}
        aria-invalid={hasFieldError(state, "severity")}
        defaultValue={valueFor(state, "severity")}
        name="severity"
        placeholder="Severity"
        required
      />
      <Input
        aria-describedby={fieldErrorId("ownerTeam")}
        aria-invalid={hasFieldError(state, "ownerTeam")}
        defaultValue={valueFor(state, "ownerTeam")}
        name="ownerTeam"
        placeholder="Owner team"
        required
      />
      <FieldError name="severity" state={state} />
      <FieldError name="ownerTeam" state={state} />
      <Input
        aria-describedby={fieldErrorId("impact")}
        aria-invalid={hasFieldError(state, "impact")}
        defaultValue={valueFor(state, "impact")}
        name="impact"
        placeholder="Impact"
        required
      />
      <Input
        defaultValue={valueFor(state, "dueDate")}
        name="dueDate"
        type="date"
      />
      <FieldError name="impact" state={state} />
      <FieldError name="dueDate" state={state} />
      <Textarea
        className="sm:col-span-2"
        defaultValue={valueFor(state, "mitigation")}
        name="mitigation"
        placeholder="Mitigation"
      />
      <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
        <input
          defaultChecked={valueFor(state, "decisionNeeded") === "on"}
          name="decisionNeeded"
          type="checkbox"
        />
        Decision needed
      </label>
      <SubmitButton
        className="sm:col-span-2"
        disabled={disabled}
        pending={pending}
      >
        Save blocker
      </SubmitButton>
      <ActionMessage className="sm:col-span-2" state={state} />
    </form>
  );
}

export function ReadinessSignoffForm({
  projectId,
  readinessSignalOptions,
}: ProjectScopedFormProps & {
  readinessSignalOptions: Option[];
}) {
  const [state, action, pending] = useActionState(
    createReadinessSignoffAction,
    initialWorkspaceActionState,
  );
  const disabled = readinessSignalOptions.length === 0;

  return (
    <form
      action={action}
      className="grid gap-3 sm:grid-cols-2"
      key={formKey(state)}
    >
      <input name="projectId" type="hidden" value={projectId} />
      <SelectField
        disabled={disabled}
        name="readinessSignalId"
        options={readinessSignalOptions}
        placeholder="Readiness signal"
        state={state}
      />
      <SelectField
        disabled={disabled}
        name="disposition"
        options={[
          { label: "Approve", value: "approved" },
          { label: "Accept Risk", value: "accepted_risk" },
          { label: "Reject", value: "rejected" },
        ]}
        placeholder="Disposition"
        state={state}
      />
      <FieldError name="readinessSignalId" state={state} />
      <FieldError name="disposition" state={state} />
      <Textarea
        className="sm:col-span-2"
        defaultValue={valueFor(state, "notes")}
        name="notes"
        placeholder="Signoff notes"
      />
      <SubmitButton
        className="sm:col-span-2"
        disabled={disabled}
        pending={pending}
      >
        Save signoff
      </SubmitButton>
      <ActionMessage className="sm:col-span-2" state={state} />
    </form>
  );
}

export function ScheduleTaskForm({
  defaultStageId,
  linkedObjectOptions,
  projectId,
  stageOptions,
}: ProjectScopedFormProps & {
  defaultStageId?: string;
  linkedObjectOptions: Option[];
  stageOptions: Option[];
}) {
  const [state, action, pending] = useActionState(
    createScheduleTaskAction,
    initialWorkspaceActionState,
  );
  const disabled =
    stageOptions.length === 0 || linkedObjectOptions.length === 0;

  return (
    <form
      action={action}
      className="grid gap-3 sm:grid-cols-2"
      key={formKey(state)}
    >
      <input name="projectId" type="hidden" value={projectId} />
      <SelectField
        disabled={stageOptions.length === 0}
        name="buildStageId"
        options={stageOptions}
        placeholder="Build stage"
        preferredValue={defaultStageId}
        state={state}
      />
      <SelectField
        disabled={linkedObjectOptions.length === 0}
        name="linkedObjectKey"
        options={linkedObjectOptions}
        placeholder="Linked object"
        state={state}
      />
      <FieldError name="buildStageId" state={state} />
      <FieldError name="linkedObjectKey" state={state} />
      <Input
        aria-describedby={fieldErrorId("title")}
        aria-invalid={hasFieldError(state, "title")}
        defaultValue={valueFor(state, "title")}
        name="title"
        placeholder="Task title"
        required
      />
      <Input
        aria-describedby={fieldErrorId("priority")}
        aria-invalid={hasFieldError(state, "priority")}
        defaultValue={valueFor(state, "priority") || "normal"}
        name="priority"
        placeholder="Priority"
        required
      />
      <FieldError name="title" state={state} />
      <FieldError name="priority" state={state} />
      <SelectField
        disabled={disabled}
        name="status"
        options={[
          { label: "Todo", value: "todo" },
          { label: "In Progress", value: "in_progress" },
          { label: "Done", value: "done" },
          { label: "Blocked", value: "blocked" },
          { label: "Canceled", value: "canceled" },
        ]}
        placeholder="Task status"
        state={state}
      />
      <Input
        aria-describedby={fieldErrorId("plannedStartDate")}
        aria-invalid={hasFieldError(state, "plannedStartDate")}
        defaultValue={valueFor(state, "plannedStartDate")}
        name="plannedStartDate"
        required
        type="date"
      />
      <FieldError name="status" state={state} />
      <FieldError name="plannedStartDate" state={state} />
      <Input
        aria-describedby={fieldErrorId("plannedEndDate")}
        aria-invalid={hasFieldError(state, "plannedEndDate")}
        defaultValue={valueFor(state, "plannedEndDate")}
        name="plannedEndDate"
        required
        type="date"
      />
      <div />
      <FieldError name="plannedEndDate" state={state} />
      <div />
      <Textarea
        className="sm:col-span-2"
        defaultValue={valueFor(state, "description")}
        name="description"
        placeholder="Task description"
      />
      <SubmitButton
        className="sm:col-span-2"
        disabled={disabled}
        pending={pending}
      >
        Save schedule task
      </SubmitButton>
      <ActionMessage className="sm:col-span-2" state={state} />
    </form>
  );
}

export function ScheduleDependencyForm({
  projectId,
  taskOptions,
}: ProjectScopedFormProps & {
  taskOptions: Option[];
}) {
  const [state, action, pending] = useActionState(
    createScheduleDependencyAction,
    initialWorkspaceActionState,
  );
  const disabled = taskOptions.length < 2;

  return (
    <form
      action={action}
      className="grid gap-3 sm:grid-cols-2"
      key={formKey(state)}
    >
      <input name="projectId" type="hidden" value={projectId} />
      <SelectField
        disabled={disabled}
        name="predecessorTaskId"
        options={taskOptions}
        placeholder="Predecessor"
        state={state}
      />
      <SelectField
        disabled={disabled}
        name="successorTaskId"
        options={taskOptions}
        placeholder="Successor"
        state={state}
      />
      <FieldError name="predecessorTaskId" state={state} />
      <FieldError name="successorTaskId" state={state} />
      <SelectField
        disabled={disabled}
        name="dependencyType"
        options={[
          { label: "Finish to Start", value: "finish_to_start" },
          { label: "Start to Start", value: "start_to_start" },
          { label: "Finish to Finish", value: "finish_to_finish" },
          { label: "Start to Finish", value: "start_to_finish" },
        ]}
        placeholder="Dependency type"
        state={state}
      />
      <Input
        aria-describedby={fieldErrorId("lagDays")}
        aria-invalid={hasFieldError(state, "lagDays")}
        defaultValue={valueFor(state, "lagDays") || "0"}
        name="lagDays"
        placeholder="Lag days"
        required
        type="number"
      />
      <FieldError name="dependencyType" state={state} />
      <FieldError name="lagDays" state={state} />
      <Input
        className="sm:col-span-2"
        defaultValue={valueFor(state, "notes")}
        name="notes"
        placeholder="Dependency notes"
      />
      <SubmitButton
        className="sm:col-span-2"
        disabled={disabled}
        pending={pending}
      >
        Save dependency
      </SubmitButton>
      <ActionMessage className="sm:col-span-2" state={state} />
    </form>
  );
}

function SelectField({
  disabled,
  name,
  options,
  placeholder,
  preferredValue,
  required = true,
  state,
}: {
  disabled?: boolean;
  name: string;
  options: Option[];
  placeholder: string;
  preferredValue?: string;
  required?: boolean;
  state: WorkspaceActionState;
}) {
  const defaultValue = valueFor(state, name) || preferredValue || "";

  return (
    <select
      aria-describedby={fieldErrorId(name)}
      aria-invalid={hasFieldError(state, name)}
      className={selectClassName}
      defaultValue={defaultValue}
      disabled={disabled}
      name={name}
      required={required}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function SubmitButton({
  children,
  className,
  disabled,
  pending,
}: {
  children: string;
  className?: string;
  disabled?: boolean;
  pending: boolean;
}) {
  return (
    <Button className={className} disabled={disabled || pending} type="submit">
      {pending ? "Saving..." : children}
    </Button>
  );
}

function ActionMessage({
  className,
  state,
}: {
  className?: string;
  state: WorkspaceActionState;
}) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className={cn(
        "text-sm",
        state.status === "error" ? "text-destructive" : "text-muted-foreground",
        className,
      )}
    >
      {state.message}
    </p>
  );
}

function FieldError({
  className,
  name,
  state,
}: {
  className?: string;
  name: string;
  state: WorkspaceActionState;
}) {
  const message = state.fieldErrors?.[name]?.[0];

  if (!message) {
    return null;
  }

  return (
    <p
      className={cn("text-sm text-destructive", className)}
      id={fieldErrorId(name)}
    >
      {message}
    </p>
  );
}

function fieldErrorId(name: string) {
  return `${name}-error`;
}

function hasFieldError(state: WorkspaceActionState, name: string) {
  return Boolean(state.fieldErrors?.[name]?.length);
}

function valueFor(state: WorkspaceActionState, name: string) {
  return state.values?.[name] ?? "";
}

function formKey(state: WorkspaceActionState) {
  return [
    state.status,
    state.message,
    ...Object.entries(state.values ?? {}).map(
      ([key, value]) => `${key}:${value}`,
    ),
  ].join("|");
}
