// lib/engine owns generic, deterministic calculation infrastructure only:
// engineering value types, unit definitions and conversion, the canonical
// parameter registry, the module SDK and conformance rules, calculation
// trace primitives, module execution, and dependency graph resolution.
// It imports nothing from app, lib/db, network clients, authentication,
// or catalog persistence. See context/architecture.md.

// Unit 1.1 — EngineeringValue contracts.
export * from "./values";

// Unit 1.2 — Unit registry and conversion engine.
export * from "./units";

// Unit 1.3 — Canonical parameter registry.
export * from "./parameters";

// Unit 1.5 — Calculation trace and check contracts.
export * from "./trace";

// Unit 1.6 — Module SDK v1.
export * from "./module-sdk";

// Unit 1.8 — Parameter graph core.
export * from "./graph";
