// Generic UI schema for the linear-guide module. Selects and groups input
// ports for the generic module workspace (Unit 3.3); it encodes no
// computation. Groups mirror the port families in ./manifest.ts.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "installation",
      title: "Installation",
      fields: [
        {
          portKey: "orientation",
          help: "Horizontal or vertical only. An inclined axis is rejected — this version implements neither of PMI's tilted-installation formula sets. Orientation does not change the block-load formula; gravity is already resolved into the applied load below.",
        },
      ],
    },
    {
      id: "geometry",
      title: "Guide geometry",
      fields: [
        {
          portKey: "rail_spacing",
          help: "Between the two rails, across the direction of travel.",
        },
        {
          portKey: "block_spacing",
          help: "Between the two blocks on one rail, along the direction of travel.",
        },
      ],
    },
    {
      id: "catalog",
      title: "Catalog data",
      fields: [
        { portKey: "static_load_rating" },
        { portKey: "dynamic_load_rating" },
        {
          portKey: "rolling_element_type",
          help: "This version implements ball-type guides only; a roller guide uses a different life exponent and distance basis.",
        },
        {
          portKey: "preload_grade",
          help: "Reported on the result, not evaluated pass/fail — a selection fact rather than a computed check.",
        },
      ],
    },
    {
      id: "life-factors",
      title: "Life correction factors",
      fields: [
        {
          portKey: "load_factor",
          help: "Required. No built-in default — PMI and IKO both publish speed- and impact-keyed guidance ranges rather than one value.",
        },
        {
          portKey: "hardness_factor",
          help: "Optional. Defaults to 1.0, the value for a raceway meeting the guide's own reference hardness.",
        },
        {
          portKey: "temperature_factor",
          help: "Optional. Defaults to 1.0, the value at or below the 100 degC reference condition.",
        },
      ],
    },
    {
      id: "safety-margins",
      title: "Safety margins",
      fields: [
        {
          portKey: "static_safety_factor_minimum",
          help: "Required. No built-in default — PMI's and IKO's own standard-value tables disagree on the ranges.",
        },
      ],
    },
    {
      id: "normal-case",
      title: "Normal case",
      fields: [
        { portKey: "normal_resultant_force" },
        { portKey: "normal_resultant_moment" },
      ],
    },
    {
      id: "peak-case",
      title: "Peak case",
      fields: [
        { portKey: "peak_resultant_force" },
        { portKey: "peak_resultant_moment" },
      ],
    },
  ],
};
