import Link from "next/link";

const adrLinks = [
  ["ADR 0001", "Stage-Centric NPI Build Planning Platform"],
  ["ADR 0002", "Web Framework, Deployment, and Repository Layout"],
  ["ADR 0003", "Data Model and Allocation Rules"],
  ["ADR 0004", "AI Agent Protocol and Audit Model"],
  ["ADR 0005", "Build Matrix and Process/Material Mapping"],
  ["ADR 0006", "Schedule and Gantt Extension Model"],
  ["ADR 0007", "Readiness, Greenlight, At Risk, and Blocked Semantics"],
];

export default function DocsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-3">
        <Link className="text-sm text-muted-foreground" href="/">
          Vibe Plan
        </Link>
        <h1 className="text-3xl font-semibold tracking-normal">
          Architecture Records
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          The MVP implementation follows these decisions for stage-centric NPI
          planning, allocation, matrix follow-up, AI audit, schedule, and
          readiness semantics.
        </p>
      </div>
      <div className="grid gap-3">
        {adrLinks.map(([id, title]) => (
          <div
            className="rounded-lg border bg-card px-4 py-3 text-card-foreground"
            key={id}
          >
            <div className="text-sm font-medium">{id}</div>
            <div className="text-sm text-muted-foreground">{title}</div>
          </div>
        ))}
      </div>
    </main>
  );
}

