// GET /workspace/report?module=<id> or ?assembly=<id> or ?configuration=<id>
// — opens a module's, an assembly's (Unit 5.2), or a whole configuration's
// (Unit 5.3, "Machine calculation package") printable calculation report as
// HTML. A Route Handler, not a Server Action or page, the same reason
// `/workspace/bom` (Unit 5.1) is one: the browser needs a plain URL it can
// open in a new tab and print, independent of any React tree.
//
// `Content-Disposition: inline` (not `attachment`, unlike the BOM CSV route)
// — this is meant to open and be printed in the same tab, not download as a
// file; the filename still matters if the user chooses "Save As" from the
// browser's own print/save dialog.
//
// Only the failure path uses the `{ error: { code, message } }` envelope
// (context/code-standards.md "APIs"); success returns raw `text/html`, the
// same one legitimate exception the BOM route already establishes.

import { auth } from "@clerk/nextjs/server";
import {
  loadAssemblyReportView,
  loadMachineReportView,
  loadModuleReportView,
} from "@/lib/application";
import { logger, normalizeError } from "@/lib/logging";
import {
  buildAssemblyReportHtml,
  buildMachineReportHtml,
  buildModuleReportHtml,
} from "@/lib/reports";
import {
  asAssemblyId,
  asMachineConfigurationId,
  asModuleInstanceId,
  asUserId,
} from "@/lib/db";

function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return Response.json({ error: { code, message } }, { status });
}

/** A safe, human-recognizable filename component derived from a report's own subject name. Mirrors `/workspace/bom/route.ts`'s own `slugify` — small enough to duplicate rather than share across two route files. */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "report";
}

/** `null` for a missing or empty query parameter, otherwise the trimmed-nonempty value. */
function nonEmptyParam(value: string | null): string | null {
  return value !== null && value.length > 0 ? value : null;
}

export async function GET(request: Request): Promise<Response> {
  const { userId } = await auth.protect();
  const ownerId = asUserId(userId);

  const params = new URL(request.url).searchParams;
  const moduleId = nonEmptyParam(params.get("module"));
  const assemblyId = nonEmptyParam(params.get("assembly"));
  const configurationId = nonEmptyParam(params.get("configuration"));

  const providedCount = [moduleId, assemblyId, configurationId].filter(
    (value) => value !== null,
  ).length;
  if (providedCount !== 1) {
    return errorResponse(
      400,
      "invalid_input",
      "Provide exactly one of ?module=, ?assembly=, or ?configuration=.",
    );
  }

  try {
    let html: string;
    let filenamePrefix: string;
    let filenameSubject: string;

    if (moduleId !== null) {
      const view = await loadModuleReportView(
        asModuleInstanceId(moduleId),
        ownerId,
      );
      if (view === null) {
        return errorResponse(
          404,
          "not_found",
          "Module instance not found or not owned by this user.",
        );
      }
      html = buildModuleReportHtml(view);
      filenamePrefix = "module";
      filenameSubject = view.moduleInstance.label;
    } else if (assemblyId !== null) {
      const view = await loadAssemblyReportView(
        asAssemblyId(assemblyId),
        ownerId,
      );
      if (view === null) {
        return errorResponse(
          404,
          "not_found",
          "Assembly not found or not owned by this user.",
        );
      }
      html = buildAssemblyReportHtml(view);
      filenamePrefix = "assembly";
      filenameSubject = view.root.assemblyName;
    } else {
      // `configurationId` is non-null here: `providedCount === 1` and both
      // branches above were false, so it must be the one provided parameter.
      const view = await loadMachineReportView(
        asMachineConfigurationId(configurationId as string),
        ownerId,
      );
      if (view === null) {
        return errorResponse(
          404,
          "not_found",
          "Configuration not found or not owned by this user.",
        );
      }
      html = buildMachineReportHtml(view);
      filenamePrefix = "machine";
      filenameSubject = view.configuration.name;
    }

    const filename = `${filenamePrefix}-report-${slugify(filenameSubject)}.html`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error("Report route failed", {
      route: "/workspace/report",
      moduleId,
      assemblyId,
      configurationId,
      userId: ownerId,
      error: normalizeError(error),
    });
    return errorResponse(
      500,
      "internal_error",
      "Something went wrong while generating the report.",
    );
  }
}
