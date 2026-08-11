# ID42 — Vertical Axis Fixture

This is a sanitized, typed transcription of the historical calculation packet
identified as ID42. It supplies an upward vertical-move reference for the
axis-load-case module and preserves downstream screw/servo values for later
units. It does not copy the source screenshots or their phone/Drive UI,
avatar, or branding.

The raw evidence remains in the repository:

- [mechanism and selected components](<../../../../reference/source-material/Image%20(35).jpg>), printed p. 1;
- [input table](<../../../../reference/source-material/Image%20(34).jpg>), printed p. 2;
- [motion timing](<../../../../reference/source-material/Image%20(33).jpg>), printed p. 3; and
- [force and screw-torque calculation](<../../../../reference/source-material/Image%20(32).jpg>), printed p. 4.

`fixture.ts` records both the original source units and canonical SI values,
plus SHA-256 hashes of the raw evidence. The three axial force values represent
upward actuator-force magnitudes; their final load-case names remain
unclassified until the module contract fixes signed direction and phase-to-case
mapping.

This fixture is accepted as `release_candidate` evidence for the Unit 4.1
vertical-axis historical regression gate
(`docs/superpowers/specs/2026-08-11-unit-4.1-release-design.md`, "Evidence
Disposition"). Acceptance is not release-grade vendor-sizing validation: the
original document revision and a confirmed as-built installation record are
still unavailable, and that gap remains unresolved and recorded here rather
than hidden. Confirmed installed components, later corrections, brake/holding
conditions, and an independent vendor run are also not available. The fixture
also retains two documented inconsistencies: the p. 1 diagram's 75 N
acceleration force conflicts with p. 4's explicit 45 N calculation, and the
source's Keyence motor attribution conflicts with the progress tracker's
HIWIN attribution.

## Additional source pages reviewed (2026-08-07)

`reference/source-material/Image (29).jpg`, `Image (30).jpg`, and
`Image (31).jpg` — printed pp. 5-7 of the same 9-page "ID42 Ứng dụng ...
Keyence.pdf" source, extending the motor-selection chain beyond the four
pages already transcribed above (pp. 1-4). Not used in this fixture (out of
scope for a force-only load-case fixture) but recorded here for Unit 4.7
(servo drive-train): inertia breakdown (screw/load/coupling/motor
J = 0.249/0.76/0.11/0.556 ×10⁻⁴ kg·m², system total
J_T = 1.675×10⁻⁴ kg·m², inertia ratio 1.81), phase torques consistent with
this fixture's phase forces (T1/T2/T3 = 0.758/0.52/0.283 N·m), an effective
torque check (T_rms = 0.532 N·m, margin 2.38), and a full accessory bill of
materials: motor SV2-B040AS, driver/amplifier SV2-040L2, encoder cable
SV2-BE10, power cable SV2-CB. No document revision mark, date, correction,
or holding/brake note appears on any of the three.
