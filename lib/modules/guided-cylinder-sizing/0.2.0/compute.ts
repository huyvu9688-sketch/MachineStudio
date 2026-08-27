import {
  makeQuantity,
  SERIALIZATION_FORMAT_VERSION,
  type EngineeringValue,
  type EnumValue,
  type ModuleComputation,
  type ModuleInput,
} from "@/lib/engine";
import { buildChecks } from "./checks";
import { resolveFactoredLoadMassKg } from "./math";
import { buildTrace } from "./trace";
import { applicationCaseAt, quantityAt } from "./values";

export function compute(input: ModuleInput): ModuleComputation {
  const values = input.values;
  const applicationCase = applicationCaseAt(values);
  const loadMass = quantityAt(values, "load_mass");
  const loadSafetyFactor = quantityAt(values, "load_safety_factor");
  const requiredStroke = quantityAt(values, "required_stroke");
  const operatingPressure = quantityAt(values, "operating_pressure");
  const maxPistonSpeed = quantityAt(values, "max_piston_speed");
  const eccentricDistance = quantityAt(values, "eccentric_distance");
  const transferSpeed = quantityAt(values, "transfer_speed");

  if (
    applicationCase === undefined ||
    loadMass === undefined ||
    loadSafetyFactor === undefined ||
    requiredStroke === undefined ||
    operatingPressure === undefined
  ) {
    throw new Error(
      "guided-cylinder-sizing 0.2.0 requires application case, load mass, guided-load safety factor, required stroke, and operating pressure.",
    );
  }

  if (
    (applicationCase === "vertical_lifter" ||
      applicationCase === "horizontal_pusher") &&
    (maxPistonSpeed === undefined || eccentricDistance === undefined)
  ) {
    throw new Error(
      `${applicationCase} requires piston speed and eccentric distance for MGP graph selection.`,
    );
  }

  if (applicationCase === "stopper" && transferSpeed === undefined) {
    throw new Error("stopper requires transfer speed for MGP graph selection.");
  }

  const factoredLoadMassKg = resolveFactoredLoadMassKg({
    loadMassKg: loadMass.value,
    guidedLoadSafetyFactor: loadSafetyFactor.value,
  });
  const outputs: Record<string, EngineeringValue> = {
    factored_load_mass: makeQuantity(factoredLoadMassKg, "kg"),
    application_case_out: makeApplicationCaseOutput(applicationCase),
    required_stroke_out: requiredStroke,
    operating_pressure_out: operatingPressure,
  };

  return {
    outputs,
    trace: buildTrace({
      applicationCase,
      loadMass,
      loadSafetyFactor,
      factoredLoadMassKg,
      requiredStroke,
      operatingPressure,
      ...(maxPistonSpeed !== undefined && { maxPistonSpeed }),
      ...(eccentricDistance !== undefined && { eccentricDistance }),
      ...(transferSpeed !== undefined && { transferSpeed }),
    }),
    checks: buildChecks(),
    warnings: [],
    assumptions: [
      {
        id: "guided-load-safety-factor-is-explicit",
        statement:
          "The engineer supplies the guided-load safety factor. The package applies it exactly once to load mass before MGP graph selection and does not add an implicit margin.",
        value: loadSafetyFactor,
      },
      {
        id: "catalog-graph-selection-is-boundary-owned",
        statement:
          "MGP graph-band resolution, bearing-family selection, theoretical cylinder-force reporting, and candidate acceptance occur at the catalog boundary after this required specification is produced.",
      },
      {
        id: "no-derived-force-moment-or-buckling",
        statement:
          "This simplified MGP workflow does not derive axial force, separate roll/pitch/yaw moments, friction, process force, or Euler buckling from unspecified secondary inputs.",
      },
    ],
    validity: [],
  };
}

function makeApplicationCaseOutput(value: string): EnumValue {
  return {
    v: SERIALIZATION_FORMAT_VERSION,
    kind: "enum",
    enumId: "pneumatic_guided_mgp_application_case",
    value,
  };
}
