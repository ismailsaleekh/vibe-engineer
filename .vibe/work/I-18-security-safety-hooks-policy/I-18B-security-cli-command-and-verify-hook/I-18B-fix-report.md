# I-18B Fix Report — BLOCKED: full-TS security command conversion requires forbidden shared surfaces

## Status: BLOCKED

Triad-B FIXER for `I-18B-security-cli-command-and-verify-hook`. Independent validation returned
`NEEDS-FIX` with one `critical` finding (F1): production command source
`packages/cli/src/commands/security/index.js` is JavaScript and violates the mandatory TypeScript
production-source gate.

Per the STOP / BLOCKED boundary, a correct **full-TypeScript production conversion** of the I-18B
security command is **not achievable within this fixer's owned write paths**. Every surface a
correct conversion requires is owned by another lane and is absent on-disk; the prompt forbids
introducing a TS runtime loader. This fixer made **zero out-of-license edits** to product files.

---

## Owned write paths (this fixer)

- `/Users/lizavasilyeva/work/vibe-engineer/packages/cli/src/commands/security/**`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18B-security-cli-command-and-verify-hook/**`

Evidence tree: `fix-evidence/` (this directory). No edits to product sources were made.

---

## Root cause

The I-18B security command is currently production JavaScript (`index.js`) consumed at runtime via
plain Node ESM imports. The repo's product runtime is **JS-source based**: `packages/cli/package.json`
`bin`/`exports` point at `./src/**/*.js` (no `dist/**`, no build step), the command loader
(`packages/cli/src/command-loader/loader.js`) and witness (`run-cli-witnesses.mjs`
`import securityCommand from './index.js'`) load the command as a `.js` ESM module, and
`@vibe-engineer/security` exports `./src/index.js`. `packages/cli/` has **no `tsconfig*.json`** and
**no `build`/`typecheck` script**.

`tsconfig.base.json` mandates a strict invariant that blocks any half-measure: `allowJs` is
unset (false by default), `module/moduleResolution: NodeNext`, `strict`, `declaration`,
`declarationMap`, `noEmitOnError`, `verbatimModuleSyntax`, `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`, `noImplicitReturns`, `skipLibCheck: false`.

Therefore producing a **correct, typechecked, shippable TypeScript production source** for the
security command requires, at minimum, surfaces this fixer does **not** own and that are **absent
on-disk**:

1. A `packages/cli/tsconfig.json` (absent; **TS-02A-owned** — this fixer may not create it).
2. A `packages/cli/package.json` `build`/`typecheck` script and `exports`/`bin` retargeted to
   `dist/**` (absent; **TS-02A / I-02A-owned** — this fixer may not edit `package.json`).
3. TS migration or `.d.ts` declarations for the security command's relative imports
   `../../envelope/result-envelope.js`, `../../errors/codes.js`, `../../errors/sanitization.js`,
   which are **still source `.js` with no declarations** (**TS-02A-owned**; `allowJs:false` means a
   strict `tsc` cannot resolve them).
4. TS migration or declarations for `@vibe-engineer/security` (exports `./src/index.js`, **no
   `.ts`/`.d.ts` anywhere in the package**) (**I-18A / future TS security lane owned**).
5. A runtime mechanism to load `.ts` at runtime (tsx / ts-node / Node `--experimental-strip-types`).
   The prompt explicitly forbids introducing one, and doing so would also require a
   **package-manager/lockfile/new-dependency mutation** (forbidden).

Because the loader/witness import `./index.js`, simply authoring `index.ts` would either (a) leave
`index.js` in place as production JS (the exact critical finding, not a fix), or (b) break the
runtime load seam (no `.js` to import, `.ts` not loadable without a forbidden loader), and in either
case could not be typechecked under the strict `tsconfig.base.json` invariant without the missing
shared surfaces above.

Per the prompt's "Why NO JavaScript exception applies" analysis and the band-aid exclusion list
(`allowJs`, `.d.ts`-shim beside retained JS production file, TS loader, dynamic-import tricks,
escape/suppression allowlist row, deferral), no in-license substitute exists.

---

## Exact on-disk evidence (read-only preflight; recorded under `fix-evidence/`)

See:
- `fix-evidence/01-dirty-tree-scope-baseline.txt` — repo scope status, owned-path inventory,
  untouchable shared-surface diff (empty → no fixer edits to forbidden paths).
- `fix-evidence/02-cross-lane-ownership-reality.txt` — full cross-lane inventory: no
  `packages/cli/tsconfig*.json`, no `packages/cli/dist`, `packages/cli/package.json`
  scripts/exports/bin (JS-source, no build), envelope/errors/command-loader still `.js` with no
  declarations, `@vibe-engineer/security` exports `./src/index.js` with no `.ts`/`.d.ts`,
  `tsconfig.base.json` strict invariant (`allowJs` false), and the JS runtime load seam
  (`createCommandLoader` + `import securityCommand from './index.js'`).

Key confirmed facts (verbatim capture in `02-…`):

- `find packages/cli -name 'tsconfig*.json'` → **none**.
- `ls packages/cli/dist` → **No such file or directory**.
- `packages/cli/package.json`: `"bin": { "vibe-engineer": "./src/entry/vibe-engineer.js" }`,
  `"exports": { ".": "./src/entry/vibe-engineer.js", "./envelope": "./src/envelope/result-envelope.js",
  "./command-loader": "./src/command-loader/loader.js" }`, `scripts` has only `test`
  (`node src/testing/run-witnesses.mjs`) — **no `build`/`typecheck`**.
- `packages/cli/src/{envelope,errors,command-loader}/` contain only `.js`
  (`result-envelope.js`, `codes.js`, `sanitization.js`, `loader.js`) — **no `.ts`/`.d.ts`**.
- `packages/security/package.json`: `"exports": { ".": "./src/index.js" }`; `find packages/security
  -name '*.ts' -o -name '*.d.ts'` → **none**.
- `tsconfig.base.json`: no `allowJs` (false by default); `NodeNext`; `strict`;
  `declaration`; `declarationMap`; `noEmitOnError: true`.
- Runtime seam: `command-loader/loader.js` `export function createCommandLoader(commands)`
  (consumes pre-loaded command objects, JS); `run-cli-witnesses.mjs`
  `import securityCommand from './index.js'` (JS ESM import — a `.ts` would not load here).

---

## Stylistic note on the LATER_COMMANDS dispatch

The loader's `LATER_COMMANDS` set includes `"security"`, but actual command dispatch in
`createCommandLoader([securityCommand])` consumes the command object passed in by the test witness;
the shipped default entry (`packages/cli/src/entry/vibe-engineer.js`) is JS and owned by I-02A — not
edited. This confirms the runtime seam is JS-source-bound and that a lone `.ts` cannot satisfy it
within license.

---

## Severity classification of this BLOCKED

Per the severity gate, the **unfixed** state retains the original `critical` F1 finding (production
JS command source). This fixer does **not** claim DONE. Halting BLOCKED is the correct, in-license
outcome: the alternative would require an out-of-license edit or a forbidden band-aid, both
explicitly disallowed.

## Zero out-of-license-edit confirmation

- No edits to `packages/cli/src/commands/security/**` were made (no product file touched).
- No edits to any untouchable shared surface (verified by empty `git diff --` over the full
  forbidden pathset in `fix-evidence/01-…`).
- No `git stash/reset/clean/checkout/restore`, no commits, no `pnpm install/add/update/remove`, no
  lockfile/manifest/new-dependency mutation.
- Only the owned `fix-evidence/**` directory and this report were created (owned write paths).

## Witnesses intentionally not run

Runtime real-boundary / positive / negative / regression / redaction witnesses were **not** re-run
post-fix because **no fix was applied** — there is no new code state to witness. Running the prior
JS state's witnesses would restate the already-known passing seams (N1–N5) and is not post-fix
proof. The correct next action is the serialized handoff below; once the shared TS surfaces exist,
this fixer (or the owning lane) should re-run the full witness set from the I-18B
implementation-validation prompt.

---

## Exact serialized handoff ruling needed

A serialized handoff (one of the following) is required to make the I-18B security command
TypeScript production source correctly:

> **Option A (preferred):** A serialized handoff from **TS-02A** granting I-18B the
> `packages/cli` build/tsconfig/exports contract — specifically: (1) create
> `packages/cli/tsconfig.json` extending `tsconfig.base.json`; (2) add `packages/cli/package.json`
> `build`/`typecheck` scripts and retarget `exports`/`bin` to `dist/**`; (3) TS-migrate or add
> `.d.ts` declarations for the consumed `packages/cli/src/envelope/**` and
> `packages/cli/src/errors/**` JS so a strict `allowJs:false` `tsc` resolves the security command's
> relative imports — **AND** a serialized handoff from **I-18A** (or the future TS security lane)
> granting TS migration / `.d.ts` declarations for `@vibe-engineer/security` so the security
> command's `@vibe-engineer/security` import typechecks.

> **Option B:** A ruling that schedules the I-18B security command TypeScript production migration
> under **TS-02A / TS-04C** (CLI package TS migration) instead of I-18B, with I-18B's role reduced
> to providing the TypeScript security command source once the CLI TS build/exports/dist contract
> (and the consumed `envelope`/`errors`/`@vibe-engineer/security` declarations) are in place.

Either ruling must also authorize the runtime-load story (a build emitting `dist/**` `.js` so the
JS loader/witness import loads the compiled command) — without introducing a forbidden TS loader
or `allowJs`.

Until one of these rulings is granted, a correct full-TypeScript conversion of the I-18B security
command is **blocked on cross-lane shared surfaces** this fixer may not touch.

---

## Fixer DONE requires independent revalidation

This report is a **BLOCKED**; it is not DONE. Even after a granted handoff and a real fix, DONE
requires independent revalidation (fixer does not self-validate). The revalidator must re-run the
full production-source gate, real-boundary, positive/negative/regression, redaction, and
shared-surface/blast-radius witness set.