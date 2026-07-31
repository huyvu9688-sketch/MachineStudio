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
