import { describe, expect, it } from "vitest";
import { mapResultantToGuideFrame } from "./frame";
import {
  resolveBlockLoadsFromResultant,
  resolveEquivalentLoad,
  resolveVerticalUniformBlockLoads,
  type FourBlockLoads,
} from "./math";

// These tests are what make ./frame.ts's sign derivations checkable rather
// than merely argued. The mapping introduces five sign/axis choices between
// axis-load-cases' resolved axis.v1 vectors and the kernel's guide-frame
// inputs, and a wrong sign there would silently move load onto the wrong
// block — the exact class of error the Stage 1 spec re-read PMI's diagrams
// twice to avoid.

const GEOMETRY = { railSpacingM: 0.6, blockSpacingM: 0.4 } as const;

/**
 * The moment a force `F` applied at position `r` exerts about the guide
 * reference point, `M = r x F`, in the axis.v1 frame. Written out here rather
 * than imported so this test does not depend on axis-load-cases' own kernel:
 * the point is to check this module's mapping against PMI's printed formulas,
 * not to re-test the upstream module.
 */
function crossProduct(
  r: readonly [number, number, number],
  f: readonly [number, number, number],
): readonly [number, number, number] {
  return [
    r[1] * f[2] - r[2] * f[1],
    r[2] * f[0] - r[0] * f[2],
    r[0] * f[1] - r[1] * f[0],
  ];
}

function blockRadialLoads(loads: FourBlockLoads): number[] {
  return [
    loads.block1.radialN,
    loads.block2.radialN,
    loads.block3.radialN,
    loads.block4.radialN,
  ];
}

describe("mapResultantToGuideFrame against PMI's printed horizontal diagram", () => {
  it("reproduces resolveHorizontalUniformBlockLoads (B17) from a force at a position", () => {
    // PMI's B17 scenario expressed the way axis-load-cases actually delivers
    // it: a downward force F applied at a point offset l3 along the direction
    // of travel (+X) and l4 across the rails (+Y), resolved into a force
    // vector and the moment that force exerts about the guide reference point.
    const F = 1000;
    const l3 = 0.1;
    const l4 = 0.05;

    const forceN = [0, 0, -F] as const;
    const position = [l3, l4, 0] as const;
    const momentNm = crossProduct(position, forceN);

    const viaMapping = resolveBlockLoadsFromResultant(
      mapResultantToGuideFrame(forceN, momentNm, GEOMETRY),
    );
    const printed = resolveHorizontalUniformReference(F, l3, l4);

    expect(viaMapping).toEqual(printed);
  });

  it("puts more load on the rail the load sits over, not the far one", () => {
    // Guards the rollMomentNm = -Mx negation specifically: getting that sign
    // backwards still conserves total force and still passes a symmetry
    // check, so only a directional assertion catches it.
    const forceN = [0, 0, -1000] as const;
    const momentNm = crossProduct([0, 0.1, 0], forceN);

    const loads = resolveBlockLoadsFromResultant(
      mapResultantToGuideFrame(forceN, momentNm, GEOMETRY),
    );

    // Blocks 3 and 4 are the +Y rail (./frame.ts's stated block layout).
    expect(loads.block3.radialN).toBeGreaterThan(loads.block2.radialN);
    expect(loads.block4.radialN).toBeGreaterThan(loads.block1.radialN);
  });

  it("puts more load on the carriage pair the load sits over, along travel", () => {
    // The companion guard for pitchMomentNm = +My.
    const forceN = [0, 0, -1000] as const;
    const momentNm = crossProduct([0.05, 0, 0], forceN);

    const loads = resolveBlockLoadsFromResultant(
      mapResultantToGuideFrame(forceN, momentNm, GEOMETRY),
    );

    // Blocks 1 and 4 are the +X pair.
    expect(loads.block1.radialN).toBeGreaterThan(loads.block2.radialN);
    expect(loads.block4.radialN).toBeGreaterThan(loads.block3.radialN);
  });

  it("reacts a yawing moment over the carriage spacing, not the rail spacing", () => {
    // The defect PMI's Chapter 9 caught. With the two spacings deliberately
    // different, using the wrong lever arm changes the answer, so this is a
    // real guard rather than a restatement of the formula.
    const yawNm = 240;
    const loads = resolveBlockLoadsFromResultant(
      mapResultantToGuideFrame([0, 0, -1000], [0, 0, yawNm], GEOMETRY),
    );
    expect(loads.block1.lateralN).toBeCloseTo(
      yawNm / (2 * GEOMETRY.blockSpacingM),
      9,
    );
    expect(loads.block1.lateralN).not.toBeCloseTo(
      yawNm / (2 * GEOMETRY.railSpacingM),
      6,
    );
    // Signed and zero-sum, as PMI's own Chapter 9 numbers are.
    expect(loads.block2.lateralN).toBeCloseTo(-loads.block1.lateralN, 9);
    expect(
      loads.block1.lateralN +
        loads.block2.lateralN +
        loads.block3.lateralN +
        loads.block4.lateralN,
    ).toBeCloseTo(0, 9);
  });

  it("turns a downward force into positive block radial loads", () => {
    const loads = resolveBlockLoadsFromResultant(
      mapResultantToGuideFrame([0, 0, -800], [0, 0, 0], GEOMETRY),
    );
    for (const radial of blockRadialLoads(loads)) {
      expect(radial).toBeCloseTo(200, 9);
    }
  });
});

describe("mapResultantToGuideFrame for an axial (along-rail) force", () => {
  it("gives a purely axial force no block share at all", () => {
    // PMI's own vertical diagram (B19) has no F/4 term because the drive
    // reacts a force acting along the rails. A vertical axis' weight is
    // exactly that force, so this asserts the module reproduces that absence
    // rather than inventing a share for it.
    const loads = resolveBlockLoadsFromResultant(
      mapResultantToGuideFrame([-1500, 0, 0], [0, 0, 0], GEOMETRY),
    );
    // toBeCloseTo, not toBe: negating a zero Z force yields -0, which is
    // numerically zero but fails Object.is against +0.
    for (const radial of blockRadialLoads(loads)) {
      expect(radial).toBeCloseTo(0, 12);
    }
    expect(loads.block1.lateralN).toBeCloseTo(0, 12);
  });

  it("reaches the blocks only through the moment a centre-of-mass offset creates", () => {
    // The same vertical-axis weight, now offset from the mounting plane by
    // 120 mm. That offset is what actually loads the guide.
    const forceN = [-1500, 0, 0] as const;
    const momentNm = crossProduct([0, 0, 0.12], forceN);

    const loads = resolveBlockLoadsFromResultant(
      mapResultantToGuideFrame(forceN, momentNm, GEOMETRY),
    );

    const radials = blockRadialLoads(loads);
    expect(radials.some((value) => value !== 0)).toBe(true);
    // A pure moment produces no net force: the four blocks must cancel.
    expect(radials.reduce((sum, value) => sum + value, 0)).toBeCloseTo(0, 9);
  });
});

describe("the general form against PMI's printed vertical diagram (B19)", () => {
  it("agrees on every block's equivalent load, differing only in sign", () => {
    // Closing the one gap math.test.ts's own subsumption tests leave open.
    // PMI's B19 prints an identical radial magnitude on all four blocks;
    // resolving the same overturning moment through the general form gives
    // the equilibrium-correct signed distribution instead (+M/(2*l1) on one
    // rail, -M/(2*l1) on the other). The magnitudes are identical, so the
    // per-block equivalent load -- which is what this module actually reports,
    // and which takes |PR| + |PT| -- is unaffected by the difference. That is
    // worth asserting rather than reasoning about, because it is the reason
    // routing the vertical case through the general form is safe.
    const F = 900;
    const l1 = 0.5;
    const l2 = 0.2;

    const printed = resolveVerticalUniformBlockLoads({
      forceN: F,
      spacingL1M: l1,
      offsetL2M: l2,
      offsetL4M: 0,
    });
    const general = resolveBlockLoadsFromResultant({
      normalForceN: 0,
      lateralForceN: 0,
      yawMomentNm: 0,
      rollMomentNm: F * l2,
      pitchMomentNm: 0,
      railSpacingM: l1,
      blockSpacingM: 0.3,
    });

    for (const key of ["block1", "block2", "block3", "block4"] as const) {
      expect(resolveEquivalentLoad(general[key])).toBeCloseTo(
        resolveEquivalentLoad(printed[key]),
        9,
      );
    }
    // The signs genuinely differ -- this is not a claim that the two agree
    // block for block.
    expect(general.block2.radialN).not.toBeCloseTo(printed.block2.radialN, 6);
  });
});

/**
 * PMI's printed B17 formula set, written out directly rather than called from
 * ./math.ts. Re-deriving the expected numbers here means the equality test
 * above compares the mapping against the source's own formula, not against
 * another function that could drift with it.
 */
function resolveHorizontalUniformReference(
  F: number,
  l3: number,
  l4: number,
): FourBlockLoads {
  const base = F / 4;
  // PMI's own denominators: l3 (along travel) over its l1, which is the
  // carriage spacing along travel; l4 (transverse) over its l2, the rail
  // spacing. See ./math.ts's header for how that reading was established.
  const pitchTerm = (F * l3) / (2 * GEOMETRY.blockSpacingM);
  const rollTerm = (F * l4) / (2 * GEOMETRY.railSpacingM);
  return {
    block1: { radialN: base + pitchTerm - rollTerm, lateralN: 0 },
    block2: { radialN: base - pitchTerm - rollTerm, lateralN: 0 },
    block3: { radialN: base - pitchTerm + rollTerm, lateralN: 0 },
    block4: { radialN: base + pitchTerm + rollTerm, lateralN: 0 },
  };
}
