# Source Index (Unit 0.5)

This is a running index of source revisions that are **actually used by a
validated module**, i.e. cited in a completed
`validation/<module-id>/<version>.md` record's "Sources and Methods Used"
table. It exists so a reviewer can see, at a glance and without opening
every module's validation record, exactly which source editions the
released calculation behavior currently depends on.

This index does not replace the source-of-truth registry in
`lib/standards/` (`SOURCE_REGISTRY`, seeded from
`lib/standards/profiles/us.ts` and `lib/standards/profiles/jp.ts`,
documented in `lib/standards/README.md`). Every row here must reference
an ID that resolves in that registry, or — for a source not yet
registered there (e.g. a manufacturer catalog or an engineering handbook
added for one module) — state that it is pending registration. This file
is the validated-usage view; `lib/standards` is the canonical metadata
store.

## Format

One row per (source revision, module) pair that has been used in a
completed validation record. A source used by more than one module gets
one row per module.

| Source Revision ID | Title | Classification | Edition | Used by module(s) | Validation record | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `<lib/standards SourceRevision id, e.g. us.ansi.b11_0@2023>` | `<document title>` | `<classification>` | `<edition>` | `<module-id@version>` | `validation/<module-id>/<version>.md` | `<supersession status, licensing note, or blank>` |

Column notes:

- **Source Revision ID** — the exact `SourceRevision.id` from
  `lib/standards` (`asSourceRevisionId(...)` values, format
  `<document-id>@<edition>`). If the source is not yet registered in
  `lib/standards`, write `PENDING REGISTRATION` here and open a tracker
  item to add it before the module's next release.
- **Used by module(s)** — module ID and semantic version, e.g.
  `motion.ball-screw@1.0.0`. A source superseded for one module version
  but still cited by an older, still-released module version gets
  separate rows (`context/us-market-profile.md` / `context/jp-market-
  profile.md` "Source Update Policy": "Released modules continue to
  reference their original source revision").
- **Validation record** — path to the exact validation record file the
  citation was pulled from.
- **Notes** — flag a known supersession (`SourceRevision.supersedes`), a
  licensing restriction (e.g. JIS/ANSI licensed content — metadata and
  clause references only, no reproduced text, per `context/code-
  standards.md` "Standards and Sources"), or anything a reviewer should
  know before relying on the citation.

## Update rule

Add rows to this index only when a module's validation record is
completed (Stage 4 of the New Module Workflow,
`context/ai-workflow-rules.md`) and the module is released. Do not
pre-populate this index with sources a module is merely expected to use —
that would misrepresent unvalidated engineering behavior as validated.
When a module's validation record changes (a deviation is corrected, a
new source edition is adopted), update its rows here in the same change.

## Entries

No module has completed Stage 4 validation yet
(`context/progress-tracker.md` "Current Phase": Milestone 1, the generic
engine, is complete; the first production module, Unit 4.1, has not
started). This index intentionally has no entries until the first
module's validation record exists — adding a row ahead of that would
invent evidence that does not exist yet.
