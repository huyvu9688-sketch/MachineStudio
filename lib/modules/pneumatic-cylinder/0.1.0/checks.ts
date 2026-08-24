// Acceptance checks for the pneumatic-cylinder module, following
// stage-1-spec.md "Checks (Proposed)": geometry, force capacity (extend and
// retract), cushion kinetic energy, and buckling. Air consumption/required
// air volume are reported outputs, not evaluated checks
// (stage-1-spec.md "Validity Envelope") -- they have no check here.
//
// Force capacity and cushion checks report `not_applicable` rather than
// `fail` when their own governing input was not supplied (no required force
// on that side; cushion_type "none") -- the same treatment
// ball-screw's own dn-limit check gives an unsupplied manufacturer speed
// limit.

import { makeQuantity, type CheckResult, type Quantity } from "@/lib/engine";

export interface ForceCapacityInput {
  readonly theoreticalForceN: number;
  readonly requiredForce: Quantity | undefined;
}

export interface ChecksInput {
  readonly boreDiameter: Quantity;
  readonly rodDiameter: Quantity;
  readonly extend: ForceCapacityInput;
  readonly retract: ForceCapacityInput;
  readonly cushionType: string;
  readonly kineticEnergyJ: number;
  readonly allowableKineticEnergy: Quantity | undefined;
  /** Governing compressive force on the rod -- see ./checks.ts "buckling" check. */
  readonly governingCompressiveForceN: number;
  readonly permissibleCompressiveLoadN: number;
}

function forceCapacityCheck(
  id: string,
  label: string,
  input: ForceCapacityInput,
): CheckResult {
  if (input.requiredForce === undefined) {
    return {
      id,
      status: "not_applicable",
      message: `No required ${label} force supplied; not checked.`,
      criterion: `theoretical_${label}_force >= required_${label}_force`,
    };
  }

  const theoreticalForce = makeQuantity(input.theoreticalForceN, "N");
  const ok = input.theoreticalForceN >= input.requiredForce.value;
  return {
    id,
    status: ok ? "pass" : "fail",
    message: ok
      ? `Theoretical ${label} force meets the required force.`
      : `Theoretical ${label} force is below the required force.`,
    criterion: `theoretical_${label}_force >= required_${label}_force`,
    observed: theoreticalForce,
    allowable: input.requiredForce,
    margin: makeQuantity(
      input.theoreticalForceN - input.requiredForce.value,
      "N",
    ),
  };
}

export function buildChecks(input: ChecksInput): CheckResult[] {
  const checks: CheckResult[] = [];

  const rodSmallerThanBore = input.rodDiameter.value < input.boreDiameter.value;
  checks.push({
    id: "rod-smaller-than-bore",
    status: rodSmallerThanBore ? "pass" : "fail",
    message: rodSmallerThanBore
      ? "Rod diameter is smaller than bore diameter."
      : "Rod diameter must be smaller than bore diameter.",
    criterion: "rod_diameter < bore_diameter",
    observed: input.rodDiameter,
    allowable: input.boreDiameter,
  });

  checks.push(
    forceCapacityCheck("force-capacity-extend", "extend", input.extend),
  );
  checks.push(
    forceCapacityCheck("force-capacity-retract", "retract", input.retract),
  );

  if (
    input.cushionType === "none" ||
    input.allowableKineticEnergy === undefined
  ) {
    checks.push({
      id: "cushion-kinetic-energy",
      status: "not_applicable",
      message: 'No cushion selected (cushion_type = "none"); not checked.',
      criterion: "kinetic_energy <= allowable_kinetic_energy",
    });
  } else {
    const kineticEnergy = makeQuantity(input.kineticEnergyJ, "J");
    const ok = input.kineticEnergyJ <= input.allowableKineticEnergy.value;
    checks.push({
      id: "cushion-kinetic-energy",
      status: ok ? "pass" : "fail",
      message: ok
        ? "End-of-stroke kinetic energy is within the cushion's own allowable energy."
        : "End-of-stroke kinetic energy exceeds the cushion's own allowable energy.",
      criterion: "kinetic_energy <= allowable_kinetic_energy",
      observed: kineticEnergy,
      allowable: input.allowableKineticEnergy,
      margin: makeQuantity(
        input.allowableKineticEnergy.value - input.kineticEnergyJ,
        "J",
      ),
    });
  }

  const governingCompressiveForce = makeQuantity(
    input.governingCompressiveForceN,
    "N",
  );
  const permissibleCompressiveLoad = makeQuantity(
    input.permissibleCompressiveLoadN,
    "N",
  );
  const bucklingOk =
    input.governingCompressiveForceN <= input.permissibleCompressiveLoadN;
  checks.push({
    id: "buckling",
    status: bucklingOk ? "pass" : "fail",
    message: bucklingOk
      ? "Governing rod compressive force is within the permissible buckling load."
      : "Governing rod compressive force exceeds the permissible buckling load.",
    criterion: "governing_compressive_force <= permissible_compressive_load",
    observed: governingCompressiveForce,
    allowable: permissibleCompressiveLoad,
    margin: makeQuantity(
      input.permissibleCompressiveLoadN - input.governingCompressiveForceN,
      "N",
    ),
  });

  return checks;
}
