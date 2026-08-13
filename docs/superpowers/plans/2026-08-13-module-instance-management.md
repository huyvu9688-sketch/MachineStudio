# Module Instance Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add friendly default instance labels, module-instance rename, and archive-based module-instance removal (with a stale-impact-style preview), per the approved design at `docs/superpowers/specs/2026-08-13-module-instance-management-design.md`.

**Architecture:** Follows this codebase's existing layering exactly: `lib/db/repositories` (Prisma, ownership-scoped) → `lib/application` (validation + orchestration) → `app/(workspace)/workspace/actions.ts` (Server Actions) → `components/engineering/*` (client UI). Archiving adds one nullable `archivedAt` column to `ModuleInstance`; nothing is ever deleted. Rename reuses the existing generic `RenameDialog` component unchanged. The label-default task is fully independent of the rest and can ship first.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, Prisma 7 + PostgreSQL (Neon), Zod, Vitest + Testing Library.

---

### Task 1: Smarter default instance label

**Files:**
- Modify: `components/engineering/add-module-instance-dialog.tsx`
- Test: `components/engineering/add-module-instance-dialog.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `components/engineering/add-module-instance-dialog.test.tsx`, inside the existing `describe("AddModuleInstanceDialog", ...)` block:

```tsx
it("prefills the instance label with the friendly mechanism name on selection", async () => {
  const user = userEvent.setup();
  const packages: ModulePackageOption[] = [
    {
      modulePackageId: "belt-pulley-drive-motor-sizing",
      moduleVersion: "0.1.0",
      category: "motor-sizing.belt-pulley-drive",
    },
  ];
  render(
    <AddModuleInstanceDialog
      assemblyId="a1"
      configurationId="c1"
      modulePackages={packages}
      trigger={<button type="button">{TRIGGER_LABEL}</button>}
    />,
  );

  await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));
  await user.selectOptions(
    screen.getByLabelText("Mechanism"),
    "belt-pulley-drive-motor-sizing@0.1.0",
  );

  expect(screen.getByLabelText("Instance label")).toHaveValue(
    "Belt & Pulley Drive",
  );
});

it("does not overwrite a label the founder already typed", async () => {
  const user = userEvent.setup();
  const packages: ModulePackageOption[] = [
    {
      modulePackageId: "belt-pulley-drive-motor-sizing",
      moduleVersion: "0.1.0",
      category: "motor-sizing.belt-pulley-drive",
    },
    {
      modulePackageId: "index-table-motor-sizing",
      moduleVersion: "0.1.0",
      category: "motor-sizing.index-table",
    },
  ];
  render(
    <AddModuleInstanceDialog
      assemblyId="a1"
      configurationId="c1"
      modulePackages={packages}
      trigger={<button type="button">{TRIGGER_LABEL}</button>}
    />,
  );

  await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));
  await user.selectOptions(
    screen.getByLabelText("Mechanism"),
    "belt-pulley-drive-motor-sizing@0.1.0",
  );
  await user.clear(screen.getByLabelText("Instance label"));
  await user.type(screen.getByLabelText("Instance label"), "X-axis drive");
  await user.selectOptions(
    screen.getByLabelText("Mechanism"),
    "index-table-motor-sizing@0.1.0",
  );

  expect(screen.getByLabelText("Instance label")).toHaveValue("X-axis drive");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run components/engineering/add-module-instance-dialog.test.tsx`
Expected: the two new tests FAIL (the label input has no value / stays empty — there is no prefill logic yet).

- [ ] **Step 3: Implement label state and the prefill handler**

In `components/engineering/add-module-instance-dialog.tsx`, replace the existing `category` state block and the package `<select>`/label `<Input>` JSX:

Replace:
```tsx
  const [category, setCategory] = useState<"motor-sizing" | "other">(
    motorSizingPackages.length > 0 ? "motor-sizing" : "other",
  );
  const activePackages =
    category === "motor-sizing" ? motorSizingPackages : otherPackages;
```

With:
```tsx
  const [category, setCategory] = useState<"motor-sizing" | "other">(
    motorSizingPackages.length > 0 ? "motor-sizing" : "other",
  );
  const activePackages =
    category === "motor-sizing" ? motorSizingPackages : otherPackages;

  // Prefills "Instance label" from the selected package (the friendly
  // mechanism name for motor-sizing, the raw id otherwise) so new instances
  // stop defaulting to a blank field a founder has to fill by hand — the
  // gap that left existing instances named after raw ids like
  // "belt-pulley-drive-motor-sizing@0.1.0"
  // (docs/superpowers/specs/2026-08-13-module-instance-management-design.md).
  // Stops auto-filling the moment the founder types their own text, tracked
  // by `labelTouched` rather than by diffing values — the same
  // auto-slug-until-touched pattern used across this codebase's own admin
  // tooling conventions.
  const [label, setLabel] = useState("");
  const [labelTouched, setLabelTouched] = useState(false);

  function handlePackageChange(key: string): void {
    const pkg = activePackages.find(
      (candidate) => `${candidate.modulePackageId}@${candidate.moduleVersion}` === key,
    );
    if (pkg !== undefined && !labelTouched) {
      setLabel(category === "motor-sizing" ? mechanismLabel(pkg) : pkg.modulePackageId);
    }
  }
```

Replace the package `<select>`:
```tsx
              <select
                key={category}
                id={packageId}
                name="modulePackageKey"
                required
                defaultValue=""
                disabled={activePackages.length === 0}
                className="h-9 rounded-md border border-border-default bg-bg-surface px-3 text-[14px] text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
              >
```

With:
```tsx
              <select
                key={category}
                id={packageId}
                name="modulePackageKey"
                required
                defaultValue=""
                disabled={activePackages.length === 0}
                onChange={(event) => handlePackageChange(event.target.value)}
                className="h-9 rounded-md border border-border-default bg-bg-surface px-3 text-[14px] text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
              >
```

Replace the label `<Input>`:
```tsx
            <div className="grid gap-1.5">
              <Label htmlFor={labelId}>Instance label</Label>
              <Input id={labelId} name="label" required maxLength={200} />
            </div>
```

With:
```tsx
            <div className="grid gap-1.5">
              <Label htmlFor={labelId}>Instance label</Label>
              <Input
                id={labelId}
                name="label"
                required
                maxLength={200}
                value={label}
                onChange={(event) => {
                  setLabelTouched(true);
                  setLabel(event.target.value);
                }}
              />
            </div>
```

Also reset the prefill state when the founder switches the "Motor Sizing Tools" / "Other modules" category tab, so a stale label/selection from the previous tab doesn't linger. Replace both category `<Button>` `onClick` handlers:
```tsx
                    onClick={() => setCategory("motor-sizing")}
```
```tsx
                    onClick={() => setCategory("other")}
```

With:
```tsx
                    onClick={() => {
                      setCategory("motor-sizing");
                      setLabelTouched(false);
                      setLabel("");
                    }}
```
```tsx
                    onClick={() => {
                      setCategory("other");
                      setLabelTouched(false);
                      setLabel("");
                    }}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run components/engineering/add-module-instance-dialog.test.tsx`
Expected: PASS (all tests, including the two new ones and the pre-existing three).

- [ ] **Step 5: Lint, typecheck, commit**

Run: `npm run lint -- components/engineering/add-module-instance-dialog.tsx components/engineering/add-module-instance-dialog.test.tsx && npm run typecheck`
Expected: both clean.

```bash
git add components/engineering/add-module-instance-dialog.tsx components/engineering/add-module-instance-dialog.test.tsx
git commit -m "feat: prefill instance label with the friendly mechanism name"
```

---

### Task 2: `archivedAt` schema column and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260813120000_module_instance_archive/migration.sql`

- [ ] **Step 1: Add the column to the Prisma schema**

In `prisma/schema.prisma`, in the `ModuleInstance` model, insert a new field right after `updatedAt`:

Replace:
```prisma
  createdAt            DateTime     @default(now()) @db.Timestamptz(6)
  updatedAt            DateTime     @updatedAt @db.Timestamptz(6)

  assembly             Assembly          @relation(fields: [assemblyId, configurationId], references: [id, configurationId], onDelete: Cascade)
```

With:
```prisma
  createdAt            DateTime     @default(now()) @db.Timestamptz(6)
  updatedAt            DateTime     @updatedAt @db.Timestamptz(6)
  /// Set when a founder archives this instance to declutter the navigator
  /// (module-instance-management design, 2026-08-13). Archiving hides, never
  /// deletes: parameter values, parameter links, and calculation run history
  /// are all left exactly as they are, respecting the "calculation runs ...
  /// are immutable" invariant (CLAUDE.md) literally. Null means active.
  archivedAt           DateTime?    @db.Timestamptz(6)

  assembly             Assembly          @relation(fields: [assemblyId, configurationId], references: [id, configurationId], onDelete: Cascade)
```

- [ ] **Step 2: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: succeeds, no errors (this project's network can reach `binaries.prisma.sh`; see `20260730180000_same_configuration_constraints/migration.sql`'s own note on this).

- [ ] **Step 3: Hand-write the migration SQL**

Create `prisma/migrations/20260813120000_module_instance_archive/migration.sql`:

```sql
-- Module instance archiving (module-instance-management design,
-- docs/superpowers/specs/2026-08-13-module-instance-management-design.md).
--
-- Archiving hides a module instance from the machine navigator without
-- deleting anything -- parameter values, parameter links, and calculation
-- run history for the instance are left completely untouched, respecting
-- the "calculation runs ... are immutable" invariant (CLAUDE.md) literally:
-- removal must not delete run rows, not even indirectly through the
-- instance that produced them.
--
-- Hand-authored (not `prisma migrate dev`-generated): this project has no
-- local PostgreSQL/Docker to run `prisma migrate dev`'s shadow-database
-- diff against, so this SQL is hand-written to match the shape Prisma's own
-- generator produces for a single nullable-column addition, the same
-- constraint recorded in
-- 20260730180000_same_configuration_constraints/migration.sql.

ALTER TABLE "module_instances" ADD COLUMN "archivedAt" TIMESTAMPTZ(6);
```

- [ ] **Step 4: Apply the migration and verify schema sync**

Run: `npx prisma migrate deploy`
Expected: reports the new migration applied, no drift.

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid".

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260813120000_module_instance_archive/migration.sql
git commit -m "feat: add archivedAt column to module_instances"
```

---

### Task 3: `ModuleInstanceRecord.archivedAt`

Adding a required field to `ModuleInstanceRecord` breaks every hand-built
fixture of that shape, not just the repository mapper. A repo-wide search
for the type's own distinctive `lastCalculationRunId: null` fixture line
found four hits: `lib/db/repositories/project-repository.ts` (the real
mapper, fixed in Task 4), `components/engineering/machine-navigator.test.tsx`,
`components/engineering/workspace-shell.test.tsx`, and
`components/engineering/module-status-summary.test.ts` (three test
fixtures, fixed here). A fifth and sixth similar-looking hit,
`lib/configuration/schemas.ts` and `lib/configuration/comparison.test.ts`,
are a different, narrower type (`BaselineModuleInstance` — an immutable
baseline snapshot shape with no `assemblyId`/`configurationId`/`createdAt`/
`updatedAt` fields at all) and are correctly out of scope: a frozen baseline
snapshot has no concept of "later archived."

**Files:**
- Modify: `lib/db/repositories/types.ts:112-135`
- Modify: `components/engineering/machine-navigator.test.tsx:50-68`
- Modify: `components/engineering/workspace-shell.test.tsx:96-104`
- Modify: `components/engineering/module-status-summary.test.ts:5-22`

- [ ] **Step 1: Add the field**

In `lib/db/repositories/types.ts`, in the `ModuleInstanceRecord` interface, add after `lastRunStatus`:

Replace:
```ts
  readonly lastCalculationRunId: string | null;
  readonly lastRunStatus: CheckStatus | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```
(the one inside `ModuleInstanceRecord`, not `WorkflowInstanceRecord` above it)

With:
```ts
  readonly lastCalculationRunId: string | null;
  readonly lastRunStatus: CheckStatus | null;
  /** When this instance was archived (hidden from the navigator, nothing deleted); `null` when active. */
  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

- [ ] **Step 2: Typecheck to find every broken fixture**

Run: `npm run typecheck`
Expected: FAILS in four places — `lib/db/repositories/project-repository.ts` (left broken; Task 4 fixes it) and the three test files below.

- [ ] **Step 3: Fix the `machine-navigator.test.tsx` fixture helper**

Replace:
```ts
function moduleInstance(
  id: string,
  label: string,
  lastRunStatus: ModuleInstanceRecord["lastRunStatus"],
): ModuleInstanceRecord {
  return {
    id: id as ModuleInstanceRecord["id"],
    assemblyId: "assembly" as ModuleInstanceRecord["assemblyId"],
    configurationId: "config" as ModuleInstanceRecord["configurationId"],
    workflowInstanceId: null,
    modulePackageId: "example-scaffold",
    moduleVersion: "0.1.0",
    label,
    lastCalculationRunId: null,
    lastRunStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

With (a new optional trailing `archivedAt` parameter, default `null`, so every existing call site keeps compiling unchanged — Task 11 uses the new parameter to build an archived fixture):
```ts
function moduleInstance(
  id: string,
  label: string,
  lastRunStatus: ModuleInstanceRecord["lastRunStatus"],
  archivedAt: Date | null = null,
): ModuleInstanceRecord {
  return {
    id: id as ModuleInstanceRecord["id"],
    assemblyId: "assembly" as ModuleInstanceRecord["assemblyId"],
    configurationId: "config" as ModuleInstanceRecord["configurationId"],
    workflowInstanceId: null,
    modulePackageId: "example-scaffold",
    moduleVersion: "0.1.0",
    label,
    lastCalculationRunId: null,
    lastRunStatus,
    archivedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

- [ ] **Step 4: Fix the `workspace-shell.test.tsx` fixture**

Replace:
```ts
              workflowInstanceId: null,
              modulePackageId: "example-scaffold",
              moduleVersion: "0.1.0",
              label: "Thrust check",
              lastCalculationRunId: null,
              lastRunStatus: "pass",
              createdAt: new Date(),
              updatedAt: new Date(),
```

With:
```ts
              workflowInstanceId: null,
              modulePackageId: "example-scaffold",
              moduleVersion: "0.1.0",
              label: "Thrust check",
              lastCalculationRunId: null,
              lastRunStatus: "pass",
              archivedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
```

- [ ] **Step 5: Fix the `module-status-summary.test.ts` fixture helper**

Replace:
```ts
    label: id,
    lastCalculationRunId: null,
    lastRunStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

With:
```ts
    label: id,
    lastCalculationRunId: null,
    lastRunStatus,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

- [ ] **Step 6: Typecheck again — only the repository mapper should still fail**

Run: `npm run typecheck`
Expected: FAILS only in `lib/db/repositories/project-repository.ts` now. This is the expected TDD red state for this task; Task 4 fixes it.

- [ ] **Step 7: Run the three fixed test files to confirm no runtime regression**

Run: `npx vitest run components/engineering/machine-navigator.test.tsx components/engineering/workspace-shell.test.tsx components/engineering/module-status-summary.test.ts`
Expected: PASS (their pre-existing tests; no new tests were added in this task).

- [ ] **Step 8: Commit**

```bash
git add lib/db/repositories/types.ts components/engineering/machine-navigator.test.tsx components/engineering/workspace-shell.test.tsx components/engineering/module-status-summary.test.ts
git commit -m "feat: add archivedAt to ModuleInstanceRecord and its test fixtures"
```

---

### Task 4: Repository — rename, archive, and the row mapper

**Files:**
- Modify: `lib/db/repositories/project-repository.ts:145-227` (row type + mapper), and add two new exported functions after `renameAssembly` (currently `project-repository.ts:488-501`)
- Test: `lib/db/repositories/project-repository.test.ts`

- [ ] **Step 1: Update the row type and mapper**

In `lib/db/repositories/project-repository.ts`, replace:
```ts
interface ModuleInstanceRow {
  id: string;
  assemblyId: string;
  configurationId: string;
  workflowInstanceId: string | null;
  modulePackageId: string;
  moduleVersion: string;
  label: string;
  lastCalculationRunId: string | null;
  lastRunStatus: CheckStatus | null;
  createdAt: Date;
  updatedAt: Date;
}
```

With:
```ts
interface ModuleInstanceRow {
  id: string;
  assemblyId: string;
  configurationId: string;
  workflowInstanceId: string | null;
  modulePackageId: string;
  moduleVersion: string;
  label: string;
  lastCalculationRunId: string | null;
  lastRunStatus: CheckStatus | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

Replace:
```ts
function toModuleInstanceRecord(row: ModuleInstanceRow): ModuleInstanceRecord {
  return {
    id: asModuleInstanceId(row.id),
    assemblyId: asAssemblyId(row.assemblyId),
    configurationId: asMachineConfigurationId(row.configurationId),
    workflowInstanceId:
      row.workflowInstanceId === null
        ? null
        : asWorkflowInstanceId(row.workflowInstanceId),
    modulePackageId: row.modulePackageId,
    moduleVersion: row.moduleVersion,
    label: row.label,
    lastCalculationRunId: row.lastCalculationRunId,
    lastRunStatus: row.lastRunStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
```

With:
```ts
function toModuleInstanceRecord(row: ModuleInstanceRow): ModuleInstanceRecord {
  return {
    id: asModuleInstanceId(row.id),
    assemblyId: asAssemblyId(row.assemblyId),
    configurationId: asMachineConfigurationId(row.configurationId),
    workflowInstanceId:
      row.workflowInstanceId === null
        ? null
        : asWorkflowInstanceId(row.workflowInstanceId),
    modulePackageId: row.modulePackageId,
    moduleVersion: row.moduleVersion,
    label: row.label,
    lastCalculationRunId: row.lastCalculationRunId,
    lastRunStatus: row.lastRunStatus,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
```

- [ ] **Step 2: Typecheck (expect pass now)**

Run: `npm run typecheck`
Expected: PASS — Task 3's failure is resolved.

- [ ] **Step 3: Write the failing repository tests**

In `lib/db/repositories/project-repository.test.ts`, add two `it` blocks right after the existing `renameAssembly` test (immediately before the block's closing `});` around line 400-401):

```ts
    it("renames a module instance owned by the caller and rejects a stranger", async () => {
      const ownerId = await newUser();
      const strangerId = await newUser();
      const project = await repo.createProject({
        ownerId,
        name: "Axis",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await repo.createConfiguration({
        projectId: project.id,
        name: "Baseline",
      });
      const assembly = await repo.createAssembly({
        configurationId: config.id,
        name: "X axis",
      });
      const moduleInstance = await repo.createModuleInstance({
        assemblyId: assembly.id,
        configurationId: config.id,
        modulePackageId: "example-scaffold",
        moduleVersion: "0.1.0",
        label: "belt-pulley-drive-motor-sizing@0.1.0",
      });

      expect(
        await repo.renameModuleInstance(
          moduleInstance.id,
          ownerId,
          "Belt & Pulley Drive",
        ),
      ).toBe(true);
      const reloaded = await repo.loadModuleInstanceForOwner(
        moduleInstance.id,
        ownerId,
      );
      expect(reloaded?.moduleInstance.label).toBe("Belt & Pulley Drive");

      expect(
        await repo.renameModuleInstance(moduleInstance.id, strangerId, "Hijacked"),
      ).toBe(false);
      expect(
        (await repo.loadModuleInstanceForOwner(moduleInstance.id, ownerId))
          ?.moduleInstance.label,
      ).toBe("Belt & Pulley Drive");
    });

    it("archives a module instance once, and a stranger cannot archive it", async () => {
      const ownerId = await newUser();
      const strangerId = await newUser();
      const project = await repo.createProject({
        ownerId,
        name: "Axis",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await repo.createConfiguration({
        projectId: project.id,
        name: "Baseline",
      });
      const assembly = await repo.createAssembly({
        configurationId: config.id,
        name: "X axis",
      });
      const moduleInstance = await repo.createModuleInstance({
        assemblyId: assembly.id,
        configurationId: config.id,
        modulePackageId: "example-scaffold",
        moduleVersion: "0.1.0",
        label: "Belt drive",
      });

      expect(
        await repo.archiveModuleInstance(moduleInstance.id, strangerId),
      ).toBe(false);
      expect(
        (await repo.loadModuleInstanceForOwner(moduleInstance.id, ownerId))
          ?.moduleInstance.archivedAt,
      ).toBeNull();

      expect(
        await repo.archiveModuleInstance(moduleInstance.id, ownerId),
      ).toBe(true);
      expect(
        (await repo.loadModuleInstanceForOwner(moduleInstance.id, ownerId))
          ?.moduleInstance.archivedAt,
      ).not.toBeNull();

      // Already archived: archiving again is a no-op, not an error.
      expect(
        await repo.archiveModuleInstance(moduleInstance.id, ownerId),
      ).toBe(false);
    });
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npx vitest run lib/db/repositories/project-repository.test.ts`
Expected: the two new tests FAIL with `repo.renameModuleInstance is not a function` / `repo.archiveModuleInstance is not a function`.

- [ ] **Step 5: Implement the two repository functions**

In `lib/db/repositories/project-repository.ts`, add immediately after `renameAssembly` (after its closing `}` at line 501, before the `// --- Module-instance execution support (Unit 2.4) ---` comment):

```ts
/** Renames a module instance owned by `ownerId`. Returns `false` when not found or not owned. */
export async function renameModuleInstance(
  moduleInstanceId: ModuleInstanceId,
  ownerId: UserId,
  label: string,
): Promise<boolean> {
  const id = parse(nonEmpty, moduleInstanceId);
  const owner = parse(nonEmpty, ownerId);
  const newLabel = parse(nonEmpty, label);
  const result = await prisma.moduleInstance.updateMany({
    where: { id, assembly: { configuration: { project: { ownerId: owner } } } },
    data: { label: newLabel },
  });
  return result.count > 0;
}

/**
 * Archives a module instance owned by `ownerId` — sets `archivedAt`, never
 * deletes anything (module-instance-management design, 2026-08-13). Returns
 * `false` when the instance does not exist, is not owned by `ownerId`, or is
 * already archived (idempotent no-op, not an error).
 */
export async function archiveModuleInstance(
  moduleInstanceId: ModuleInstanceId,
  ownerId: UserId,
): Promise<boolean> {
  const id = parse(nonEmpty, moduleInstanceId);
  const owner = parse(nonEmpty, ownerId);
  const result = await prisma.moduleInstance.updateMany({
    where: {
      id,
      archivedAt: null,
      assembly: { configuration: { project: { ownerId: owner } } },
    },
    data: { archivedAt: new Date() },
  });
  return result.count > 0;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run lib/db/repositories/project-repository.test.ts`
Expected: PASS (all tests in the file).

- [ ] **Step 7: Lint, typecheck, commit**

Run: `npm run lint -- lib/db/repositories/project-repository.ts lib/db/repositories/project-repository.test.ts && npm run typecheck`
Expected: both clean.

```bash
git add lib/db/repositories/project-repository.ts lib/db/repositories/project-repository.test.ts
git commit -m "feat: add renameModuleInstance and archiveModuleInstance repository functions"
```

---

### Task 5: Repository — list module instances linked from a source

**Files:**
- Modify: `lib/db/repositories/graph-repository.ts` (add a new exported function; place it after `listParameterLinksForConfiguration`)
- Test: `lib/db/repositories/graph-repository.test.ts`

- [ ] **Step 1: Write the failing test**

This file's own `createParameterLink` tests (e.g. `graph-repository.test.ts:307-327`, "resolves a module-output link with a null value") already show the convention: `createParameterLink` does not validate against real registered module ports, so an arbitrary `"src.out"`/`"tgt.in"`-style string is exactly what its neighboring tests already use as a parameter id, and the file's own `scaffold()`/`newModule()` helpers (`graph-repository.test.ts:44-75`) build the fixture. Add this `it` block inside the existing `describe.skipIf(!liveDatabaseAvailable)("graph-repository (live database)", ...)` block, after the "resolves a module-output link with a null value" test:

```ts
    it("lists distinct module instances linked from a source's outputs, scoped to the owner", async () => {
      const s = await scaffold();
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);
      const source = await newModule(s, "Source");
      const target = await newModule(s, "Target");
      await graph.createParameterLink({
        configurationId: s.configId,
        targetModuleInstanceId: target,
        targetParameterId: "tgt.in",
        sourceKind: "module_output",
        sourceModuleInstanceId: source,
        sourceParameterId: "src.out",
      });

      const linked = await graph.listModuleInstancesLinkedFromSource(
        source,
        s.ownerId,
      );
      expect(linked).toEqual([{ id: target, label: "Target" }]);

      expect(
        await graph.listModuleInstancesLinkedFromSource(source, stranger.id),
      ).toEqual([]);
    });
```

No new imports are needed — `randomUUID`, `projects`, `graph`, `scaffold`, and `newModule` are already in scope in this file (`graph-repository.test.ts:9`, `44`, `63`, `77-81`).

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/db/repositories/graph-repository.test.ts -t "lists distinct module instances linked from a source"`
Expected: FAILS with `graph.listModuleInstancesLinkedFromSource is not a function`.

- [ ] **Step 3: Implement the function**

In `lib/db/repositories/graph-repository.ts`, add a new exported function after `listParameterLinksForConfiguration`:

```ts
/**
 * Every other module instance that links from `sourceModuleInstanceId`'s own
 * outputs, distinct by target, scoped to `ownerId`. Read-only — used by the
 * module-instance archive impact preview (module-instance-management
 * design, 2026-08-13) to tell a founder what still depends on an instance
 * before they archive it. Archiving never removes the underlying link, so
 * unlike {@link previewRemoveParameterLinkImpact} this has no stale-impact
 * computation to run — it is a direct query, not a graph traversal.
 */
export async function listModuleInstancesLinkedFromSource(
  sourceModuleInstanceId: ModuleInstanceId,
  ownerId: UserId,
  client: DbClient = prisma,
): Promise<{ readonly id: ModuleInstanceId; readonly label: string }[]> {
  const id = parse(nonEmpty, sourceModuleInstanceId);
  const owner = parse(nonEmpty, ownerId);

  const links = await client.parameterLink.findMany({
    where: {
      sourceModuleInstanceId: id,
      targetModuleInstance: {
        assembly: { configuration: { project: { ownerId: owner } } },
      },
    },
    select: {
      targetModuleInstanceId: true,
      targetModuleInstance: { select: { label: true } },
    },
    distinct: ["targetModuleInstanceId"],
  });
  return links.map((link) => ({
    id: asModuleInstanceId(link.targetModuleInstanceId),
    label: link.targetModuleInstance.label,
  }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/db/repositories/graph-repository.test.ts -t "lists distinct module instances linked from a source"`
Expected: PASS.

- [ ] **Step 5: Run the full file, lint, typecheck, commit**

Run: `npx vitest run lib/db/repositories/graph-repository.test.ts && npm run lint -- lib/db/repositories/graph-repository.ts lib/db/repositories/graph-repository.test.ts && npm run typecheck`
Expected: all clean.

```bash
git add lib/db/repositories/graph-repository.ts lib/db/repositories/graph-repository.test.ts
git commit -m "feat: add listModuleInstancesLinkedFromSource repository function"
```

---

### Task 6: Barrel export — `lib/db/repositories/index.ts`

**Files:**
- Modify: `lib/db/repositories/index.ts`

- [ ] **Step 1: Add the new exports**

Replace:
```ts
  renameAssembly,
  loadModuleInstanceForOwner,
  updateModuleInstanceRunStatus,
```

With:
```ts
  renameAssembly,
  loadModuleInstanceForOwner,
  updateModuleInstanceRunStatus,
  renameModuleInstance,
  archiveModuleInstance,
```

Replace:
```ts
export {
  GraphRepositoryError,
  createParameterValue,
  createParameterLink,
  resolveModuleInputs,
  loadConfigurationGraph,
  parameterGraphNodeId,
  loadParameterLinkForOwner,
  deleteParameterLink,
  listParameterLinksForConfiguration,
  listCurrentParameterValuesForConfiguration,
  findCurrentParameterValueForNode,
} from "./graph-repository";
```

With:
```ts
export {
  GraphRepositoryError,
  createParameterValue,
  createParameterLink,
  resolveModuleInputs,
  loadConfigurationGraph,
  parameterGraphNodeId,
  loadParameterLinkForOwner,
  deleteParameterLink,
  listParameterLinksForConfiguration,
  listCurrentParameterValuesForConfiguration,
  findCurrentParameterValueForNode,
  listModuleInstancesLinkedFromSource,
} from "./graph-repository";
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/db/repositories/index.ts
git commit -m "feat: export module-instance rename/archive/link-lookup from lib/db"
```

---

### Task 7: Application layer — `manage-module-instances.ts`

**Files:**
- Create: `lib/application/projects/manage-module-instances.ts`
- Test: `lib/application/projects/manage-module-instances.test.ts`

- [ ] **Step 1: Write the failing test**

`rename-project.test.ts` (`lib/application/projects/rename-project.test.ts`) is
the real precedent for a `lib/application/projects` use-case test in this
codebase: a live-database integration test (`describe.skipIf(!liveDatabaseAvailable)`),
not a mocked unit test — there is no existing `vi.mock("@/lib/db", ...)`
pattern for this layer to reuse. Create
`lib/application/projects/manage-module-instances.test.ts` following that
same real-DB shape, plus `graph-repository.ts` and `workflow-repository.ts`
for the preview test's link and workflow-attachment fixtures:

```ts
// Live-database tests for the module-instance rename/archive/preview use
// cases (module-instance-management design, 2026-08-13). Same real-DB
// pattern as rename-project.test.ts.

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type {
  AssemblyId,
  MachineConfigurationId,
  ModuleInstanceId,
  UserId,
} from "@/lib/db";

describe.skipIf(!liveDatabaseAvailable)(
  "manage-module-instances (live database)",
  () => {
    let manage: typeof import("./manage-module-instances");
    let projects: typeof import("../../db/repositories/project-repository");
    let workflows: typeof import("../../db/repositories/workflow-repository");
    let graph: typeof import("../../db/repositories/graph-repository");
    let client: typeof import("../../db/client");
    const createdUserIds: string[] = [];

    interface Scaffold {
      readonly ownerId: UserId;
      readonly configId: MachineConfigurationId;
      readonly assemblyId: AssemblyId;
    }

    async function scaffold(): Promise<Scaffold> {
      const user = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(user.id);
      const project = await projects.createProject({
        ownerId: user.id,
        name: "Axis",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await projects.createConfiguration({
        projectId: project.id,
        name: "Baseline",
      });
      const assembly = await projects.createAssembly({
        configurationId: config.id,
        name: "X axis",
      });
      return { ownerId: user.id, configId: config.id, assemblyId: assembly.id };
    }

    async function newModule(
      s: Scaffold,
      label: string,
    ): Promise<ModuleInstanceId> {
      const mi = await projects.createModuleInstance({
        assemblyId: s.assemblyId,
        configurationId: s.configId,
        modulePackageId: "example-relay",
        moduleVersion: "0.1.0",
        label,
      });
      return mi.id;
    }

    beforeAll(async () => {
      manage = await import("./manage-module-instances");
      projects = await import("../../db/repositories/project-repository");
      workflows = await import("../../db/repositories/workflow-repository");
      graph = await import("../../db/repositories/graph-repository");
      client = await import("../../db/client");
    });

    afterEach(async () => {
      if (createdUserIds.length > 0) {
        await client.prisma.user.deleteMany({
          where: { id: { in: createdUserIds.splice(0) } },
        });
      }
    });

    it("rejects a blank label without updating the row", async () => {
      const s = await scaffold();
      const moduleId = await newModule(s, "Original");

      const result = await manage.renameModuleInstanceLabel(
        moduleId,
        "   ",
        s.ownerId,
      );

      expect(result).toEqual({
        ok: false,
        error: { code: "invalid_input", message: "Module label is required." },
      });
    });

    it("renames a module instance and rejects a stranger", async () => {
      const s = await scaffold();
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);
      const moduleId = await newModule(s, "Original");

      const renamed = await manage.renameModuleInstanceLabel(
        moduleId,
        "Belt & Pulley Drive",
        s.ownerId,
      );
      expect(renamed).toEqual({ ok: true });

      const hijack = await manage.renameModuleInstanceLabel(
        moduleId,
        "Hijacked",
        stranger.id,
      );
      expect(hijack).toEqual({
        ok: false,
        error: {
          code: "not_found",
          message: "Module instance not found or not owned by this user.",
        },
      });
    });

    it("archives a module instance and rejects re-archiving", async () => {
      const s = await scaffold();
      const moduleId = await newModule(s, "Belt drive");

      const archived = await manage.archiveModuleInstance(moduleId, s.ownerId);
      expect(archived).toEqual({ ok: true });

      const again = await manage.archiveModuleInstance(moduleId, s.ownerId);
      expect(again).toEqual({
        ok: false,
        error: {
          code: "not_found",
          message:
            "Module instance not found, not owned by this user, or already archived.",
        },
      });
    });

    it("previews dependents and workflow attachment before archiving", async () => {
      const s = await scaffold();
      const workflowInstance = await workflows.createWorkflowInstance({
        configurationId: s.configId,
        workflowId: "linear-axis",
        workflowVersion: "1.0.0",
      });
      const source = await projects.createModuleInstance({
        assemblyId: s.assemblyId,
        configurationId: s.configId,
        modulePackageId: "example-relay",
        moduleVersion: "0.1.0",
        label: "Source",
        workflowInstanceId: workflowInstance.id,
      });
      const target = await newModule(s, "Downstream relay");
      // example-relay declares "motion.axis.thrust_force" on both its input
      // and output (see suggest-link-sources.test.ts's own THRUST_FORCE
      // fixture note), so this is a semantically valid source-output ->
      // target-input link.
      await graph.createParameterLink({
        configurationId: s.configId,
        targetModuleInstanceId: target,
        targetParameterId: "motion.axis.thrust_force",
        sourceKind: "module_output",
        sourceModuleInstanceId: source.id,
        sourceParameterId: "motion.axis.thrust_force",
      });

      const preview = await manage.previewArchiveModuleInstanceImpact(
        source.id,
        s.ownerId,
      );

      expect(preview).toEqual({
        ok: true,
        preview: {
          dependentModuleInstanceLabels: ["Downstream relay"],
          attachedToWorkflow: true,
        },
      });
    });

    it("returns unauthorized when previewing an instance not owned by the caller", async () => {
      const s = await scaffold();
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);
      const moduleId = await newModule(s, "Belt drive");

      const preview = await manage.previewArchiveModuleInstanceImpact(
        moduleId,
        stranger.id,
      );

      expect(preview).toEqual({
        ok: false,
        error: {
          code: "unauthorized",
          message: "Module instance not found or not owned by this user.",
        },
      });
    });
  },
);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/application/projects/manage-module-instances.test.ts`
Expected: FAILS — `./manage-module-instances` does not exist yet.

- [ ] **Step 3: Implement the use cases**

Create `lib/application/projects/manage-module-instances.ts`:

```ts
// `renameModuleInstanceLabel`, `archiveModuleInstance`, and
// `previewArchiveModuleInstanceImpact` (module-instance-management design,
// docs/superpowers/specs/2026-08-13-module-instance-management-design.md).
// Bundled the way manage-assemblies.ts bundles its own related use cases.

import "server-only";
import { z } from "zod";
import {
  archiveModuleInstance as archiveModuleInstanceRow,
  listModuleInstancesLinkedFromSource,
  loadModuleInstanceForOwner,
  renameModuleInstance as renameModuleInstanceRow,
  type ModuleInstanceId,
  type UserId,
} from "@/lib/db";

/** Machine-readable classification of a module-instance-management failure. */
export type ManageModuleInstanceErrorCode =
  "invalid_input" | "unauthorized" | "not_found";

/** A failed module-instance-management outcome. */
export interface ManageModuleInstanceError {
  readonly code: ManageModuleInstanceErrorCode;
  readonly message: string;
}

const labelSchema = z
  .string()
  .trim()
  .min(1, "Module label is required.")
  .max(200);

/** Result of {@link renameModuleInstanceLabel}. */
export type RenameModuleInstanceResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: ManageModuleInstanceError };

/** Renames a module instance owned by `ownerId`. */
export async function renameModuleInstanceLabel(
  moduleInstanceId: ModuleInstanceId,
  label: string,
  ownerId: UserId,
): Promise<RenameModuleInstanceResult> {
  const labelResult = labelSchema.safeParse(label);
  if (!labelResult.success) {
    return {
      ok: false,
      error: { code: "invalid_input", message: "Module label is required." },
    };
  }
  const renamed = await renameModuleInstanceRow(
    moduleInstanceId,
    ownerId,
    labelResult.data,
  );
  if (!renamed) {
    return {
      ok: false,
      error: {
        code: "not_found",
        message: "Module instance not found or not owned by this user.",
      },
    };
  }
  return { ok: true };
}

/** Result of {@link archiveModuleInstance}. */
export type ArchiveModuleInstanceResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: ManageModuleInstanceError };

/** Archives (hides, never deletes) a module instance owned by `ownerId`. */
export async function archiveModuleInstance(
  moduleInstanceId: ModuleInstanceId,
  ownerId: UserId,
): Promise<ArchiveModuleInstanceResult> {
  const archived = await archiveModuleInstanceRow(moduleInstanceId, ownerId);
  if (!archived) {
    return {
      ok: false,
      error: {
        code: "not_found",
        message:
          "Module instance not found, not owned by this user, or already archived.",
      },
    };
  }
  return { ok: true };
}

/** What archiving a module instance would affect, shown before the founder confirms. */
export interface ArchiveModuleInstanceImpactPreview {
  /** Labels of other module instances that link from this one's own outputs. Archiving does not remove these links. */
  readonly dependentModuleInstanceLabels: readonly string[];
  /** Whether this instance currently fills a role in a workflow instance. */
  readonly attachedToWorkflow: boolean;
}

/** Result of {@link previewArchiveModuleInstanceImpact}. */
export type PreviewArchiveModuleInstanceImpactResult =
  | { readonly ok: true; readonly preview: ArchiveModuleInstanceImpactPreview }
  | { readonly ok: false; readonly error: ManageModuleInstanceError };

/**
 * Read-only preview of what archiving `moduleInstanceId` would leave
 * depending on it — shown before the founder confirms
 * (module-instance-management design "Archive (Remove)"). Archiving deletes
 * nothing, so unlike {@link previewRemoveParameterLinkImpact} this never
 * reports anything as becoming stale.
 */
export async function previewArchiveModuleInstanceImpact(
  moduleInstanceId: ModuleInstanceId,
  ownerId: UserId,
): Promise<PreviewArchiveModuleInstanceImpactResult> {
  const context = await loadModuleInstanceForOwner(moduleInstanceId, ownerId);
  if (context === null) {
    return {
      ok: false,
      error: {
        code: "unauthorized",
        message: "Module instance not found or not owned by this user.",
      },
    };
  }
  const dependents = await listModuleInstancesLinkedFromSource(
    moduleInstanceId,
    ownerId,
  );
  return {
    ok: true,
    preview: {
      dependentModuleInstanceLabels: dependents.map((dependent) => dependent.label),
      attachedToWorkflow: context.moduleInstance.workflowInstanceId !== null,
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/application/projects/manage-module-instances.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint, typecheck, commit**

Run: `npm run lint -- lib/application/projects/manage-module-instances.ts lib/application/projects/manage-module-instances.test.ts && npm run typecheck`
Expected: both clean.

```bash
git add lib/application/projects/manage-module-instances.ts lib/application/projects/manage-module-instances.test.ts
git commit -m "feat: add module-instance rename/archive/impact-preview use cases"
```

---

### Task 8: Barrel exports — `lib/application/projects/index.ts` and `lib/application/index.ts`

This is a two-level barrel: `lib/application/index.ts` re-exports everything
from `./projects` (`lib/application/projects/index.ts`), which itself
re-exports from each individual use-case file (e.g. `./manage-assemblies`).
Both levels need the new names added.

**Files:**
- Modify: `lib/application/projects/index.ts:21-30`
- Modify: `lib/application/index.ts:120-131`

- [ ] **Step 1: Add the inner barrel export**

In `lib/application/projects/index.ts`, replace:
```ts
export {
  createMachineAssembly,
  renameMachineAssembly,
  type CreateMachineAssemblyInput,
  type CreateMachineAssemblyResult,
  type RenameMachineAssemblyResult,
  type ManageAssemblyError,
  type ManageAssemblyErrorCode,
} from "./manage-assemblies";
```

With:
```ts
export {
  createMachineAssembly,
  renameMachineAssembly,
  type CreateMachineAssemblyInput,
  type CreateMachineAssemblyResult,
  type RenameMachineAssemblyResult,
  type ManageAssemblyError,
  type ManageAssemblyErrorCode,
} from "./manage-assemblies";

export {
  renameModuleInstanceLabel,
  archiveModuleInstance,
  previewArchiveModuleInstanceImpact,
  type ManageModuleInstanceErrorCode,
  type ManageModuleInstanceError,
  type RenameModuleInstanceResult,
  type ArchiveModuleInstanceResult,
  type ArchiveModuleInstanceImpactPreview,
  type PreviewArchiveModuleInstanceImpactResult,
} from "./manage-module-instances";
```

- [ ] **Step 2: Add the outer barrel export**

In `lib/application/index.ts`, replace:
```ts
  createMachineAssembly,
  renameMachineAssembly,
  type CreateMachineAssemblyInput,
  type CreateMachineAssemblyResult,
  type RenameMachineAssemblyResult,
  type ManageAssemblyError,
  type ManageAssemblyErrorCode,
  addModuleInstance,
  type AddModuleInstanceInput,
  type AddModuleInstanceResult,
  type AddModuleInstanceError,
  type AddModuleInstanceErrorCode,
} from "./projects";
```

With:
```ts
  createMachineAssembly,
  renameMachineAssembly,
  type CreateMachineAssemblyInput,
  type CreateMachineAssemblyResult,
  type RenameMachineAssemblyResult,
  type ManageAssemblyError,
  type ManageAssemblyErrorCode,
  addModuleInstance,
  type AddModuleInstanceInput,
  type AddModuleInstanceResult,
  type AddModuleInstanceError,
  type AddModuleInstanceErrorCode,
  renameModuleInstanceLabel,
  archiveModuleInstance,
  previewArchiveModuleInstanceImpact,
  type ManageModuleInstanceErrorCode,
  type ManageModuleInstanceError,
  type RenameModuleInstanceResult,
  type ArchiveModuleInstanceResult,
  type ArchiveModuleInstanceImpactPreview,
  type PreviewArchiveModuleInstanceImpactResult,
} from "./projects";
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/application/projects/index.ts lib/application/index.ts
git commit -m "feat: export module-instance management use cases from lib/application"
```

---

### Task 9: Server Actions

`app/(workspace)/workspace/actions.test.ts`'s own header comment records
that it deliberately covers only three actions
(`setModuleInputValueAction`, `startWorkflowInstanceAction`,
`deleteAccountAction`) for specific, named reasons — "every other test that
touches this action (`components/engineering/*.test.tsx`) fully mocks the
whole `./actions` module out." `renameAssemblyAction`, this task's own
direct precedent, has no dedicated test in this file at all: it is thin glue
(authorize, call one application function, map the result), and this
codebase's real convention is to exercise that glue indirectly through
component tests that mock the whole module (already covered for these three
new actions by Task 10's and Task 11's own component tests), not to add a
redundant unit test here. This task follows that same convention rather than
introducing test coverage this class of function doesn't otherwise get.

**Files:**
- Modify: `app/(workspace)/workspace/actions.ts`

- [ ] **Step 1: Implement the three actions**

In `app/(workspace)/workspace/actions.ts`, add `renameModuleInstanceLabel`, `archiveModuleInstance`, `previewArchiveModuleInstanceImpact` to the existing `@/lib/application` import block:

Replace:
```ts
import {
  addModuleInstance,
  assignComponent,
  confirmParameterLink,
  createMachineAssembly,
  createBaseline,
  createMachineDesignAssumption,
  createMachineLoadCase,
  createMachineProject,
  createMachineRequirement,
  createRequirementAcceptanceCriterion,
  deleteAccount,
  executeModuleInstance,
  removeParameterLink,
  renameMachineAssembly,
  renameMachineProject,
  setParameterValue,
  startWorkflowInstance,
} from "@/lib/application";
```

With:
```ts
import {
  addModuleInstance,
  archiveModuleInstance,
  assignComponent,
  confirmParameterLink,
  createMachineAssembly,
  createBaseline,
  createMachineDesignAssumption,
  createMachineLoadCase,
  createMachineProject,
  createMachineRequirement,
  createRequirementAcceptanceCriterion,
  deleteAccount,
  executeModuleInstance,
  previewArchiveModuleInstanceImpact,
  removeParameterLink,
  renameMachineAssembly,
  renameMachineProject,
  renameModuleInstanceLabel,
  setParameterValue,
  startWorkflowInstance,
} from "@/lib/application";
```

Then add the three new actions right after `renameAssemblyAction` (`app/(workspace)/workspace/actions.ts:125-140`):

```ts
export async function renameModuleInstanceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const result = await renameModuleInstanceLabel(
    asModuleInstanceId(fieldValue(formData, "moduleInstanceId")),
    fieldValue(formData, "name"),
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

export async function archiveModuleInstanceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const result = await archiveModuleInstance(
    asModuleInstanceId(fieldValue(formData, "moduleInstanceId")),
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

/**
 * Not a `useActionState` form action like the others in this file — called
 * directly from `ArchiveModuleInstanceDialog` as a plain async function when
 * it opens, since the impact preview is a read, not a form submission.
 */
export async function previewArchiveModuleInstanceImpactAction(
  moduleInstanceId: string,
): Promise<
  | {
      readonly ok: true;
      readonly dependentModuleInstanceLabels: readonly string[];
      readonly attachedToWorkflow: boolean;
    }
  | { readonly ok: false; readonly message: string }
> {
  const { userId } = await auth.protect();
  const result = await previewArchiveModuleInstanceImpact(
    asModuleInstanceId(moduleInstanceId),
    asUserId(userId),
  );
  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }
  return {
    ok: true,
    dependentModuleInstanceLabels: result.preview.dependentModuleInstanceLabels,
    attachedToWorkflow: result.preview.attachedToWorkflow,
  };
}
```

- [ ] **Step 2: Typecheck and run the existing action tests (no regression expected)**

Run: `npm run typecheck && npx vitest run "app/(workspace)/workspace/actions.test.ts"`
Expected: typecheck clean; the existing (unmodified) test file's own three covered actions still PASS.

- [ ] **Step 3: Lint and commit**

Run: `npm run lint -- "app/(workspace)/workspace/actions.ts"`
Expected: clean.

```bash
git add "app/(workspace)/workspace/actions.ts"
git commit -m "feat: add rename/archive/preview Server Actions for module instances"
```

---

### Task 10: Archive confirmation dialog component

**Files:**
- Create: `components/engineering/archive-module-instance-dialog.tsx`
- Test: `components/engineering/archive-module-instance-dialog.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/engineering/archive-module-instance-dialog.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, vi, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArchiveModuleInstanceDialog } from "./archive-module-instance-dialog";
import {
  archiveModuleInstanceAction,
  previewArchiveModuleInstanceImpactAction,
} from "@/app/(workspace)/workspace/actions";

vi.mock("@/app/(workspace)/workspace/actions", () => ({
  archiveModuleInstanceAction: vi.fn(),
  previewArchiveModuleInstanceImpactAction: vi.fn(),
}));

const TRIGGER_LABEL = "Open archive dialog";

describe("ArchiveModuleInstanceDialog", () => {
  it("loads and shows the impact preview when opened", async () => {
    vi.mocked(previewArchiveModuleInstanceImpactAction).mockResolvedValueOnce({
      ok: true,
      dependentModuleInstanceLabels: ["Index Table"],
      attachedToWorkflow: false,
    });
    const user = userEvent.setup();
    render(
      <ArchiveModuleInstanceDialog
        moduleInstanceId="mi_1"
        moduleInstanceLabel="Belt & Pulley Drive"
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));

    await waitFor(() => {
      expect(screen.getByText(/Index Table/)).toBeInTheDocument();
    });
    expect(previewArchiveModuleInstanceImpactAction).toHaveBeenCalledWith("mi_1");
  });

  it("shows no-dependents text when nothing links from this instance", async () => {
    vi.mocked(previewArchiveModuleInstanceImpactAction).mockResolvedValueOnce({
      ok: true,
      dependentModuleInstanceLabels: [],
      attachedToWorkflow: false,
    });
    const user = userEvent.setup();
    render(
      <ArchiveModuleInstanceDialog
        moduleInstanceId="mi_1"
        moduleInstanceLabel="Belt & Pulley Drive"
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));

    await waitFor(() => {
      expect(
        screen.getByText("No other module links from this one's outputs."),
      ).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/engineering/archive-module-instance-dialog.test.tsx`
Expected: FAILS — `./archive-module-instance-dialog` does not exist yet.

- [ ] **Step 3: Implement the component**

Create `components/engineering/archive-module-instance-dialog.tsx`:

```tsx
"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  archiveModuleInstanceAction,
  previewArchiveModuleInstanceImpactAction,
} from "@/app/(workspace)/workspace/actions";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";

export interface ArchiveModuleInstanceDialogProps {
  readonly moduleInstanceId: string;
  readonly moduleInstanceLabel: string;
  readonly trigger: ReactNode;
}

type ImpactPreviewState =
  | { readonly status: "loading" }
  | {
      readonly status: "loaded";
      readonly dependentModuleInstanceLabels: readonly string[];
      readonly attachedToWorkflow: boolean;
    }
  | { readonly status: "error"; readonly message: string };

/**
 * Archives (hides, never deletes) a module instance
 * (docs/superpowers/specs/2026-08-13-module-instance-management-design.md).
 * Shows what still links from this instance's outputs and whether it fills
 * a workflow role before the founder confirms — unlike parameter-link
 * removal's own impact preview, archiving deletes nothing, so this is a
 * "what depends on this" notice, not a stale-impact warning.
 */
export function ArchiveModuleInstanceDialog({
  moduleInstanceId,
  moduleInstanceLabel,
  trigger,
}: ArchiveModuleInstanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ImpactPreviewState>({
    status: "loading",
  });
  const [state, formAction, isPending] = useActionState(
    archiveModuleInstanceAction,
    IDLE_ACTION_STATE,
  );

  const [seenStatus, setSeenStatus] = useState(state.status);
  if (state.status !== seenStatus) {
    setSeenStatus(state.status);
    if (state.status === "success") {
      setOpen(false);
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    setPreview({ status: "loading" });
    let cancelled = false;
    void previewArchiveModuleInstanceImpactAction(moduleInstanceId).then(
      (result) => {
        if (cancelled) {
          return;
        }
        if (!result.ok) {
          setPreview({ status: "error", message: result.message });
          return;
        }
        setPreview({
          status: "loaded",
          dependentModuleInstanceLabels: result.dependentModuleInstanceLabels,
          attachedToWorkflow: result.attachedToWorkflow,
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, moduleInstanceId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <input type="hidden" name="moduleInstanceId" value={moduleInstanceId} />
          <DialogHeader>
            <DialogTitle>Archive &quot;{moduleInstanceLabel}&quot;</DialogTitle>
            <DialogDescription>
              Archiving hides this module from the navigator. Nothing is
              deleted — its saved values, links, and run history stay exactly
              as they are.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-4 text-[13px] text-text-primary">
            {preview.status === "loading" ? (
              <p className="text-text-muted">
                Checking what depends on this module…
              </p>
            ) : preview.status === "error" ? (
              <p role="alert" style={{ color: "var(--state-error)" }}>
                {preview.message}
              </p>
            ) : (
              <>
                {preview.dependentModuleInstanceLabels.length > 0 ? (
                  <p>
                    {preview.dependentModuleInstanceLabels.length} other
                    module{preview.dependentModuleInstanceLabels.length === 1
                      ? ""
                      : "s"}{" "}
                    still link
                    {preview.dependentModuleInstanceLabels.length === 1
                      ? "s"
                      : ""}{" "}
                    from this one&apos;s outputs:{" "}
                    {preview.dependentModuleInstanceLabels.join(", ")}. Those
                    links keep working; they just won&apos;t offer this module
                    as a link source for anything new.
                  </p>
                ) : (
                  <p className="text-text-muted">
                    No other module links from this one&apos;s outputs.
                  </p>
                )}
                {preview.attachedToWorkflow ? (
                  <p>
                    This module fills a role in an active workflow. Archiving
                    it leaves that role unfilled.
                  </p>
                ) : null}
              </>
            )}
            {state.status === "error" ? (
              <p role="alert" style={{ color: "var(--state-error)" }}>
                {state.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="submit" variant="outline" disabled={isPending}>
              {isPending ? "Archiving…" : "Archive"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/engineering/archive-module-instance-dialog.test.tsx`
Expected: PASS.

- [ ] **Step 5: Lint, typecheck, commit**

Run: `npm run lint -- components/engineering/archive-module-instance-dialog.tsx components/engineering/archive-module-instance-dialog.test.tsx && npm run typecheck`
Expected: both clean.

```bash
git add components/engineering/archive-module-instance-dialog.tsx components/engineering/archive-module-instance-dialog.test.tsx
git commit -m "feat: add ArchiveModuleInstanceDialog"
```

---

### Task 11: Wire rename/archive into the navigator, and hide archived instances

**Files:**
- Modify: `components/engineering/machine-navigator.tsx`
- Test: `components/engineering/machine-navigator.test.tsx`

- [ ] **Step 1: Write the failing tests**

This file already builds its module-list fixture as a top-level `const rootAssembly: AssemblyNode` with one `moduleInstance("m1", "Thrust check", "pass")` (`machine-navigator.test.tsx:81-90`), wrapped in a top-level `const configuration: ConfigurationNode` (`machine-navigator.test.tsx:102-110`), rendered inside `describe("MachineNavigator", ...)`. Add two new `it` blocks inside that same `describe`, using the module-level `configuration`/`rootAssembly` fixtures plus one new local one for the archived case (Task 3's Step 3 added the optional 4th `archivedAt` parameter to the shared `moduleInstance()` helper, used here):

```tsx
  it("hides an archived module instance from the tree", () => {
    const withArchived: ConfigurationNode = {
      ...configuration,
      assemblies: [
        {
          ...rootAssembly,
          moduleInstances: [
            moduleInstance("m1", "Thrust check", "pass"),
            moduleInstance("m3", "Archived module", null, new Date()),
          ],
          children: [],
        },
      ],
    };

    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={withArchived}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel={null}
      />,
    );

    expect(screen.getByText("Thrust check")).toBeInTheDocument();
    expect(screen.queryByText("Archived module")).not.toBeInTheDocument();
  });

  it("renders rename and archive actions for a module row", () => {
    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel={null}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Rename Thrust check" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Archive Thrust check" }),
    ).toBeInTheDocument();
  });
```

Extend this file's existing `vi.mock("@/app/(workspace)/workspace/actions", ...)` block (`machine-navigator.test.tsx:21-26`) to also stub the two new actions the new `IconButton`/dialog wiring pulls in:

Replace:
```tsx
vi.mock("@/app/(workspace)/workspace/actions", () => ({
  renameAssemblyAction: vi.fn(),
  createAssemblyAction: vi.fn(),
  addModuleInstanceAction: vi.fn(),
  startWorkflowInstanceAction: vi.fn(),
}));
```

With:
```tsx
vi.mock("@/app/(workspace)/workspace/actions", () => ({
  renameAssemblyAction: vi.fn(),
  createAssemblyAction: vi.fn(),
  addModuleInstanceAction: vi.fn(),
  startWorkflowInstanceAction: vi.fn(),
  renameModuleInstanceAction: vi.fn(),
  archiveModuleInstanceAction: vi.fn(),
  previewArchiveModuleInstanceImpactAction: vi.fn(),
}));
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run components/engineering/machine-navigator.test.tsx`
Expected: FAILS — archived instances still render, and no Rename/Archive buttons exist yet.

- [ ] **Step 3: Import the new pieces and filter archived instances**

In `components/engineering/machine-navigator.tsx`, update the icon imports:

Replace:
```tsx
import {
  Boxes,
  ChevronRight,
  FileText,
  Folder,
  GitBranch,
  GitCompareArrows,
  Layers,
  ListChecks,
  PackagePlus,
  Pencil,
  Plus,
  type LucideIcon,
} from "lucide-react";
```

With:
```tsx
import {
  Archive,
  Boxes,
  ChevronRight,
  FileText,
  Folder,
  GitBranch,
  GitCompareArrows,
  Layers,
  ListChecks,
  PackagePlus,
  Pencil,
  Plus,
  type LucideIcon,
} from "lucide-react";
```

Add the two new component imports alongside the existing `RenameDialog` import:
```tsx
import { RenameDialog } from "./rename-dialog";
import { ArchiveModuleInstanceDialog } from "./archive-module-instance-dialog";
import {
  renameAssemblyAction,
  renameModuleInstanceAction,
} from "@/app/(workspace)/workspace/actions";
```

In `AssemblyRow`, filter archived instances out before rendering and before computing `hasChildren`:

Replace:
```tsx
  const [open, setOpen] = useState(true);
  const hasChildren =
    assembly.children.length > 0 || assembly.moduleInstances.length > 0;
```

With:
```tsx
  const [open, setOpen] = useState(true);
  // Archived instances are hidden here, not filtered out of the read model
  // — a UI-layer filter, the same "hide without deleting or reshaping the
  // repository read" precedent ADR-0011 already established for hiding the
  // linear-axis discipline categories from the module picker.
  const visibleModuleInstances = assembly.moduleInstances.filter(
    (moduleInstance) => moduleInstance.archivedAt === null,
  );
  const hasChildren =
    assembly.children.length > 0 || visibleModuleInstances.length > 0;
```

Replace:
```tsx
          {assembly.moduleInstances.map((moduleInstance) => (
            <ModuleRow
              key={moduleInstance.id}
              moduleInstance={moduleInstance}
              projectId={projectId}
              selected={moduleInstance.id === selectedModuleInstanceId}
            />
          ))}
```

With:
```tsx
          {visibleModuleInstances.map((moduleInstance) => (
            <ModuleRow
              key={moduleInstance.id}
              moduleInstance={moduleInstance}
              projectId={projectId}
              selected={moduleInstance.id === selectedModuleInstanceId}
            />
          ))}
```

- [ ] **Step 4: Add rename/archive actions to `ModuleRow`**

Replace the whole `ModuleRow` function:
```tsx
function ModuleRow({
  moduleInstance,
  projectId,
  selected,
}: {
  readonly moduleInstance: ModuleInstanceRecord;
  readonly projectId: string;
  readonly selected: boolean;
}) {
  const pathname = usePathname();
  const href = `${pathname}?project=${encodeURIComponent(projectId)}&configuration=${encodeURIComponent(moduleInstance.configurationId)}&module=${encodeURIComponent(moduleInstance.id)}`;

  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-text-primary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary",
        selected ? "bg-surface-selected" : "hover:bg-surface-hover",
      )}
    >
      <Boxes
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0 text-text-muted"
      />
      <StatusBadge
        status={moduleInstance.lastRunStatus ?? "not_configured"}
        iconOnly
      />
      <span className="truncate">{moduleInstance.label}</span>
    </Link>
  );
}
```

With:
```tsx
function ModuleRow({
  moduleInstance,
  projectId,
  selected,
}: {
  readonly moduleInstance: ModuleInstanceRecord;
  readonly projectId: string;
  readonly selected: boolean;
}) {
  const pathname = usePathname();
  const href = `${pathname}?project=${encodeURIComponent(projectId)}&configuration=${encodeURIComponent(moduleInstance.configurationId)}&module=${encodeURIComponent(moduleInstance.id)}`;

  return (
    <div className="flex items-center gap-0.5 rounded-md pr-1 hover:bg-surface-hover">
      <Link
        href={href}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-text-primary",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary",
          selected && "bg-surface-selected",
        )}
      >
        <Boxes
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-text-muted"
        />
        <StatusBadge
          status={moduleInstance.lastRunStatus ?? "not_configured"}
          iconOnly
        />
        <span className="truncate">{moduleInstance.label}</span>
      </Link>

      <div className="flex shrink-0 items-center gap-0.5">
        <RenameDialog
          title="Rename module"
          action={renameModuleInstanceAction}
          idFieldName="moduleInstanceId"
          idValue={moduleInstance.id}
          currentName={moduleInstance.label}
          trigger={
            <IconButton icon={Pencil} label={`Rename ${moduleInstance.label}`} />
          }
        />
        <ArchiveModuleInstanceDialog
          moduleInstanceId={moduleInstance.id}
          moduleInstanceLabel={moduleInstance.label}
          trigger={
            <IconButton icon={Archive} label={`Archive ${moduleInstance.label}`} />
          }
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run components/engineering/machine-navigator.test.tsx`
Expected: PASS.

- [ ] **Step 6: Lint, typecheck, commit**

Run: `npm run lint -- components/engineering/machine-navigator.tsx components/engineering/machine-navigator.test.tsx && npm run typecheck`
Expected: both clean.

```bash
git add components/engineering/machine-navigator.tsx components/engineering/machine-navigator.test.tsx
git commit -m "feat: wire rename and archive actions into the module navigator row"
```

---

### Task 12: Hide archived instances from link suggestions

The design spec's "Effects of archiving" requires an archived instance's
outputs to stop being offered as a source for new links on other, active
instances. `buildConfigurationSuggestionIndex`
(`lib/application/parameters/suggest-link-sources.ts:138-146`) builds its
whole suggestion graph from every module instance in the configuration tree,
with no archive filter — this task closes that gap.

**Files:**
- Modify: `lib/application/parameters/suggest-link-sources.ts:145-146`
- Test: `lib/application/parameters/suggest-link-sources.test.ts`

- [ ] **Step 1: Write the failing test**

This file's own "suggests another module instance's output as a source"
test (`suggest-link-sources.test.ts:111-140`) is the direct model: it uses
the file's `newRelay` helper (`suggest-link-sources.test.ts:59-72`, backed
by the `example-relay` package, which declares the same canonical parameter
`THRUST_FORCE = "motion.axis.thrust_force"` on both its input and output, so
a relay-to-relay link is valid without a second module package) and
`targetInputSinkId` (`suggest-link-sources.test.ts:74-82`). Add this `it`
block inside the existing `describe.skipIf(!liveDatabaseAvailable)(...)`
block, after that test — it also exercises `projects.archiveModuleInstance`,
which Task 4 adds:

```ts
    it("does not suggest an archived module instance's output as a source", async () => {
      const s = await scaffold();
      const source = await newRelay(s, s.assemblyId, "Archived relay");
      const target = await newRelay(s, s.assemblyId, "Downstream relay");
      expect(await projects.archiveModuleInstance(source, s.ownerId)).toBe(true);

      const index = await suggest.buildConfigurationSuggestionIndex(
        s.configId,
        s.ownerId,
      );
      expect(index).not.toBeNull();
      if (index === null) return;

      const suggestions = suggest.describeLinkSuggestions(
        index,
        targetInputSinkId(target),
      );
      expect(suggestions).toEqual([]);
    });
```

No new imports are needed — `scaffold`, `newRelay`, `targetInputSinkId`,
`suggest`, and `projects` are already in scope in this file.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/application/parameters/suggest-link-sources.test.ts`
Expected: FAILS — the archived instance's outputs still appear as candidates.

- [ ] **Step 3: Filter archived instances out of the suggestion graph**

In `lib/application/parameters/suggest-link-sources.ts`, replace:

```ts
  const assemblies = flattenAssemblies(tree.assemblies);
  const moduleInstances = assemblies.flatMap((a) => a.moduleInstances);
```

With:

```ts
  const assemblies = flattenAssemblies(tree.assemblies);
  // Archived instances are excluded from the suggestion graph entirely —
  // neither offered as a link source nor a link target — the same
  // "hidden, not suggested" treatment the navigator itself gives them
  // (module-instance-management design, "Effects of archiving"). This does
  // not affect any already-confirmed ParameterLink, which resolves
  // independently of this suggestion index.
  const moduleInstances = assemblies
    .flatMap((a) => a.moduleInstances)
    .filter((mi) => mi.archivedAt === null);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/application/parameters/suggest-link-sources.test.ts`
Expected: PASS (full file, including all pre-existing tests).

- [ ] **Step 5: Lint, typecheck, commit**

Run: `npm run lint -- lib/application/parameters/suggest-link-sources.ts lib/application/parameters/suggest-link-sources.test.ts && npm run typecheck`
Expected: both clean.

```bash
git add lib/application/parameters/suggest-link-sources.ts lib/application/parameters/suggest-link-sources.test.ts
git commit -m "feat: exclude archived module instances from link suggestions"
```

---

### Task 13: Full verification and documentation sync

**Files:**
- Modify: `context/progress-tracker.md`

- [ ] **Step 1: Run the full verification suite**

Run: `npm run verify`
Expected: `format:check`, `lint`, `typecheck`, `test`, and `build` all pass. (Per `ai-workflow-rules.md` "Required Verification Before Completing a Unit.") If `format:check` flags only the pre-existing CRLF-vs-LF set already documented in `context/progress-tracker.md`'s "Environment notes," that is not a regression — confirm every file this plan touched is not in that set (it should not be; all were created/edited by this plan's own steps, not pre-existing).

- [ ] **Step 2: Confirm no released module, parameter, run, or baseline was touched**

Run: `git diff --stat main` (or the appropriate base branch) and manually confirm the changed-file list contains only: `prisma/schema.prisma`, `prisma/migrations/20260813120000_module_instance_archive/`, `lib/db/repositories/*`, `lib/application/index.ts`, `lib/application/projects/manage-module-instances.ts(.test.ts)`, `app/(workspace)/workspace/actions.ts(.test.ts)`, `components/engineering/*`, and this plan's own doc updates. Nothing under `lib/modules/`, `validation/`, or `lib/engine/parameters/definitions.ts` should appear — this unit makes no module or registry change.

- [ ] **Step 3: Update the progress tracker**

In `context/progress-tracker.md`, edit the "Active work" section in place (per `ai-workflow-rules.md` "Documentation Synchronization": edit in place, never append a dated narrative entry) to add a short record that module-instance management (friendly default labels, rename, archive-based removal) shipped, referencing `docs/superpowers/specs/2026-08-13-module-instance-management-design.md`. Follow the file's own existing terse, evidence-cited style for the new lines rather than inventing a new format.

- [ ] **Step 4: Final commit**

```bash
git add context/progress-tracker.md
git commit -m "docs: record module-instance management in the progress tracker"
```

---

## Notes for the executing agent

- Task 3 intentionally leaves `lib/db/repositories/project-repository.ts` in a broken (red) typecheck state at its own Step 6, fixed in Task 4's Step 2 — this is expected TDD sequencing, not a mistake to fix out of order. Every other fixture `archivedAt` broke (the three test files) is fixed within Task 3 itself, not left dangling.
- Do not combine Task 2 (schema/migration) with any other task's commit — `ai-workflow-rules.md`'s Split Rules call out "A Prisma schema change and new engineering formulas" explicitly, and even though this unit has no new formulas, keeping the schema change isolated makes it independently revertable.
- Task 12 depends on Task 4 (`projects.archiveModuleInstance`) even though it touches an unrelated file (`suggest-link-sources.ts`) — keep it after Task 4 in execution order, as numbered.
