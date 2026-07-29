// Domain-facing contracts for the parameter-graph repository (Unit 2.2):
// ParameterValue (an authored value at a graph node) and ParameterLink (a
// confirmed source→sink link), plus the input-resolution result types
// (context/architecture.md "Calculation": ParameterValue, ParameterLink).
//
// Node semantics are reused from the engine so persistence and the pure graph
// stay in lockstep: `nodeKind`/`sourceKind` are the engine's `GraphNodeKind`
// (Unit 1.8) and a value payload is an `EngineeringValue` (Unit 1.1). Nothing
// here is module-specific — nodes are identified by canonical `parameterId`.

import type { GraphNodeKind } from "../../engine/graph";
import type { LoadCaseCategory } from "../../engine/parameters";
import type { EngineeringValue } from "../../engine/values";
import type {
  AssemblyId,
  MachineConfigurationId,
  ModuleInstanceId,
} from "./types";

/** A `ParameterValue` ID. */
export type ParameterValueId = string & { readonly __brand: "ParameterValueId" };
/** A `ParameterLink` ID. */
export type ParameterLinkId = string & { readonly __brand: "ParameterLinkId" };

/** Casts a raw string to a {@link ParameterValueId}. Identity at runtime. */
export function asParameterValueId(id: string): ParameterValueId {
  return id as ParameterValueId;
}
/** Casts a raw string to a {@link ParameterLinkId}. Identity at runtime. */
export function asParameterLinkId(id: string): ParameterLinkId {
  return id as ParameterLinkId;
}

/**
 * The role a persisted value node plays in the graph. Identical to the engine's
 * `GraphNodeKind` (the Prisma `ParameterNodeKind` enum mirrors it), reused here
 * so a persisted node reconstructs into the pure graph without translation.
 */
export type ParameterNodeKind = GraphNodeKind;

/** How an authored `ParameterValue` was supplied (see the Prisma enum). */
export type ParameterValueSource = "manual" | "workflow";

// --- Records -------------------------------------------------------------

/** A persisted `ParameterValue` row; `value` is validated on read. */
export interface ParameterValueRecord {
  readonly id: ParameterValueId;
  readonly configurationId: MachineConfigurationId;
  /** Scope of a provider value; null = machine/configuration root scope. */
  readonly assemblyId: AssemblyId | null;
  /** Set when this value is entered on a module input port. */
  readonly moduleInstanceId: ModuleInstanceId | null;
  readonly nodeKind: ParameterNodeKind;
  readonly parameterId: string;
  readonly loadCase: LoadCaseCategory | null;
  readonly source: ParameterValueSource;
  readonly value: EngineeringValue;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** A persisted `ParameterLink` row (a confirmed source→sink link). */
export interface ParameterLinkRecord {
  readonly id: ParameterLinkId;
  readonly configurationId: MachineConfigurationId;
  readonly targetModuleInstanceId: ModuleInstanceId;
  readonly targetParameterId: string;
  readonly targetLoadCase: LoadCaseCategory | null;
  readonly sourceKind: ParameterNodeKind;
  readonly sourceModuleInstanceId: ModuleInstanceId | null;
  readonly sourceAssemblyId: AssemblyId | null;
  readonly sourceParameterId: string;
  readonly sourceLoadCase: LoadCaseCategory | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// --- Create inputs -------------------------------------------------------

/**
 * Input to create a `ParameterValue`. Set `moduleInstanceId` for a module
 * input value; set `assemblyId` (or leave both unset for the machine root) for
 * a provider value.
 */
export interface CreateParameterValueInput {
  readonly configurationId: MachineConfigurationId;
  readonly assemblyId?: AssemblyId;
  readonly moduleInstanceId?: ModuleInstanceId;
  readonly nodeKind: ParameterNodeKind;
  readonly parameterId: string;
  readonly loadCase?: LoadCaseCategory;
  readonly source: ParameterValueSource;
  readonly value: EngineeringValue;
}

/**
 * Input to create a `ParameterLink`. The target is always a module input port;
 * the source is a provider node — a module output (`sourceModuleInstanceId`
 * set) or a requirement/assembly/workflow value (`sourceAssemblyId` scopes it,
 * null = machine root).
 */
export interface CreateParameterLinkInput {
  readonly configurationId: MachineConfigurationId;
  readonly targetModuleInstanceId: ModuleInstanceId;
  readonly targetParameterId: string;
  readonly targetLoadCase?: LoadCaseCategory;
  readonly sourceKind: ParameterNodeKind;
  readonly sourceModuleInstanceId?: ModuleInstanceId;
  readonly sourceAssemblyId?: AssemblyId;
  readonly sourceParameterId: string;
  readonly sourceLoadCase?: LoadCaseCategory;
}

// --- Input resolution ----------------------------------------------------

/**
 * A declared module input port to resolve. Supplied by the caller (the
 * application layer, which holds the module package), so the repository never
 * needs to import the module registry to know a module's ports.
 */
export interface ModuleInputPort {
  readonly parameterId: string;
  readonly loadCase?: LoadCaseCategory;
}

/**
 * The resolved source of one module input port. Exactly one of the four input
 * sources named in the architecture ("manual, linked, default, or
 * workflow-provided"):
 *
 * - `manual` / `workflow` — an authored {@link ParameterValueRecord} at the port.
 * - `linked` — a confirmed {@link ParameterLinkRecord}. `value` is the source's
 *   authored value when it is a provider value; `null` when the source is a
 *   module output (its value comes from that module's run — Unit 2.4).
 * - `default` — no authored value and no link; the module's constant default
 *   applies at compute time (Unit 1.6 fills it).
 */
export type ResolvedInputSource =
  | { readonly source: "manual"; readonly value: EngineeringValue }
  | { readonly source: "workflow"; readonly value: EngineeringValue }
  | {
      readonly source: "linked";
      readonly link: ParameterLinkRecord;
      readonly value: EngineeringValue | null;
    }
  | { readonly source: "default" };

/** The resolution of one declared module input port. */
export interface ResolvedModuleInput {
  readonly parameterId: string;
  readonly loadCase: LoadCaseCategory | null;
  readonly resolved: ResolvedInputSource;
}
