// GET /workspace/account/export — downloads the caller's own complete
// account data export as JSON (Unit 5.5, "Data export and account deletion
// path"). A Route Handler, not a Server Action, for the same reason
// `/workspace/bom` and `/workspace/report` are: the browser needs a plain
// URL that hands back a downloadable file with its own Content-Disposition
// header, independent of any React tree.
//
// No query parameters — this always exports the caller's own account
// (`auth.protect()`'s own `userId`), never another id, so there is nothing
// here for an ownership check to fail on the way a BOM/report route's
// `?configuration=` can be missing or not owned.
//
// Only the failure path uses the `{ error: { code, message } }` envelope
// (context/code-standards.md "APIs"); success returns raw
// `application/json`, the same one legitimate exception the BOM/report
// routes already establish for a file download.

import { auth } from "@clerk/nextjs/server";
import { exportAccountData } from "@/lib/application";
import { logger, normalizeError } from "@/lib/logging";
import { asUserId } from "@/lib/db";

function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function GET(): Promise<Response> {
  const { userId } = await auth.protect();

  try {
    const data = await exportAccountData(asUserId(userId));
    const json = JSON.stringify(data, null, 2);

    return new Response(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="machinestudio-account-export.json"',
      },
    });
  } catch (error) {
    logger.error("Account export route failed", {
      route: "/workspace/account/export",
      userId,
      error: normalizeError(error),
    });
    return errorResponse(
      500,
      "internal_error",
      "Something went wrong while exporting your account data.",
    );
  }
}
