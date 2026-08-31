// Reference-example reproduction (Stage 4 / implementation-plan Task 6) for
// guided-cylinder-sizing@0.2.0. Reproduces SMC's own two published MGP page
// -545 "Selection Example" scenarios end to end -- through the real module
// compute path (executeModule) AND the real MGP matcher
// (evaluateMgpGuidedCylinderCandidates) against a realistic candidate set
// drawn directly from the seeded catalog rows
// (reference/catalog-seed/smc-mgp.csv) -- and confirms each one selects the
// exact model SMC's own text names as the answer, not merely that a
// candidate is accepted.
//
// Lives here, not inside lib/modules/guided-cylinder-sizing/0.2.0/, because
// module-package code cannot import lib/application (code-standards.md
// "Module Packages": "Module code cannot import app, database,
// authentication, file storage, or network packages" -- runModuleConformance's
// own import-boundary check enforces this and fails on a module-directory
// file importing the matcher). guided-cylinder-sizing@0.1.0's own sibling
// smc-reference-example.ts stays compute-only inside its module directory
// for the same reason; the matching half of that pattern lives in its own
// guided-cylinder-matching.test.ts instead. This file follows that same
// split, just combined into one file since nothing else needs to reuse
// these specific example functions.
//
// A real, disclosed scope note: SMC's own "Selection conditions" box states
// bearing type as a GIVEN precondition ("Bearing type: Ball bushing" /
// "Bearing type: Slide bearing"), the same status "Stroke: 30 stroke" has --
// something the engineer has already decided before consulting the graph,
// not something the graph itself chooses. This module has no bearing-type
// input port (manifest.ts's own validityEnvelopeSummary: "MGP graph
// selection ... performed only by the catalog boundary"), so
// evaluateMgpGuidedCylinderCandidates ranks purely by ascending bore across
// every bearing type it is offered. Offering BOTH bearing types for the
// vertical-lifter scenario below actually selects MGPM20-30Z (slide, bore
// 20), not MGPL25-30Z -- bore 20's own slide-bearing graph-1 curve
// genuinely clears 3 kg at 90 mm (confirmed directly: ~4.1 kg allowable),
// and bore 20 outranks bore 25 once bearing type is not constrained. This
// is not a defect in the matcher; it is a real behavior difference from a
// literal reading of the catalog's own worked example, disclosed here and
// in validation/guided-cylinder-sizing/0.2.0.md rather than hidden by only
// ever testing single-bearing-type candidate lists. To reproduce SMC's own
// literal per-scenario answer, each function below offers only the bearing
// type SMC's own conditions box actually specifies for that scenario --
// exactly how mgp-guided-cylinder-matching.test.ts's own existing fixtures
// already scope their candidate lists.
//
// The stopper case has no numbered "Selection Example" in the source
// material at all (MGP.md's own page-552 stopper section gives only the
// operating-range graphs, no worked numeric scenario) -- a real, disclosed
// gap, not glossed over. runMgpStopperExample() instead anchors to a real
// published data point on that same page-552 graph (bore 25, slide bearing,
// graph 21's flat 5-10.7 m/min plateau, itself an exact digitized catalog
// figure -- see mgp-selection-curves.ts), transfer speed chosen inside that
// plateau (6 m/min = 0.1 m/s exactly) so the matcher reads the real
// published allowable mass with zero interpolation, not an approximation.
// Slide bearing is not merely SMC's stated precondition here -- MGPL/MGPA
// are physically excluded from stopper duty entirely (MGP.md's own
// page-551 caution), so this candidate list is genuinely the full eligible
// set, not a scope narrowing the way the vertical/horizontal cases above
// are.

import { executeModule, makeQuantity } from "@/lib/engine";
import { guidedCylinderSizingMgpModule } from "@/lib/modules/guided-cylinder-sizing/0.2.0";
import { applicationCaseValue } from "@/lib/modules/guided-cylinder-sizing/0.2.0/test-helpers";
import {
  evaluateMgpGuidedCylinderCandidates,
  type MgpGuidedCylinderMatchCandidate,
} from "./mgp-guided-cylinder-matching";

type MgpBearing = "slide" | "ball_bushing";

/** Every bore SMC's own MGPM (slide) or MGPL (ball bushing) 30-stroke rows publish for one bearing family, directly read from reference/catalog-seed/smc-mgp.csv. */
function mgpZ30StrokeCandidates(
  bearing: MgpBearing,
): readonly MgpGuidedCylinderMatchCandidate[] {
  const bores = [12, 16, 20, 25] as const;
  const rodByBore: Record<(typeof bores)[number], number> = {
    12: 6,
    16: 8,
    20: 10,
    25: 10,
  };
  return bores.map((bore) => ({
    id: `MGP${bearing === "slide" ? "M" : "L"}${bore}-30Z`,
    attributes: {
      bore_diameter: makeQuantity(bore, "mm"),
      rod_diameter: makeQuantity(rodByBore[bore], "mm"),
      bearing_type: {
        v: 1,
        kind: "enum",
        enumId: "mgp_bearing_type",
        value: bearing,
      },
      standard_stroke: makeQuantity(30, "mm"),
    },
  }));
}

/**
 * MGP page-545 "Selection Example 1 (Vertical Mounting)": ball bushing,
 * 30 stroke, 200 mm/s, 3 kg load mass, 90 mm eccentric distance -- SMC's own
 * text: "MGPL25-30Z is selected." `load_safety_factor: 1` isolates the
 * catalog's own published condition (this module's own added multiplier is
 * a founder-directed addition with no catalog equivalent, exercised
 * separately in mgp-guided-cylinder-matching.test.ts). The offered
 * candidate list is scoped to ball-bushing bores only, matching SMC's own
 * "Bearing type: Ball bushing" selection condition -- see this file's
 * header for what changes when both bearing types are offered.
 */
export function runMgpVerticalLifterExample() {
  const values = {
    application_case: applicationCaseValue("vertical_lifter"),
    load_mass: makeQuantity(3, "kg"),
    load_safety_factor: makeQuantity(1, "ratio"),
    required_stroke: makeQuantity(30, "mm"),
    operating_pressure: makeQuantity(0.5, "MPa"),
    max_piston_speed: makeQuantity(0.2, "m/s"),
    eccentric_distance: makeQuantity(90, "mm"),
  };
  const computation = executeModule(guidedCylinderSizingMgpModule, { values });

  const outcome = evaluateMgpGuidedCylinderCandidates(
    computation,
    { values },
    mgpZ30StrokeCandidates("ball_bushing"),
  );

  return { computation, outcome };
}

/**
 * MGP page-545 "Selection Example 2 (Horizontal Mounting)": slide bearing,
 * 50 mm plate-to-load-centre-of-gravity distance, 200 mm/s, 2 kg load mass,
 * 30 stroke -- SMC's own text: "MGPM20-30Z is selected." The offered
 * candidate list is scoped to slide-bearing bores only, matching SMC's own
 * "Bearing type: Slide bearing" selection condition.
 */
export function runMgpHorizontalPusherExample() {
  const values = {
    application_case: applicationCaseValue("horizontal_pusher"),
    load_mass: makeQuantity(2, "kg"),
    load_safety_factor: makeQuantity(1, "ratio"),
    required_stroke: makeQuantity(30, "mm"),
    operating_pressure: makeQuantity(0.5, "MPa"),
    max_piston_speed: makeQuantity(0.2, "m/s"),
    eccentric_distance: makeQuantity(50, "mm"),
  };
  const computation = executeModule(guidedCylinderSizingMgpModule, { values });

  const outcome = evaluateMgpGuidedCylinderCandidates(
    computation,
    { values },
    mgpZ30StrokeCandidates("slide"),
  );

  return { computation, outcome };
}

/**
 * The same "Selection Example 1" conditions as {@link runMgpVerticalLifterExample},
 * except the offered candidate list carries BOTH bearing types -- the real,
 * disclosed cross-bearing-type ranking behavior this file's header
 * describes. Not a catalog scenario; a characterization of this module's
 * own matcher.
 */
export function runMgpVerticalLifterExampleAcrossBearingTypes() {
  const values = {
    application_case: applicationCaseValue("vertical_lifter"),
    load_mass: makeQuantity(3, "kg"),
    load_safety_factor: makeQuantity(1, "ratio"),
    required_stroke: makeQuantity(30, "mm"),
    operating_pressure: makeQuantity(0.5, "MPa"),
    max_piston_speed: makeQuantity(0.2, "m/s"),
    eccentric_distance: makeQuantity(90, "mm"),
  };
  const computation = executeModule(guidedCylinderSizingMgpModule, { values });

  const outcome = evaluateMgpGuidedCylinderCandidates(computation, { values }, [
    ...mgpZ30StrokeCandidates("ball_bushing"),
    ...mgpZ30StrokeCandidates("slide"),
  ]);

  return { computation, outcome };
}

/**
 * Not a catalog "Selection Example" (none exists for stopper -- see this
 * file's header). A real published anchor point instead: bore 25, slide
 * bearing, 30 stroke, page-552 graph 21's flat plateau from 5 to 10.7 m/min
 * publishes an allowable mass of 77.2 kg unchanged across that whole range.
 * 6 m/min (0.1 m/s canonical) sits inside it, so the matcher reads that
 * exact published figure, not an interpolated one. 50 kg clears bore 25
 * (77.2 kg) but not bore 20 (45.9 kg) or smaller -- a real, non-trivial
 * selection, not merely "the only candidate offered."
 */
export function runMgpStopperExample() {
  const values = {
    application_case: applicationCaseValue("stopper"),
    load_mass: makeQuantity(50, "kg"),
    load_safety_factor: makeQuantity(1, "ratio"),
    required_stroke: makeQuantity(30, "mm"),
    operating_pressure: makeQuantity(0.5, "MPa"),
    transfer_speed: makeQuantity(0.1, "m/s"),
  };
  const computation = executeModule(guidedCylinderSizingMgpModule, { values });

  const outcome = evaluateMgpGuidedCylinderCandidates(
    computation,
    { values },
    mgpZ30StrokeCandidates("slide"),
  );

  return { computation, outcome };
}
