import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8 px-6 py-20">
        <div className="flex max-w-3xl flex-col gap-5">
          <h1 className="text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">
            Vibe Plan
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
            Stage-centric NPI build planning for project stages, x-function
            demand, config allocation, build matrix follow-up, and AI-assisted
            planning workflows.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            nativeButton={false}
            render={<a href="/workspace" />}
          >
            Open workspace
          </Button>
          <Button
            nativeButton={false}
            render={<a href="/docs" />}
            variant="outline"
          >
            Read architecture
          </Button>
        </div>
      </section>
    </main>
  );
}
