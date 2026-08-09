// The axis.v1 -> guide-frame mapping for the linear-guide module (Unit 4.4,
// Stage 3). This is the one piece of engineering judgement Stage 3 had to add
// on top of the Stage 1 kernel and the Stage 2 contract, so it lives in its
// own file rather than buried in compute().
//
// WHY A MAPPING IS NEEDED AT ALL
//
// context/modules/linear-guide/stage-2-contract.md "Decisions" item 1 settled
// that this module consumes `axis-load-cases`' resolved
// motion.axis.resultant_force / resultant_moment per case, rather than
// re-deriving gravity, friction, and inertia from mass and acceleration. Those
// arrive as three-component vectors in the `axis.v1` frame
// (context/modules/axis-load-cases/stage-1-spec.md "Proposed Coordinate and
// Sign Convention"). ./math.ts's resolveBlockLoadsFromResultant, by contrast,
// speaks in guide terms: a force normal to the mounting plane, a force in it,
// and three moments each named for the block pair that reacts it. Something
// has to translate, and that translation is a set of sign and axis choices
// that must be written down once, tested, and cited — not repeated inline.
//
// THE GUIDE FRAME THIS MODULE FIXES
//
//   - The two rails run parallel to +X (the declared positive travel
//     direction) and are separated along +/-Y by guide.rail_spacing.
//   - The two blocks on one rail are separated along +/-X by
//     guide.block_spacing.
//   - The mounting-plane normal is +/-Z. A load pressing the carriage into
//     its mounting plane (i.e. acting in -Z) produces a positive block radial
//     load, matching PMI's own sign convention for a downward force on a
//     horizontally mounted guide.
//   - Block positions, matching ./math.ts's own documented B17 layout:
//     block 1 = (+X, -Y), block 2 = (-X, -Y), block 3 = (-X, +Y),
//     block 4 = (+X, +Y). So blocks 1 and 4 are the leading carriage pair
//     along travel, and blocks 3 and 4 sit on the +Y rail.
//
// This frame is the SAME for both supported installation orientations, and
// that is a real simplification worth stating explicitly rather than leaving
// implicit: PMI needs separate horizontal and vertical formula sets only
// because its own method re-derives gravity from mass, so which way the guide
// faces changes the formula. Here gravity is already resolved into the
// incoming force and moment upstream, so orientation selects no formula. It
// remains a declared module input for two other reasons — rejecting the
// out-of-scope `inclined` case, and recording the installation in the trace.
//
// The vertical case does place one extra requirement on the engineer, and the
// module states it as an assumption rather than silently assuming it: axis.v1
// leaves +Y free to be chosen for a vertical axis ("it is selected by the
// engineer for a vertical axis", coordinate convention item 3), so this module
// requires that choice to be the in-plane transverse direction, which puts the
// mounting-plane normal on +/-Z as above. Nothing in the resolved input can
// detect a different choice, which is exactly why it is an assumption on the
// report rather than a check.
//
// CONFIDENCE, PER TERM — NOW UNIFORM, BUT IT WAS NOT
//
// Each of the three moment components is routed to the block pair that
// physically reacts it: roll (about the direction of travel) across the two
// rails, pitch (about the transverse axis) along the fore/aft carriage pairs,
// and yaw (about the mounting-plane normal) laterally on those same fore/aft
// pairs. PMI's printed page B17 confirms the two radial routings directly, and
// Stage 4's reproduction of PMI's own Chapter 9 worked example
// (./pmi-chapter-9.ts) confirms all three, including the yaw lever arm and the
// alternating lateral signs.
//
// The yaw routing was wrong before that reproduction, and the reason is worth
// keeping: the Stage 1 spec read PMI's `l1` as the rail spacing and `l2` as
// the carriage spacing, when they are the other way round. Every PMI lateral
// formula divides by `2*l1`, so under the mistaken reading it looked as though
// PMI were reacting a yawing moment across the rails — physically impossible,
// which is exactly why the project recorded it as a suspicious open item
// rather than trusting it. It was PMI's letters that were misread, not PMI's
// physics. ./math.ts's header sets out the evidence.

import type { ResultantBlockLoadInput } from "./math";

/** The two installation orientations this module version supports. */
export type SupportedOrientation = "horizontal" | "vertical";

/** A three-component vector resolved in the `axis.v1` frame: `[X, Y, Z]`. */
export type AxisComponents = readonly [number, number, number];

/** Guide geometry consumed by the mapping. */
export interface GuideGeometry {
  /** Distance between the two rails, in m. */
  readonly railSpacingM: number;
  /** Distance between the two blocks on one rail, in m. */
  readonly blockSpacingM: number;
}

/**
 * Maps one load case's resolved `axis.v1` force and moment onto the guide-frame
 * inputs of {@link import("./math").resolveBlockLoadsFromResultant}.
 *
 * Sign derivations, each stated so a reviewer can check the algebra rather
 * than trust the result:
 *
 * - `normalForceN = -Fz`. A force in `-Z` presses the carriage into its
 *   mounting plane and must come out as a positive block radial load.
 * - `lateralForceN = Fy`. The in-plane transverse force component, shared
 *   equally across four identical blocks. No PMI diagram in scope prints this
 *   term (none shows a net lateral force), so ./math.ts already flags the
 *   `F/4` share as elementary statics rather than source-confirmed.
 * - `rollMomentNm = -Mx`. A downward force `F` at transverse offset `y` gives
 *   `M = r x F = (0,y,0) x (0,0,-F)`, whose `X` component is `-F*y`. The
 *   heavier-loaded rail is the one the load sits over, so the kernel's
 *   `rollMomentNm` must come out `+F*y`, hence the negation.
 * - `pitchMomentNm = +My`. The same load at along-travel offset `x` gives
 *   `M = (x,0,0) x (0,0,-F)` with `Y` component `+F*x`, which is already the
 *   sign the kernel wants. No negation.
 * - `yawMomentNm = Mz`. The yawing moment about the mounting-plane normal,
 *   reacted laterally by the fore and aft carriage pairs.
 *
 * Note what is deliberately dropped: `Fx`, the force component along the rails.
 * It produces no block share because the drive reacts it, which is why PMI's
 * own vertical diagram (printed page B19) has no `F/4` term at all. Dropping it
 * is not an approximation — but it does mean a vertical axis' weight reaches
 * the blocks only through the moment its centre-of-mass offset creates, so a
 * caller that supplies no centre-of-mass offset will correctly see zero block
 * load from a purely axial resolved force.
 */
export function mapResultantToGuideFrame(
  forceN: AxisComponents,
  momentNm: AxisComponents,
  geometry: GuideGeometry,
): ResultantBlockLoadInput {
  const [, forceY, forceZ] = forceN;
  const [momentX, momentY, momentZ] = momentNm;

  return {
    normalForceN: -forceZ,
    lateralForceN: forceY,
    rollMomentNm: -momentX,
    pitchMomentNm: momentY,
    yawMomentNm: momentZ,
    railSpacingM: geometry.railSpacingM,
    blockSpacingM: geometry.blockSpacingM,
  };
}
