// Module SDK v1 contracts (Unit 1.6). A released calculation module is a single
// `ModulePackage` object: a manifest, canonical-parameter ports, an input
// schema, a pure compute function returning a structured computation, generic
// UI and report schemas, a validation record, and an optional catalog adapter
// (context/architecture.md "Module Package Contract"; context/code-standards.md
// "Module Packages"). Runtime validation lives in ./schemas (shape), ./validate
// (package/semantic invariants), and ./execute (input/output/trace at run time).
//
// Every physical value crossing a port is an EngineeringValue (Unit 1.1); every
// source citation is a ClauseReference (Unit 1.4); the calculation trace, checks,
// warnings, and validity results reuse the Unit 1.5 contracts. Modules speak
// only in canonical parameter IDs (Unit 1.3).

import type { z } from "zod";
import type { EngineeringValue } from "../values";
import type { LoadCaseCategory, ParameterId } from "../parameters";
import type {
  CalculationTrace,
  CheckResult,
  ValidityResult,
  Warning,
} from "../trace";
import type { ClauseReference, SourceRevisionId } from "../../standards/types";
import type { SdkRange } from "./sdk";

/**
 * Migration/replacement pointer for a superseding module version, recorded on
 * the manifest so tooling can relate an old released version to its successor.
 */
export interface ModuleReplacement {
  /** Module ID of the replacement (usually the same ID at a higher version). */
  readonly moduleId: string;
  /** Semantic version of the replacement. */
  readonly version: string;
  /** Optional human note on what changed / how to migrate. */
  readonly note?: string;
}

/**
 * Released module manifest: stable identity, versioning, compatibility, and the
 * declarative metadata needed to register, execute, and reproduce a module
 * (context/architecture.md "The manifest includes"). Released manifests are
 * immutable; a change requires a new module version.
 */
export interface ModuleManifest {
  /** Stable module ID, e.g. `"axis-load-cases"`. Non-empty. */
  readonly id: string;
  /** Semantic version of this module package. */
  readonly version: string;
  /** Deterministic content hash of the package's declarative contract. */
  readonly contentHash: string;
  /** Engine SDK compatibility range this module is validated against. */
  readonly sdkRange: SdkRange;
  /**
   * Exact canonical-parameter registry version this immutable package was
   * authored against. The SDK may accept it only when the active registry
   * explicitly declares that historical target compatible.
   */
  readonly parameterRegistryVersion: string;
  /** Module category, e.g. `"motion"`, `"transmission"`, `"drive-train"`. */
  readonly category: string;
  /** Free-form classification tags. */
  readonly tags: readonly string[];
  /** Workflow role IDs this module can fill (e.g. `"linear-axis.motion"`). */
  readonly workflowRoles: readonly string[];
  /** Human summary of the validity envelope (supported application range). */
  readonly validityEnvelopeSummary: string;
  /** Source revisions the module's methods are based on. */
  readonly sourceRevisionIds: readonly SourceRevisionId[];
  /** Migration/replacement metadata, when this version has been superseded. */
  readonly replacedBy?: ModuleReplacement;
}

/**
 * A module input port: a locally keyed slot bound to a canonical parameter. The
 * module reads the resolved value for `key`; `parameterId` fixes its engineering
 * meaning, unit dimension, and value family for link and validation purposes.
 */
export interface ModuleInputPort {
  /** Local port key used within {@link ModuleInput.values}. Non-empty, unique. */
  readonly key: string;
  /** Canonical parameter this port speaks. */
  readonly parameterId: ParameterId;
  /** Whether a value must be resolved for this port (absent constants excepted). */
  readonly required: boolean;
  /** Load case this input pertains to, when load-case specific. */
  readonly loadCase?: LoadCaseCategory;
}

/** A module output port: a locally keyed result bound to a canonical parameter. */
export interface ModuleOutputPort {
  /** Local port key used within {@link ModuleComputation.outputs}. Non-empty, unique. */
  readonly key: string;
  /** Canonical parameter this output speaks. */
  readonly parameterId: ParameterId;
  /** Load case this output pertains to, when load-case specific. */
  readonly loadCase?: LoadCaseCategory;
}

/** A module's declared input and output ports. */
export interface ModulePorts {
  readonly inputs: readonly ModuleInputPort[];
  readonly outputs: readonly ModuleOutputPort[];
}

/**
 * Resolved input to a compute call: values keyed by input-port key, each already
 * resolved to its canonical unit. The application layer produces this from
 * manual/linked/default/workflow sources before execution; the SDK fills
 * constant parameter defaults for absent ports.
 */
export interface ModuleInput {
  /** Resolved input values, keyed by input port key. */
  readonly values: Readonly<Record<string, EngineeringValue>>;
  /** Optional active load-case identifier for this run. */
  readonly loadCaseId?: string;
}

/** A design assumption relied upon by a computation, recorded for the report. */
export interface Assumption {
  /** Stable assumption ID. Non-empty. */
  readonly id: string;
  /** Human-readable statement of the assumption. Non-empty. */
  readonly statement: string;
  /** The assumed value, where the assumption fixes one. */
  readonly value?: EngineeringValue;
  /** Source citations, where the assumption follows a documented method. */
  readonly sources?: readonly ClauseReference[];
}

/**
 * The structured result of a compute call (context/architecture.md
 * `ModuleComputation`): output values, the calculation trace, check results,
 * warnings, assumptions used, and validity-limit results. Reports render this
 * without re-running the module.
 */
export interface ModuleComputation {
  /** Output values keyed by output port key. */
  readonly outputs: Readonly<Record<string, EngineeringValue>>;
  /** The structured calculation trace. */
  readonly trace: CalculationTrace;
  /** Acceptance check results. */
  readonly checks: readonly CheckResult[];
  /** Non-fatal advisories. */
  readonly warnings: readonly Warning[];
  /** Assumptions relied upon. */
  readonly assumptions: readonly Assumption[];
  /** Validity-envelope results. */
  readonly validity: readonly ValidityResult[];
}

/** A single generic UI field bound to an input port. */
export interface ModuleUiField {
  /** Input port key this field edits. Must reference a declared input port. */
  readonly portKey: string;
  /** Optional display label; defaults to the parameter's display name. */
  readonly label?: string;
  /** Optional help text. */
  readonly help?: string;
  /**
   * When present, the generic renderer shows this field disabled (visible,
   * non-editable) whenever the named enum input port currently resolves to
   * `equals`. Deliberately minimal — one condition, enum-equality only —
   * because that is the only case any module needs today (a motion-mode
   * toggle selecting which of two input pairs applies). `portKey` must
   * reference a declared enum-kind input port on the same module — a
   * later task adds registration-time validation for this in
   * `lib/engine/module-sdk/validate.ts`.
   */
  readonly disabledWhen?: {
    readonly portKey: string;
    readonly equals: string;
  };
}

/** A titled group of UI fields, rendered by the generic module workspace. */
export interface ModuleUiGroup {
  /** Stable group ID. Non-empty, unique within the schema. */
  readonly id: string;
  /** Group heading. Non-empty. */
  readonly title: string;
  /** Fields in display order. */
  readonly fields: readonly ModuleUiField[];
}

/** A case-dependent explanatory line in a reusable module callout. */
export interface ModuleUiCalloutCaseText {
  /** Declared enum input port whose current value selects the helper text. */
  readonly portKey: string;
  /** One concise helper sentence for each supported enum value. */
  readonly cases: readonly { readonly value: string; readonly text: string }[];
}

/** An optional diagram and contextual helper rendered by the generic workspace. */
export interface ModuleUiCallout {
  readonly title: string;
  /** Public, same-origin image path. The renderer permits `/module-guides/` only. */
  readonly imagePath: string;
  readonly alt: string;
  readonly caseText?: ModuleUiCalloutCaseText;
}
/**
 * The generic UI schema for a module's input pane. It selects and groups input
 * ports for the generic workspace renderer (Unit 3.3); it never encodes
 * engineering computation.
 */
export interface ModuleUiSchema {
  readonly groups: readonly ModuleUiGroup[];
  readonly callouts?: readonly ModuleUiCallout[];
}

/** What a report section renders from the stored computation. */
export type ReportSectionKind =
  | "inputs"
  | "outputs"
  | "checks"
  | "trace"
  | "assumptions"
  | "warnings"
  | "validity";

/** One section of a module report. */
export interface ModuleReportSection {
  /** Stable section ID. Non-empty, unique within the schema. */
  readonly id: string;
  /** Section heading. Non-empty. */
  readonly title: string;
  /** Which part of the computation this section renders. */
  readonly include: ReportSectionKind;
}

/**
 * The generic report schema for a module. It declares the sections a report
 * renders from the stored trace and computation records (Unit 5.2); it never
 * reimplements formulas.
 */
export interface ModuleReportSchema {
  readonly sections: readonly ModuleReportSection[];
}

/** A published worked example a module reproduces within a stated tolerance. */
export interface ReferenceExample {
  /** Stable example ID. Non-empty. */
  readonly id: string;
  /** Description and origin of the example. Non-empty. */
  readonly description: string;
  /** Human-readable tolerance statement, e.g. `"±2% on required thrust"`. */
  readonly tolerance: string;
}

/**
 * A module's validation record (roadmap module definition of done, item 10):
 * methods, sources/editions, reproduced reference examples, an independent
 * benchmark, the reviewer, supported use limits, and documented deviations.
 */
export interface ValidationRecord {
  /** Module this record validates. */
  readonly moduleId: string;
  /** Module version this record validates. */
  readonly moduleVersion: string;
  /** Method/standard names or IDs the module implements. */
  readonly methods: readonly string[];
  /** Source revisions relied upon. */
  readonly sourceRevisionIds: readonly SourceRevisionId[];
  /** Reproduced published reference examples (at least three at release). */
  readonly referenceExamples: readonly ReferenceExample[];
  /** The independent benchmark method or tool comparison used. */
  readonly independentBenchmark: string;
  /** Reviewer name; the benchmark comparison substitutes for a second engineer. */
  readonly reviewer: string;
  /** Review date (ISO). */
  readonly reviewDate: string;
  /** Documented supported-use limits. */
  readonly supportedUseLimits: readonly string[];
  /** Documented deviations from the referenced methods. */
  readonly deviations: readonly string[];
}

/**
 * Optional catalog matching adapter for a module that drives part selection. It
 * extracts the required specification from a computation; the deterministic hard
 * filters and ranking live in the catalog boundary (Units 2.6–2.8), keeping the
 * engine free of persistence concerns. Defining only the interface here means a
 * module can declare part-matching without the SDK importing `lib/catalog`.
 */
export interface CatalogAdapter {
  /** Component type this adapter produces a required spec for, e.g. `"ball_screw"`. */
  readonly componentType: string;
  /** Extracts the required specification (keyed values) from a computation. */
  readonly requiredSpec: (
    computation: ModuleComputation,
  ) => Readonly<Record<string, EngineeringValue>>;
}

/**
 * A released module package. The single object a module exports; the engine
 * executes and reports on modules through this contract only, never by importing
 * a module's internals.
 */
export interface ModulePackage {
  readonly manifest: ModuleManifest;
  readonly ports: ModulePorts;
  /** Author-provided schema validating an untrusted raw input into a ModuleInput. */
  readonly inputSchema: z.ZodType<ModuleInput>;
  /** Pure, deterministic compute function. Performs no I/O. */
  readonly compute: (input: ModuleInput) => ModuleComputation;
  readonly uiSchema: ModuleUiSchema;
  readonly reportSchema: ModuleReportSchema;
  readonly validation: ValidationRecord;
  readonly catalogAdapter?: CatalogAdapter;
}

/**
 * A module package before its content hash is stamped. Authors build this; the
 * release step {@link import("./hash").sealModulePackage} computes the hash and
 * returns a {@link ModulePackage}.
 */
export interface ModulePackageDraft extends Omit<ModulePackage, "manifest"> {
  readonly manifest: Omit<ModuleManifest, "contentHash">;
}
