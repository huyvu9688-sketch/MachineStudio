// Domain-facing contracts for the machine-baseline repository (Unit 2.9 part
// 2). Mirrors run-types.ts's summary/record split: `MachineBaselineSummary`
// omits the (potentially large) snapshot payload for list views;
// `MachineBaselineRecord` carries the full validated snapshot for rendering.

import type { MachineBaselineSnapshot } from "../../configuration";
import type { MachineConfigurationId, UserId } from "./types";

/** A `MachineBaseline` ID. */
export type MachineBaselineId = string & { readonly __brand: "MachineBaselineId" };

/** Casts a raw string to a {@link MachineBaselineId}. Identity at runtime. */
export function asMachineBaselineId(id: string): MachineBaselineId {
  return id as MachineBaselineId;
}

/** A baseline's search-critical summary (no snapshot payload). */
export interface MachineBaselineSummary {
  readonly id: MachineBaselineId;
  readonly configurationId: MachineConfigurationId;
  readonly label: string;
  readonly createdByUserId: UserId | null;
  readonly createdAt: Date;
}

/** A fully loaded baseline: its summary plus the validated immutable snapshot. */
export interface MachineBaselineRecord extends MachineBaselineSummary {
  readonly snapshot: MachineBaselineSnapshot;
}

/** Input to persist a new `MachineBaseline`. */
export interface CreateMachineBaselineInput {
  readonly configurationId: MachineConfigurationId;
  readonly label: string;
  readonly snapshot: MachineBaselineSnapshot;
  readonly createdByUserId?: UserId;
}
