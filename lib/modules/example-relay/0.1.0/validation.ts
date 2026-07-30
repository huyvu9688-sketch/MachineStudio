// Validation record for the example-relay fixture. The SDK requires every
// registered package to carry one; this record states plainly that the fixture
// has no engineering method to validate, rather than implying a review that
// never happened. A production module must instead complete the Stage-4
// validation record in `validation/module-validation-template.md`.

import type { ValidationRecord } from "@/lib/engine";

export const validation: ValidationRecord = {
  moduleId: "example-relay",
  moduleVersion: "0.1.0",
  methods: ["Identity pass-through — no engineering method"],
  sourceRevisionIds: [],
  referenceExamples: [
    {
      id: "identity",
      description:
        "A relayed value equals its input value; asserted by the module's own conformance test.",
      tolerance: "exact",
    },
  ],
  independentBenchmark:
    "Not applicable — the fixture performs no calculation to benchmark.",
  reviewer: "Not reviewed — development fixture, not for engineering use.",
  reviewDate: "n/a",
  supportedUseLimits: [
    "Integration test and development fixture only.",
    "Produces no engineering result and must not be used in a real machine configuration.",
  ],
  deviations: [],
};
