"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportClientErrorAction } from "@/app/report-client-error";

/**
 * Route-segment error UI (Next.js App Router convention) — catches an
 * uncaught error from `workspace/page.tsx` (e.g. a database failure) so the
 * workspace shows a recoverable error state instead of Next's default error
 * screen, satisfying Unit 3.1's "error state" deliverable
 * (context/ui-context.md "Modals and Errors": "Error messages state the
 * failed action and practical correction").
 */
export default function WorkspaceError({
  error,
  reset,
}: {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error("Workspace failed to load:", error);
    // Structured server-side visibility (Unit 5.5) — the console.error
    // above only reaches the browser's own console, invisible to
    // production operators. Fire-and-forget: a failure reporting the
    // failure must not itself break the error boundary's own render.
    reportClientErrorAction({
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    }).catch(() => {});
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-bg-base px-6 text-center">
      <AlertTriangle
        aria-hidden="true"
        className="h-9 w-9"
        style={{ color: "var(--state-error)" }}
      />
      <p className="text-[16px] font-medium text-text-primary">
        Workspace failed to load
      </p>
      <p className="max-w-sm text-[14px] text-text-muted">
        Something went wrong while loading your machine projects. Try again, and
        contact support if the problem continues.
      </p>
      <Button type="button" onClick={reset} className="mt-2">
        Try again
      </Button>
    </div>
  );
}
