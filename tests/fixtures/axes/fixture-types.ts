/**
 * A source-preserving, sanitized record for a historical linear-axis case.
 *
 * These fixtures intentionally store reported values rather than reproducing
 * a source calculation. Module tests must calculate their own result and
 * compare it with the documented expectation.
 */
export type FixtureQuantity = Readonly<{
  value: number;
  unit: string;
}>;

export type AxisMotionPhase = Readonly<{
  id: string;
  sourceLabel: string;
  direction: string;
  velocity: FixtureQuantity | null;
  acceleration: FixtureQuantity | null;
  duration: FixtureQuantity | null;
}>;

export type AxisFixtureInputs = Readonly<{
  orientation: "horizontal" | "vertical" | "inclined";
  inclineAngle: FixtureQuantity | null;
  positiveTravel: string;
  masses: Readonly<{
    totalMovingMass: FixtureQuantity;
    payload: FixtureQuantity | null;
    carriage: FixtureQuantity | null;
    additional: FixtureQuantity | null;
    sourceBreakdown: string;
  }>;
  centerOfMass: readonly FixtureQuantity[] | null;
  frictionCoefficient: FixtureQuantity | null;
  guideResistance: FixtureQuantity | null;
  externalForces: readonly FixtureQuantity[];
  externalMoments: readonly FixtureQuantity[];
  motionPhases: readonly AxisMotionPhase[];
  dutyCycle: Readonly<{
    cycleTime: FixtureQuantity | null;
    movingTime: FixtureQuantity | null;
    note: string;
  }> | null;
  gravity: FixtureQuantity;
}>;

export type FixtureEvidence = Readonly<{
  rawMaterialPath: string;
  printedPage: string;
  rawMaterialSha256: string;
  documentTitle: string;
  documentRevision: string | null;
  extractionNote: string;
}>;

export type ExpectedMetric = Readonly<{
  id: string;
  sourceLabel: string;
  metric: string;
  convention: string;
  original: FixtureQuantity;
  normalized: FixtureQuantity;
  tolerance: Readonly<{
    absolute: FixtureQuantity;
    rationale: string;
  }>;
  sourcePageOrImage: string;
  intendedModuleMapping: Readonly<{
    loadCase: "normal" | "peak" | "holding" | "emergency_stop" | "unclassified";
    direction: string;
    status: "confirmed" | "unclassified";
  }>;
}>;

export type SelectedPart = Readonly<{
  component: string;
  partNumber: string;
  sourceClaimedManufacturer: string | null;
  verificationStatus: "not_verified" | "source_only" | "verified";
  note?: string;
}>;

export type AxisHistoricalFixture = Readonly<{
  id: string;
  revision: string;
  classification: "sanitized_historical_project";
  evidenceStatus: "draft" | "release_candidate" | "release_grade";
  sanitization: Readonly<{
    sourceCaseId: string;
    removedIdentifiers: readonly string[];
    reviewedOn: string;
  }>;
  coverage: readonly string[];
  sourceEvidence: readonly FixtureEvidence[];
  originalInputs: AxisFixtureInputs;
  normalizedInputs: AxisFixtureInputs;
  expectedResults: Readonly<{
    axisLoadCases: readonly ExpectedMetric[];
    downstreamReferenceValues: readonly ExpectedMetric[];
  }>;
  selectedParts: readonly SelectedPart[];
  corrections: readonly string[];
  unknowns: readonly string[];
}>;
