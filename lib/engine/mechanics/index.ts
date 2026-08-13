// Public surface of the rigid-body mechanics package (Unit 6.1). Generic,
// source-independent physics only — moment of inertia and Ta = J*alpha. See
// ./README.md and context/adr/0011-motor-sizing-tool-architecture.md "Reuse
// policy" for why this lives beside lib/engine/units and lib/engine/values
// rather than being reproduced inside each mechanism module.

export { MechanicsInputError } from "./errors";

export type { InertiaResult } from "./inertia";
export type {
  PointMassInertiaInput,
  SolidCylinderInertiaInput,
  SolidCylinderInertiaFromDensityInput,
  HollowCylinderInertiaInput,
  HollowCylinderInertiaFromDensityInput,
  RectangularPillarInertiaInput,
  OffsetAxisInertiaInput,
  LinearMotionInertiaInput,
} from "./inertia";
export {
  pointMassInertia,
  solidCylinderInertia,
  solidCylinderInertiaFromDensity,
  hollowCylinderInertia,
  hollowCylinderInertiaFromDensity,
  rectangularPillarInertia,
  offsetAxisInertia,
  linearMotionInertia,
} from "./inertia";

export type {
  AccelerationTorqueInput,
  AccelerationTorqueResult,
  AngularAccelerationFromSpeedRampInput,
  AngularAccelerationResult,
} from "./torque";
export { accelerationTorque, angularAccelerationFromSpeedRamp } from "./torque";
