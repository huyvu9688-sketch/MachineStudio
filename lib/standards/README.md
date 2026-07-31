# Source and Market-Profile Registry (Unit 1.4)

`lib/standards` holds source and market-profile **metadata** — the reference
layer a calculation trace, check, or report cites. It stores titles,
identifiers, editions, clause references, applicability, licensing/access notes,
and supersession links. It never stores unlicensed standards text
(context/architecture.md "lib/standards"; the licensing policy in
context/us-market-profile.md and context/jp-market-profile.md).

## Public surface

- `SOURCE_REGISTRY` — the released registry singleton (built and validated at
  import time) with `getDocument`/`getRevision`/`getProfile`, `list*`,
  `revisionsOf`, and `resolveReference`.
- `SOURCE_DOCUMENTS`, `SOURCE_REVISIONS`, `MARKET_PROFILES` — the released seeds.
- `buildSourceRegistry(documents, revisions, profiles)` — builds/validates an
  arbitrary set (used by tests and future externally-sourced registries).
- `marketProfileKey(profile)` — the `id@major` key used in the domain model
  (e.g. `US-General-Industrial-Machinery@1`).
- `*Schema` / `parse*` — structural (Zod) validation at external/persistence
  boundaries.

## Model

- **SourceDocument** — an edition-independent identity (law, regulation,
  standard, handbook, or company/customer rule) with a `classification`, an
  `access` class (`public` vs `licensed`), an authority, a market, and optional
  bilingual titles (`originalTitle`/`originalLanguage`).
- **SourceRevision** — a specific, immutable edition of a document. A revision
  may `supersedes` an earlier one. Released revisions are immutable references.
- **ClauseReference** — a pointer to an exact location (clause and/or page)
  within a revision; `resolveReference` resolves it to its revision + document.
- **MarketProfile** — a market's reference-and-applicability bundle of entries,
  with a version and a no-compliance-overclaim disclaimer.

## Invariants enforced

- Unique document, revision, and profile IDs.
- Every revision belongs to an existing document and has a non-empty edition.
- A `licensed` document's revisions carry **no** reproduced excerpt (only
  `public` sources may carry a short permitted excerpt).
- Supersession targets exist, are not self-referential, and are acyclic.
- Every profile entry references an existing revision.
- A clause reference resolves only with an exact revision and a location.

## Policy notes

- **Editions.** Recorded exactly as the market profile states them. US federal
  regulations that are continuously in force (OSHA CFR sections) use edition
  `current` with a note to confirm the operative CFR edition; NFPA 70 (adopted
  per jurisdiction with varying editions) is registered as a document with **no**
  baseline revision — a project supplies its adopted edition.
- **Japan.** Japanese titles/texts are authoritative; English titles are working
  translations. Statutes and the MHLW guideline carry their Japanese
  `originalTitle`. Official law translations are unofficial references. JIS
  documents are `licensed` (metadata and clause references only). The
  `administrative_guidance` classification is required for MHLW guidance.
- **Application-specific standards** (per-machine-type) are **not** seeded here;
  a project adds them. Market profiles beyond the US and Japan are deferred and
  require a separate roadmap decision.
- No result is labeled generally compliant; only the specific implemented check
  and reference are stated.

## Adding or updating a source

1. Add/confirm the `SourceDocument` (classification, authority, market, access,
   official link, our own note — no reproduced text).
2. Confirm the exact edition, then add a `SourceRevision`; link `supersedes`
   where an edition replaces an earlier one. A new edition is a **new** revision,
   never an edit of an existing one.
3. Reference it from the relevant `MarketProfile` entry with its applicability
   and use when it is a market baseline. A calculation-method source can be
   registered without changing a market profile when it is module-specific
   evidence rather than a jurisdictional requirement.
4. Extend the registry tests.
