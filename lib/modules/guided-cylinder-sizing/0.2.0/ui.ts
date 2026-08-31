import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  callouts: [
    {
      title: "MGP selection cases",
      imagePath: "/module-guides/mgp-selection-cases.svg",
      alt: "Vertical lifter, horizontal pusher, and stopper MGP application diagrams, each showing the load's eccentric distance L from the mounting plate.",
      caseText: {
        portKey: "application_case",
        cases: [
          {
            value: "vertical_lifter",
            text: "Vertical lifter: L is the horizontal offset from the guide centerline to the load's center of gravity.",
          },
          {
            value: "horizontal_pusher",
            text: "Horizontal pusher: L is the distance from the mounting plate to the load's center of gravity, along the travel direction.",
          },
          {
            value: "stopper",
            text: "Stopper: MGP's own page-552 plots assume L ≈ 50 mm; for a longer L, select a sufficiently large bore.",
          },
        ],
      },
    },
  ],
  groups: [
    {
      id: "load",
      title: "Load and safety factor",
      fields: [
        { portKey: "load_mass" },
        {
          portKey: "load_safety_factor",
          help: "Engineer-selected multiplier for secondary uncertainty. It is applied once to mass before graph selection.",
        },
        {
          portKey: "eccentric_distance",
          help: "L: guide-plate-to-load-centre-of-gravity distance for a lifter or pusher.",
        },
      ],
    },
    {
      id: "selection-inputs",
      title: "MGP selection inputs",
      fields: [
        {
          // The standalone "MGP application" card was removed once the
          // callout illustration above became clickable (each case region
          // sets this field directly) — this select stays as the field's
          // one remaining form control (still required for Save to submit
          // a value) and its accessible/keyboard fallback.
          portKey: "application_case",
          help: "Choose the catalogue application diagram that represents the load, or click its region in the illustration above.",
        },
        { portKey: "required_stroke" },
        { portKey: "operating_pressure" },
        {
          portKey: "max_piston_speed",
          help: "Required for a vertical lifter or horizontal pusher.",
        },
        {
          portKey: "transfer_speed",
          help: "Required for a stopper; entered canonically in m/s and reported against the catalogue m/min graph axis.",
        },
      ],
    },
  ],
};
