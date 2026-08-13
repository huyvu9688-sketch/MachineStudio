"use client";

import { useEffect } from "react";
import { reportClientErrorAction } from "@/app/report-client-error";

/**
 * Root error boundary (Next.js App Router convention: `global-error.tsx`
 * catches an error thrown above every other boundary, including the root
 * layout itself — `app/(workspace)/error.tsx` only catches errors inside
 * that route group). Unit 5.5: this codebase had no root boundary at all
 * before this, so a failure in `app/layout.tsx` (e.g. `ClerkProvider`
 * itself throwing) fell through to Next's own unstyled default error page
 * with no server-side record. Must render its own `<html>`/`<body>` — it
 * replaces the root layout, not just its children, when it activates.
 */
export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error("Application failed to load:", error);
    reportClientErrorAction({
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            padding: "1.5rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <p style={{ fontSize: "16px", fontWeight: 500 }}>
            MachineStudio failed to load
          </p>
          <p style={{ maxWidth: "24rem", fontSize: "14px", color: "#666" }}>
            Something went wrong. Try again, and contact support if the problem
            continues.
          </p>
          <button type="button" onClick={reset} style={{ marginTop: "0.5rem" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
