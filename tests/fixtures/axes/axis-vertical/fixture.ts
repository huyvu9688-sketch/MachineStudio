import type { AxisHistoricalFixture, FixtureQuantity } from "../fixture-types";

const newtons = (value: number): FixtureQuantity => ({ value, unit: "N" });
const newtonMetres = (value: number): FixtureQuantity => ({
  value,
  unit: "N*m",
});

/**
 * Sanitized from the historical design-calculation screenshots identified as
 * ID42. The source explicitly describes an upward vertical move.
 */
export const axisVerticalFixture = {
  id: "axis-vertical",
  revision: "0.1.0-draft",
  classification: "sanitized_historical_project",
  evidenceStatus: "draft",
  sanitization: {
    sourceCaseId: "ID42",
    removedIdentifiers: [
      "Phone status and cloud-drive UI",
      "Account avatar",
      "Organization branding and logo",
    ],
    reviewedOn: "2026-07-31",
  },
  coverage: [
    "vertical upward axis",
    "gravity-resisted travel",
    "acceleration, constant-speed, and deceleration axial-force magnitudes",
    "screw torque and servo-selection downstream references",
  ],
  sourceEvidence: [
    {
      rawMaterialPath: "reference/source-material/Image (35).jpg",
      printedPage: "1",
      rawMaterialSha256:
        "BE610EED69E343F6953B01449D22AC353E040265DD5A50D0E5E0826DFEF45721",
      documentTitle:
        "ID42 vertical-axis application calculation (title truncated in source)",
      documentRevision: null,
      extractionNote:
        "Source page identifies a vertical ball-screw axis, combined moving mass, and provisional components.",
    },
    {
      rawMaterialPath: "reference/source-material/Image (34).jpg",
      printedPage: "2",
      rawMaterialSha256:
        "8ACA1B3AA8609EAFB098EDADEF246D4BB7E2F2503B22D9B2E37161C1A70B12DA",
      documentTitle:
        "ID42 vertical-axis application calculation (title truncated in source)",
      documentRevision: null,
      extractionNote:
        "Source page records motion, gravity, ball-screw lead, and efficiency inputs.",
    },
    {
      rawMaterialPath: "reference/source-material/Image (33).jpg",
      printedPage: "3",
      rawMaterialSha256:
        "542FFF4203AA0A73B8C5EDBC65E001FC655E9C8E60EB4BF3E927B4E40316415B",
      documentTitle:
        "ID42 vertical-axis application calculation (title truncated in source)",
      documentRevision: null,
      extractionNote: "Source page records the trapezoidal-motion timing.",
    },
    {
      rawMaterialPath: "reference/source-material/Image (32).jpg",
      printedPage: "4",
      rawMaterialSha256:
        "F8744FA9AE076E1652E1D01E105A1780DB8CA2FF9C6D8B1280E29E41A024AE86",
      documentTitle:
        "ID42 vertical-axis application calculation (title truncated in source)",
      documentRevision: null,
      extractionNote:
        "Source page provides the explicit upward-force equations/results and screw-load torque values.",
    },
  ],
  originalInputs: {
    orientation: "vertical",
    inclineAngle: { value: 90, unit: "deg" },
    positiveTravel: "upward",
    masses: {
      totalMovingMass: { value: 30, unit: "kg" },
      payload: null,
      carriage: null,
      additional: null,
      sourceBreakdown: "The source gives one combined table-and-load mass.",
    },
    centerOfMass: null,
    frictionCoefficient: null,
    guideResistance: null,
    externalForces: [],
    externalMoments: [],
    motionPhases: [
      {
        id: "acceleration",
        sourceLabel: "upward acceleration",
        direction: "upward",
        velocity: { value: 300, unit: "mm/s" },
        acceleration: { value: 1.5, unit: "m/s^2" },
        duration: { value: 0.2, unit: "s" },
      },
      {
        id: "constant-speed",
        sourceLabel: "upward constant speed",
        direction: "upward",
        velocity: { value: 300, unit: "mm/s" },
        acceleration: { value: 0, unit: "m/s^2" },
        duration: { value: 1.467, unit: "s" },
      },
      {
        id: "deceleration",
        sourceLabel: "upward deceleration",
        direction: "upward",
        velocity: { value: 300, unit: "mm/s" },
        acceleration: { value: -1.5, unit: "m/s^2" },
        duration: { value: 0.2, unit: "s" },
      },
    ],
    dutyCycle: {
      cycleTime: { value: 1.867, unit: "s" },
      movingTime: { value: 1.867, unit: "s" },
      note: "One upward trapezoidal move; no full production duty cycle is stated.",
    },
    gravity: { value: 9.81, unit: "m/s^2" },
  },
  normalizedInputs: {
    orientation: "vertical",
    inclineAngle: { value: Math.PI / 2, unit: "rad" },
    positiveTravel: "upward",
    masses: {
      totalMovingMass: { value: 30, unit: "kg" },
      payload: null,
      carriage: null,
      additional: null,
      sourceBreakdown: "The source gives one combined table-and-load mass.",
    },
    centerOfMass: null,
    frictionCoefficient: null,
    guideResistance: null,
    externalForces: [],
    externalMoments: [],
    motionPhases: [
      {
        id: "acceleration",
        sourceLabel: "upward acceleration",
        direction: "upward",
        velocity: { value: 0.3, unit: "m/s" },
        acceleration: { value: 1.5, unit: "m/s^2" },
        duration: { value: 0.2, unit: "s" },
      },
      {
        id: "constant-speed",
        sourceLabel: "upward constant speed",
        direction: "upward",
        velocity: { value: 0.3, unit: "m/s" },
        acceleration: { value: 0, unit: "m/s^2" },
        duration: { value: 1.467, unit: "s" },
      },
      {
        id: "deceleration",
        sourceLabel: "upward deceleration",
        direction: "upward",
        velocity: { value: 0.3, unit: "m/s" },
        acceleration: { value: -1.5, unit: "m/s^2" },
        duration: { value: 0.2, unit: "s" },
      },
    ],
    dutyCycle: {
      cycleTime: { value: 1.867, unit: "s" },
      movingTime: { value: 1.867, unit: "s" },
      note: "One upward trapezoidal move; no full production duty cycle is stated.",
    },
    gravity: { value: 9.81, unit: "m/s^2" },
  },
  expectedResults: {
    axisLoadCases: [
      {
        id: "acceleration",
        sourceLabel: "upward acceleration",
        metric: "axial_drive_force",
        convention: "Reported upward actuator-force magnitude.",
        original: newtons(339.3),
        normalized: newtons(339.3),
        tolerance: {
          absolute: newtons(0.1),
          rationale:
            "Matches the source's one-decimal-place calculation result.",
        },
        sourcePageOrImage: "Image (32).jpg, printed p. 4",
        intendedModuleMapping: {
          loadCase: "unclassified",
          direction: "upward",
          status: "unclassified",
        },
      },
      {
        id: "constant-speed",
        sourceLabel: "upward constant speed",
        metric: "axial_drive_force",
        convention: "Reported upward actuator-force magnitude.",
        original: newtons(294.3),
        normalized: newtons(294.3),
        tolerance: {
          absolute: newtons(0.1),
          rationale:
            "Matches the source's one-decimal-place calculation result.",
        },
        sourcePageOrImage: "Image (32).jpg, printed p. 4",
        intendedModuleMapping: {
          loadCase: "unclassified",
          direction: "upward",
          status: "unclassified",
        },
      },
      {
        id: "deceleration",
        sourceLabel: "upward deceleration",
        metric: "axial_drive_force",
        convention: "Reported upward actuator-force magnitude.",
        original: newtons(249.3),
        normalized: newtons(249.3),
        tolerance: {
          absolute: newtons(0.1),
          rationale:
            "Matches the source's one-decimal-place calculation result.",
        },
        sourcePageOrImage: "Image (32).jpg, printed p. 4",
        intendedModuleMapping: {
          loadCase: "unclassified",
          direction: "upward",
          status: "unclassified",
        },
      },
    ],
    downstreamReferenceValues: [
      {
        id: "acceleration-screw-load-torque",
        sourceLabel: "upward acceleration screw-load torque",
        metric: "screw_load_torque",
        convention:
          "Reported downstream ball-screw torque, not a Unit 4.1 output.",
        original: newtonMetres(0.6),
        normalized: newtonMetres(0.6),
        tolerance: {
          absolute: newtonMetres(0.001),
          rationale: "The source reports the value to three decimal places.",
        },
        sourcePageOrImage: "Image (32).jpg, printed p. 4",
        intendedModuleMapping: {
          loadCase: "unclassified",
          direction: "upward",
          status: "unclassified",
        },
      },
      {
        id: "constant-speed-screw-load-torque",
        sourceLabel: "upward constant-speed screw-load torque",
        metric: "screw_load_torque",
        convention:
          "Reported downstream ball-screw torque, not a Unit 4.1 output.",
        original: newtonMetres(0.52),
        normalized: newtonMetres(0.52),
        tolerance: {
          absolute: newtonMetres(0.001),
          rationale: "The source reports the value to three decimal places.",
        },
        sourcePageOrImage: "Image (32).jpg, printed p. 4",
        intendedModuleMapping: {
          loadCase: "unclassified",
          direction: "upward",
          status: "unclassified",
        },
      },
      {
        id: "deceleration-screw-load-torque",
        sourceLabel: "upward deceleration screw-load torque",
        metric: "screw_load_torque",
        convention:
          "Reported downstream ball-screw torque, not a Unit 4.1 output.",
        original: newtonMetres(0.441),
        normalized: newtonMetres(0.441),
        tolerance: {
          absolute: newtonMetres(0.001),
          rationale: "The source reports the value to three decimal places.",
        },
        sourcePageOrImage: "Image (32).jpg, printed p. 4",
        intendedModuleMapping: {
          loadCase: "unclassified",
          direction: "upward",
          status: "unclassified",
        },
      },
    ],
  },
  selectedParts: [
    {
      component: "ball screw",
      partNumber: "BSS1510-642 C5",
      sourceClaimedManufacturer: "MISUMI",
      verificationStatus: "source_only",
    },
    {
      component: "coupling",
      partNumber: "SCXW34-12-14",
      sourceClaimedManufacturer: "MISUMI",
      verificationStatus: "source_only",
    },
    {
      component: "linear guides",
      partNumber: "2x EGW Series",
      sourceClaimedManufacturer: "HIWIN",
      verificationStatus: "source_only",
    },
    {
      component: "servo motor",
      partNumber: "SV2-B040AS",
      sourceClaimedManufacturer: "Keyence",
      verificationStatus: "source_only",
      note: "The progress tracker conflicts by calling this part HIWIN; the source page calls it Keyence.",
    },
    {
      component: "servo drive",
      partNumber: "SV2-040L2",
      sourceClaimedManufacturer: "Keyence",
      verificationStatus: "source_only",
    },
  ],
  corrections: [
    "The p. 1 diagram labels ma as 75 N, while p. 4 explicitly calculates 30 kg x 1.5 m/s^2 = 45 N. The p. 4 equations and force results are authoritative for this fixture.",
    "The progress tracker calls SV2-B040AS a HIWIN product while the source pages call it Keyence. The fixture records the source claim without asserting a verified manufacturer.",
  ],
  unknowns: [
    "The original PDF filename is truncated in the screenshots and no source revision is available.",
    "No center-of-mass offset, guide resistance, external force/moment, brake holding case, or emergency-stop case is stated.",
    "The source does not confirm final installed parts or later design corrections.",
    "No independent vendor-sizing run is available in the repository.",
  ],
} as const satisfies AxisHistoricalFixture;
