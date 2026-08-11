// GET /workspace/bom?configuration=<id> — downloads a configuration's BOM
// as CSV (Unit 5.1). The first Route Handler in this codebase; every other
// server-side mutation/read so far is a Server Action or a Server
// Component page (app/(workspace)/workspace/actions.ts, page.tsx), neither
// of which can hand the browser a downloadable file with its own
// Content-Disposition header.
//
// Deliberately no `.csv` in the URL path itself: `proxy.ts`'s Clerk
// middleware matcher explicitly excludes paths ending in a `.csv` (and
// several other static-asset) extension from running through
// `clerkMiddleware()`, so a literal `/workspace/bom.csv` URL would bypass
// authentication context entirely. The downloaded filename still ends in
// `.csv` via `Content-Disposition`, which is independent of the request URL.
//
// Only the failure path uses the `{ error: { code, message } }` envelope
// (context/code-standards.md "APIs") — success returns raw `text/csv`, the
// one legitimate exception: that envelope describes a JSON response shape,
// and a file download is not JSON.

import { auth } from "@clerk/nextjs/server";
import { loadBomView } from "@/lib/application";
import { buildBomCsv } from "@/lib/reports";
import { asMachineConfigurationId, asUserId } from "@/lib/db";

function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return Response.json({ error: { code, message } }, { status });
}

/** A safe, human-recognizable filename component derived from the configuration's own name. */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "configuration";
}

export async function GET(request: Request): Promise<Response> {
  const { userId } = await auth.protect();

  const configurationId = new URL(request.url).searchParams.get(
    "configuration",
  );
  if (configurationId === null || configurationId.length === 0) {
    return errorResponse(
      400,
      "invalid_input",
      "Missing ?configuration= query parameter.",
    );
  }

  const view = await loadBomView(
    asMachineConfigurationId(configurationId),
    asUserId(userId),
  );
  if (view === null) {
    return errorResponse(
      404,
      "not_found",
      "Configuration not found or not owned by this user.",
    );
  }

  const csv = buildBomCsv(view);
  const filename = `bom-${slugify(view.configurationName)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
