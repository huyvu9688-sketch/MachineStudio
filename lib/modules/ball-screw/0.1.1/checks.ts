// Acceptance checks for the ball-screw module. `math.ts`'s kernel functions
// already hard-reject non-positive geometry (context/modules/ball-screw/
// stage-1-spec.md "Checks (Proposed)": "Invalid input: non-positive lead,
// diameter, or unsupported length"), so the geometry checks below restate
// that same acceptance criterion for the report rather than guarding an
// unreachable failure path — the same pattern axis-load-cases and
// motion-profile already use.
//
// The static safety factor minimum and the buckling safety margin have no
// built-in default (context/modules/ball-screw/stage-2-contract.md
// "Decisions" items 1-2): both checks compare the computed value against
// whatever the engineer supplied, not an embedded constant.

import {
  convert,
  makeQuantity,
  type CheckResult,
  type Quantity,
} from "@/lib/engine";

export type BallScrewCase = "normal" | "peak";

export interface CaseCheckInput {
  readonly appliedLoadMagnitudeN: number;
  readonly staticSafetyFactor: number;
  readonly rotationalSpeedRevPerMin: number;
}

export interface ChecksInput {
  readonly minorDiameter: Quantity;
  readonly lead: Quantity;
  readonly unsupportedLength: Quantity;
  readonly staticSafetyFactorMinimum: Quantity;
  readonly bucklingSafetyMargin: Quantity;
  readonly permissibleCompressiveLoadN: number;
  readonly permissibleSpeedRevPerMin: number;
  readonly manufacturerSpeedLimit: Quantity | undefined;
  readonly cases: Readonly<Record<BallScrewCase, CaseCheckInput>>;
}

function positivityCheck(
  id: string,
  label: string,
  value: Quantity,
): CheckResult {
  const ok = value.value > 0;
  return {
    id,
    status: ok ? "pass" : "fail",
    message: ok ? `${label} is positive.` : `${label} must be positive.`,
    criterion: `${id.replace(/-/g, "_")} > 0`,
    observed: value,
  };
}

export function buildChecks(input: ChecksInput): CheckResult[] {
  const checks: CheckResult[] = [
    positivityCheck(
      "minor-diameter-positive",
      "Minor (root) diameter",
      input.minorDiameter,
    ),
    positivityCheck("lead-positive", "Screw lead", input.lead),
    positivityCheck(
      "unsupported-length-positive",
      "Unsupported length",
      input.unsupportedLength,
    ),
  ];

  const permissibleCompressiveLoad = makeQuantity(
    input.permissibleCompressiveLoadN,
    "N",
  );
  const permissibleSpeed = makeQuantity(
    convert(input.permissibleSpeedRevPerMin, "rpm", "rad/s"),
    "rad/s",
  );

  for (const loadCase of ["normal", "peak"] as const) {
    const c = input.cases[loadCase];

    const staticSafetyOk =
      c.staticSafetyFactor >= input.staticSafetyFactorMinimum.value;
    checks.push({
      id: `static-safety-${loadCase}`,
      status: staticSafetyOk ? "pass" : "fail",
      message: staticSafetyOk
        ? `Static safety factor meets the required minimum for the ${loadCase} case.`
        : `Static safety factor is below the required minimum for the ${loadCase} case.`,
      criterion: "fs >= fs_min",
      observed: makeQuantity(c.staticSafetyFactor, "ratio"),
      allowable: input.staticSafetyFactorMinimum,
      margin: makeQuantity(
        c.staticSafetyFactor - input.staticSafetyFactorMinimum.value,
        "ratio",
      ),
    });

    const appliedCompressiveLoad = makeQuantity(c.appliedLoadMagnitudeN, "N");
    const bucklingOk =
      c.appliedLoadMagnitudeN <= input.permissibleCompressiveLoadN;
    checks.push({
      id: `buckling-${loadCase}`,
      status: bucklingOk ? "pass" : "fail",
      message: bucklingOk
        ? `Applied compressive load is within the permissible buckling load for the ${loadCase} case.`
        : `Applied compressive load exceeds the permissible buckling load for the ${loadCase} case.`,
      criterion: "|F_applied| <= permissible_compressive_load",
      observed: appliedCompressiveLoad,
      allowable: permissibleCompressiveLoad,
      margin: makeQuantity(
        input.permissibleCompressiveLoadN - c.appliedLoadMagnitudeN,
        "N",
      ),
    });

    const operatingSpeed = makeQuantity(
      convert(c.rotationalSpeedRevPerMin, "rpm", "rad/s"),
      "rad/s",
    );
    const criticalSpeedOk =
      c.rotationalSpeedRevPerMin <= input.permissibleSpeedRevPerMin;
    checks.push({
      id: `critical-speed-${loadCase}`,
      status: criticalSpeedOk ? "pass" : "fail",
      message: criticalSpeedOk
        ? `Rotational speed is within the permissible operating speed for the ${loadCase} case.`
        : `Rotational speed exceeds the permissible operating speed for the ${loadCase} case.`,
      criterion: "n <= 0.8 * n_k",
      observed: operatingSpeed,
      allowable: permissibleSpeed,
      margin: makeQuantity(
        input.permissibleSpeedRevPerMin - c.rotationalSpeedRevPerMin,
        "rpm",
      ),
    });
  }

  const maxRotationalSpeedRevPerMin = Math.max(
    input.cases.normal.rotationalSpeedRevPerMin,
    input.cases.peak.rotationalSpeedRevPerMin,
  );
  if (input.manufacturerSpeedLimit === undefined) {
    checks.push({
      id: "dn-limit",
      status: "not_applicable",
      message:
        "No manufacturer DN/speed-limit data supplied for this screw; not checked.",
      criterion: "n <= manufacturer speed limit",
    });
  } else {
    const observedSpeed = makeQuantity(
      convert(maxRotationalSpeedRevPerMin, "rpm", "rad/s"),
      "rad/s",
    );
    const dnOk = observedSpeed.value <= input.manufacturerSpeedLimit.value;
    checks.push({
      id: "dn-limit",
      status: dnOk ? "pass" : "fail",
      message: dnOk
        ? "Rotational speed is within the manufacturer's own speed (DN) limit."
        : "Rotational speed exceeds the manufacturer's own speed (DN) limit.",
      criterion: "n <= manufacturer speed limit",
      observed: observedSpeed,
      allowable: input.manufacturerSpeedLimit,
    });
  }

  return checks;
}
