// Digitized SMC CXS2 "Model Selection" load-mass-vs-overhang-length
// dataset (Unit 7.4). Every (overhang, load mass) point below is read
// directly off the founder-supplied graph images
// (reference/source-material/dual-rod-cylinder/) to 2 significant
// figures -- the precision ceiling of reading a printed log-log chart by
// eye. See context/modules/dual-rod-cylinder-sizing/stage-1-spec.md
// "Load-bearing check" and docs/superpowers/specs/
// 2026-08-26-dual-rod-cylinder-sizing-design.md "Digitized dataset" for
// the full source table this file transcribes row for row. Founder
// review of this table against the source graphs is expected before
// catalog seeding (a later task) -- the same "founder review/trim
// pending" treatment every prior catalog seed in this project received,
// given the added risk of eye-reading log-log curves versus transcribing
// a printed table.
//
// A row with no flat plateau (sloped from its very first digitized
// point, e.g. vertical bore 6 at every speed band) sets
// plateauEndOverhangMm equal to that first point's own overhang --
// resolveAllowableLoadMass's own plateau branch then returns an exact
// match at that single point, not a divide-by-zero (see math.ts).

import type { LoadMassCurve } from "./math";

export const DUAL_ROD_LOAD_MASS_CURVES: readonly LoadMassCurve[] = [
  // --- Vertical mounting (graphs 1-8; no stroke-band split) -----------------
  // Graph 1, <=200mm/s, bore 6.
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 5, plateauLoadMassKg: 0.9, edgeOverhangMm: 100, edgeLoadMassKg: 0.04 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 6, bearingType: "ball_bushing", plateauEndOverhangMm: 7, plateauLoadMassKg: 0.95, edgeOverhangMm: 100, edgeLoadMassKg: 0.055 },
  // Graph 2, <=400mm/s, bore 6.
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 20, plateauLoadMassKg: 0.2, edgeOverhangMm: 100, edgeLoadMassKg: 0.038 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 6, bearingType: "ball_bushing", plateauEndOverhangMm: 22, plateauLoadMassKg: 0.2, edgeOverhangMm: 100, edgeLoadMassKg: 0.05 },
  // Graph 3, <=600mm/s, bore 6.
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 38, plateauLoadMassKg: 0.085, edgeOverhangMm: 100, edgeLoadMassKg: 0.035 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 6, bearingType: "ball_bushing", plateauEndOverhangMm: 45, plateauLoadMassKg: 0.085, edgeOverhangMm: 100, edgeLoadMassKg: 0.045 },
  // Graph 4, <=800mm/s, bore 6.
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 80, plateauLoadMassKg: 0.038, edgeOverhangMm: 100, edgeLoadMassKg: 0.033 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "ball_bushing", plateauEndOverhangMm: 100, plateauLoadMassKg: 0.038, edgeOverhangMm: 100, edgeLoadMassKg: 0.038 },
  // Graph 5, <=200mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 5, plateauLoadMassKg: 2.7, edgeOverhangMm: 100, edgeLoadMassKg: 0.095 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 10, bearingType: "ball_bushing", plateauEndOverhangMm: 7, plateauLoadMassKg: 3.7, edgeOverhangMm: 100, edgeLoadMassKg: 0.19 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 5.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.43 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 5.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.57 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 8.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.70 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 10, plateauLoadMassKg: 8.5, edgeOverhangMm: 100, edgeLoadMassKg: 0.95 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 12, plateauLoadMassKg: 10.5, edgeOverhangMm: 100, edgeLoadMassKg: 1.05 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 12, plateauLoadMassKg: 10.5, edgeOverhangMm: 100, edgeLoadMassKg: 1.30 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 19, plateauLoadMassKg: 13.0, edgeOverhangMm: 100, edgeLoadMassKg: 2.70 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 19, plateauLoadMassKg: 13.0, edgeOverhangMm: 100, edgeLoadMassKg: 2.70 },
  // Graph 6, <=400mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 15, plateauLoadMassKg: 0.2, edgeOverhangMm: 100, edgeLoadMassKg: 0.10 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 10, bearingType: "ball_bushing", plateauEndOverhangMm: 30, plateauLoadMassKg: 0.2, edgeOverhangMm: 100, edgeLoadMassKg: 0.17 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 33, plateauLoadMassKg: 0.8, edgeOverhangMm: 100, edgeLoadMassKg: 0.42 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 42, plateauLoadMassKg: 0.8, edgeOverhangMm: 100, edgeLoadMassKg: 0.58 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 33, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.72 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 33, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 1.0 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 33, plateauLoadMassKg: 2.0, edgeOverhangMm: 100, edgeLoadMassKg: 1.35 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 50, plateauLoadMassKg: 2.0, edgeOverhangMm: 100, edgeLoadMassKg: 1.6 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 55, plateauLoadMassKg: 3.1, edgeOverhangMm: 100, edgeLoadMassKg: 2.4 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 55, plateauLoadMassKg: 3.1, edgeOverhangMm: 100, edgeLoadMassKg: 2.7 },
  // Graph 7, <=600mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 35, plateauLoadMassKg: 0.38, edgeOverhangMm: 100, edgeLoadMassKg: 0.105 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 10, bearingType: "ball_bushing", plateauEndOverhangMm: 55, plateauLoadMassKg: 0.38, edgeOverhangMm: 100, edgeLoadMassKg: 0.16 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 100, plateauLoadMassKg: 0.53, edgeOverhangMm: 100, edgeLoadMassKg: 0.53 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 100, plateauLoadMassKg: 0.53, edgeOverhangMm: 100, edgeLoadMassKg: 0.53 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 65, plateauLoadMassKg: 0.9, edgeOverhangMm: 100, edgeLoadMassKg: 0.70 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 65, plateauLoadMassKg: 0.9, edgeOverhangMm: 100, edgeLoadMassKg: 0.85 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 100, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 1.1 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 100, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 1.1 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 100, plateauLoadMassKg: 1.4, edgeOverhangMm: 100, edgeLoadMassKg: 1.4 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 100, plateauLoadMassKg: 1.4, edgeOverhangMm: 100, edgeLoadMassKg: 1.4 },
  // Graph 8, <=700mm/s (<=800 for bore 10), bores 10/16/20.
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 55, plateauLoadMassKg: 0.2, edgeOverhangMm: 100, edgeLoadMassKg: 0.115 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "ball_bushing", plateauEndOverhangMm: 100, plateauLoadMassKg: 0.2, edgeOverhangMm: 100, edgeLoadMassKg: 0.2 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.7, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 100, plateauLoadMassKg: 0.39, edgeOverhangMm: 100, edgeLoadMassKg: 0.39 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.7, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 100, plateauLoadMassKg: 0.39, edgeOverhangMm: 100, edgeLoadMassKg: 0.39 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.7, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 100, plateauLoadMassKg: 0.58, edgeOverhangMm: 100, edgeLoadMassKg: 0.58 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.7, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 100, plateauLoadMassKg: 0.58, edgeOverhangMm: 100, edgeLoadMassKg: 0.58 },

  // --- Horizontal mounting (graphs 9-21) ------------------------------------
  // Graph 9, <=10mm stroke, bore 6 (CXS2M only per the design doc's own "dashed = <=400 line only" note -- no CXS2L row seeded for graph 9).
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.045, edgeOverhangMm: 33, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.08, edgeOverhangMm: 44, edgeLoadMassKg: 0.01 },
  // Graph 10, <=30mm stroke, bore 6.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.038, edgeOverhangMm: 20, edgeLoadMassKg: 0.01 },
  // Graph 10 CXS2L (ball_bushing) speed rating read as the "(L)"-annotated
  // <=400mm/s branch of the source table's own "<=400 (L) / <=800mm/s"
  // speed-band cell -- structurally different from graph 9's own two-speed
  // cell (which splits by SPEED within one bearing type, CXS2M only, since
  // CXS2L had no data there). Here "(L)" instead splits by BEARING TYPE:
  // CXS2L is rated to <=400mm/s, CXS2M (unlabeled/default) to <=800mm/s.
  // No legend in the source table resolves this explicitly -- flagged for
  // founder confirmation against the real graph 10 image before catalog
  // seeding, the same "founder review/trim pending" treatment this file's
  // own header comment already calls for on the whole dataset.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 6, bearingType: "ball_bushing", plateauEndOverhangMm: 5, plateauLoadMassKg: 0.07, edgeOverhangMm: 28, edgeLoadMassKg: 0.01 },
  // Graph 11, <=50mm stroke, bore 6.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.03, edgeOverhangMm: 13, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.038, edgeOverhangMm: 19, edgeLoadMassKg: 0.01 },
  // Graph 12, <=75mm stroke, bore 6.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.028, edgeOverhangMm: 15, edgeLoadMassKg: 0.005 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.038, edgeOverhangMm: 24, edgeLoadMassKg: 0.005 },
  // Graph 13, <=100mm stroke, bore 6.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.028, edgeOverhangMm: 8, edgeLoadMassKg: 0.005 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.038, edgeOverhangMm: 15, edgeLoadMassKg: 0.005 },
  // Graph 14, <=10mm stroke, <=400mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.6, edgeOverhangMm: 100, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 10, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.4, edgeOverhangMm: 100, edgeLoadMassKg: 0.02 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 1.5, edgeOverhangMm: 100, edgeLoadMassKg: 0.04 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.06 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 1.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.07 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 1.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.11 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 9, plateauLoadMassKg: 3.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.18 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 9, plateauLoadMassKg: 3.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.23 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 9, plateauLoadMassKg: 3.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.30 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 9, plateauLoadMassKg: 3.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.40 },
  // Graph 15, <=10mm stroke, >400mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.2, edgeOverhangMm: 100, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.2, edgeOverhangMm: 100, edgeLoadMassKg: 0.017 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.7, edgeOverhangMm: 100, edgeLoadMassKg: 0.04 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.7, edgeOverhangMm: 100, edgeLoadMassKg: 0.055 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.065 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.10 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 18, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.16 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 18, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.21 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 18, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.28 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 18, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.35 },
  // Graph 16, <=30mm stroke, <=400mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.15, edgeOverhangMm: 100, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 10, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.28, edgeOverhangMm: 100, edgeLoadMassKg: 0.013 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.35, edgeOverhangMm: 100, edgeLoadMassKg: 0.03 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.35, edgeOverhangMm: 100, edgeLoadMassKg: 0.045 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.65, edgeOverhangMm: 100, edgeLoadMassKg: 0.045 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.65, edgeOverhangMm: 100, edgeLoadMassKg: 0.10 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.10 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.19 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 2.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.19 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 2.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.30 },
  // Graph 17, <=30mm stroke, >400mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.12, edgeOverhangMm: 100, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.20, edgeOverhangMm: 100, edgeLoadMassKg: 0.012 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.42, edgeOverhangMm: 100, edgeLoadMassKg: 0.028 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.42, edgeOverhangMm: 100, edgeLoadMassKg: 0.04 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.65, edgeOverhangMm: 100, edgeLoadMassKg: 0.045 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.65, edgeOverhangMm: 100, edgeLoadMassKg: 0.06 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 13, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.10 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 13, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.20 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 13, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.20 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 13, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.30 },
  // Graph 18, <=50mm stroke, <=400mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.35, edgeOverhangMm: 100, edgeLoadMassKg: 0.02 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.35, edgeOverhangMm: 100, edgeLoadMassKg: 0.045 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.6, edgeOverhangMm: 100, edgeLoadMassKg: 0.04 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.6, edgeOverhangMm: 100, edgeLoadMassKg: 0.08 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.9, edgeOverhangMm: 100, edgeLoadMassKg: 0.08 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.9, edgeOverhangMm: 100, edgeLoadMassKg: 0.15 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.17 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.25 },
  // Graph 19, <=50mm stroke, >400mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.35, edgeOverhangMm: 100, edgeLoadMassKg: 0.018 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.35, edgeOverhangMm: 100, edgeLoadMassKg: 0.04 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.55, edgeOverhangMm: 100, edgeLoadMassKg: 0.038 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.55, edgeOverhangMm: 100, edgeLoadMassKg: 0.07 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.9, edgeOverhangMm: 100, edgeLoadMassKg: 0.075 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.9, edgeOverhangMm: 100, edgeLoadMassKg: 0.14 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.16 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.24 },
  // Graph 20, <=75mm stroke, >400mm/s, bores 10/16/20/25/32 (bore 10 has no CXS2L row -- design doc shows "--").
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.28, edgeOverhangMm: 33, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.28, edgeOverhangMm: 100, edgeLoadMassKg: 0.014 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.42, edgeOverhangMm: 100, edgeLoadMassKg: 0.02 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.42, edgeOverhangMm: 100, edgeLoadMassKg: 0.032 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.55, edgeOverhangMm: 100, edgeLoadMassKg: 0.06 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.65, edgeOverhangMm: 100, edgeLoadMassKg: 0.06 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.85, edgeOverhangMm: 100, edgeLoadMassKg: 0.12 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.11 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.20 },
  // Graph 21, <=100mm stroke, >400mm/s, bores 10/16/20/25/32 (bore 10 has no CXS2L row -- design doc shows "--").
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.22, edgeOverhangMm: 20, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.22, edgeOverhangMm: 100, edgeLoadMassKg: 0.011 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.55, edgeOverhangMm: 100, edgeLoadMassKg: 0.02 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.35, edgeOverhangMm: 100, edgeLoadMassKg: 0.023 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.55, edgeOverhangMm: 100, edgeLoadMassKg: 0.045 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.55, edgeOverhangMm: 100, edgeLoadMassKg: 0.043 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.10 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.10 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.17 },
];
