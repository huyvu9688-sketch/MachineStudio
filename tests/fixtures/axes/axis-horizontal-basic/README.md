# ID39 — Horizontal Basic Axis Fixture

This is a sanitized, typed transcription of the historical calculation packet
identified as ID39. It is suitable for regression tests of a horizontal,
friction-resisted axis-load calculation. It intentionally does not copy its
phone screenshots, Drive UI, avatar, or organization branding.

The source evidence is retained in the repository, not embedded here:

- [input and axial-force page](<../../../../reference/source-material/Image%20(4).jpg>), printed p. 24;
- [duty-cycle and mean-load page](<../../../../reference/source-material/Image%20(3).jpg>), printed p. 25;
- [downstream critical-speed check](<../../../../reference/source-material/Image%20(2).jpg>), printed p. 26; and
- [selected ball-screw page](../../../../reference/source-material/Image.jpg), printed p. 29.

`fixture.ts` preserves source units alongside canonical SI values and records
the source hashes. The reported axial values are unsigned magnitudes, so a
future module must not silently map them to `normal`, `peak`, `holding`, or
`emergency_stop` until that contract is released.

This is draft historical evidence, not a release-grade vendor-sizing result:
the original document revision, confirmed installed parts, later corrections,
and a complete signed load-case convention are unavailable.

## Additional source pages reviewed (2026-08-07)

`reference/source-material/Image (5).jpg` and `Image (7).jpg` through
`Image (28).jpg` (21 images) were reviewed while searching for a third
long-stroke/high-speed historical fixture
(`context/modules/axis-load-cases/stage-1-spec.md` "Validation Gate and
Evidence Intake"). Each carries the same source app title bar as the four
images above ("ID39 Tính toán ... bi_0526.pdf") and is a page of that
document's front-matter ball-screw-sizing methodology chapter (selection
flowchart, accuracy/backlash tables, buckling/critical-speed/life formulas
and generic textbook examples, mounting-method diagrams, motor-torque
formulas) — not project-specific data, and not a third project. None carries
a document revision mark, date, correction, or holding/brake note.

Two are worth noting because their generic worked-example numbers reappear
in this fixture's own `corrections` field: `Image (22).jpg` (buckling
example, φ15 pitch 5, fixed-fixed, l=820 mm, d=12.5 mm → P=7,225 N) is the
derivation source of the "7,225 N" figure the `corrections` field flags as
conflicting with a later "3,660 N" comparison; `Image (20).jpg`
(critical-speed example, φ15 pitch 5, fixed-supported, l=790 mm →
Nc=3,024 rpm) derives the "3,024 rpm" limit already summarized on
`Image (2).jpg`. Neither changes the fixture's recorded values — they
confirm where those already-recorded numbers come from.
