import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-segment loading UI (Next.js App Router convention) — Next renders
 * this automatically while `workspace/page.tsx`'s data load is in flight,
 * satisfying Unit 3.1's "loading state" deliverable without a manual
 * Suspense boundary. Mirrors the shell's static chrome so the swap to the
 * real page doesn't jump.
 */
export default function WorkspaceLoading() {
  return (
    <div className="flex h-screen flex-col bg-bg-base">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border-default bg-bg-appbar px-3">
        <Skeleton className="h-5 w-32 bg-white/20" />
      </header>
      <div className="flex h-9 shrink-0 items-center border-b border-border-default bg-bg-surface px-4">
        <Skeleton className="h-3.5 w-40" />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="w-[280px] shrink-0 space-y-2 border-r border-border-default bg-bg-surface p-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
        <main className="flex flex-1 items-center justify-center">
          <Skeleton className="h-8 w-56" />
        </main>
      </div>

      <footer className="flex h-7 shrink-0 items-center border-t border-border-default bg-bg-surface px-3">
        <Skeleton className="h-3 w-64" />
      </footer>
    </div>
  );
}
