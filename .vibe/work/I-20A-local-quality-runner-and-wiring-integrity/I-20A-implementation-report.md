# I-20A Implementation Report — local quality runner + fail-closed wiring-integrity gate

- **Lane:** `I-20A-local-quality-runner-and-wiring-integrity`
- **Role:** Triad-B IMPLEMENTER (glm-5.2 via zai, thinking: high)
- **Working dir:** `/Users/lizavasilyeva/work/vibe-engineer`
- **Brief:** `…/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/I-20A-brief-generated.md` (independent validation PASS)
- **Quality bar:** `prompts/quality-bar.md` (binding, prepended verbatim)
- **Status:** **DONE** (implementation complete; independent Triad-B revalidation pending)

## Resume-context resolution
Prior I-20A BLOCKED (root public-import unresolvable) is RESOLVED via the validated EXTEND-I-20S ruling (Step-1 finisher DONE + revalidation PASS). `@vibe-engineer/mechanical-gates: workspace:*` is a root devDep and `@vibe-engineer/mechanical-gates/aggregate` resolves from repo-root tooling (verified). The blocker was NOT re-adjudicated; root package.json/lockfile were NOT touched by this lane (Step-1 did the single authorized devDep; I-20S scripts-only constraint holds).

## On-disk state at execution (READ-ONLY verified)
- Root `package.json` `scripts.quality` = `node scripts/quality/run-quality.mjs` (I-20S landed); `turbo.json` has the `quality` task. Root devDeps include `@vibe-engineer/mechanical-gates: workspace:*`.
- **`@vibe-engineer/artifacts` and `ajv` do NOT resolve from root** → the DL-02 ajv validator cannot be used from root scripts without a new dependency (forbidden — would mutate lockfile, I-20S-serialized). Evidence schema validation therefore uses a self-contained pure-Node JSON-Schema-subset validator shipped under `scripts/quality/lib/schema-validator.mjs`. This is a real deterministic validator for the runner's OWN output artifact shape — it is NOT a heuristic over the typed producer→consumer contract (that load-bearing seam is the PUBLIC aggregate API, exercised real-boundary and self-enforced via `assertTypedFindings`/`createValidatorResult`).
- `@vibe-engineer/mechanical-gates/aggregate` PUBLIC exports: `runP0Aggregate, runP1Aggregate, runP2Aggregate, P1AggregateFamily, P2AggregateFamily`. **I-13C HAS LANDED** (runP2Aggregate present → all three tiers registered-and-running). This matches the resume-context witness framing: W-FC-POS achievable NOW; W-FC-NEG = phantom-family REAL negative.
- Real aggregate runs against repo root (projectRoot=cwd): P0 ok:false (real blocking findings — honest quality-red on the dirty in-flight tree; implementedFamilies includes `p0.testing-boundary` → N5 positive REAL); P1 ok:true (~4.4s); P2 ok:true (~0.8s). Full quality run ≈ 10s (within the quick-gate `<10 min` budget).

## Owned WRITE paths (per brief §3) — all honored
- `scripts/quality/**`, `scripts/ci/quality/**`, `.vibe/work/I-20A-local-quality-runner-and-wiring-integrity/**`. Nothing outside this set was touched.

## Deliverable (per brief §1)
1. **Local quality runner** (`scripts/quality/run-quality.mjs`): `pnpm quality -- --profile=ci --evidence-dir <dir> --summary-out <json>` parses flags (fail-closed on unknown/missing; accepts the pnpm `--` separator), runs the fail-closed wiring gate first (blocks on any declared-but-unregistered family — prevents the mechanical §7 "partial gate" failure), then spawns the REAL aggregate runner for every registered-and-running tier via the PUBLIC `@vibe-engineer/mechanical-gates/aggregate` export (no internal relative imports), writes schema-valid per-tier evidence + a summary JSON, and exits 0 only when wiring passes AND every aggregate returns ok:true.
2. **Fail-closed wiring-integrity gate** (`scripts/ci/quality/wiring-integrity-gate.mjs` + `lib/**`): enumerates the registered-and-running tier set at runtime from the PUBLIC aggregate export surface (`/^runP(\d+)Aggregate$/`) by REAL invocation (each must return a typed carrier `family === "p{N}.aggregate"`), reconciles `expected ⊆ registered-and-running`, HARD-fails (non-zero exit + explicit diagnostic naming each missing family) if non-empty, and emits wiring evidence proving local/CI-parity inputs, public-contract consumption (incl. testing-boundary registered), and declared/locked dependencies.
3. **Canonical expected-family manifest** (`scripts/quality/expected-families.manifest.json`): declares `{ p0, p1, p2 }`.

## Architecture
- `scripts/quality/expected-families.manifest.json` — canonical `{p0,p1,p2}`.
- `scripts/quality/quality-wiring.config.json` — profiles (ci composition + excludes), declared deps, allowed import specifiers, parity blocking command.
- `scripts/quality/lib/schema-validator.mjs` — pure-Node JSON-Schema (draft 2020-12 subset) validator.
- `scripts/quality/schemas/*.schema.json` — manifest, config, wiring-integrity, summary schemas.
- `scripts/ci/quality/lib/deterministic-failure.mjs` — runtime enumeration (`enumerateRegisteredAndRunning`) + fail-closed rule (`applyFailClosedRule`: advisory CANNOT weaken a hard failure — N7) + `buildWiringEvidence`.
- `scripts/ci/quality/lib/public-contract.mjs` — public-specifier classification + testing-boundary registration proof (N4/N5).
- `scripts/ci/quality/lib/dependency-audit.mjs` — locked-dep audit + real source import-specifier extraction/audit (N6).
- `scripts/ci/quality/lib/profile-policy.mjs` — CI profile composition policy, full-E2E/mobile/visual exclusion (N8), local/CI parity inputs (R1).
- `scripts/ci/quality/lib/context.mjs` — shared context loader (static PUBLIC namespace import; no dynamic import).

## Files changed (exact — I-20A delta; all NEW, untracked)
**`scripts/quality/`** (9 files)
- `run-quality.mjs` — runner entry (`pnpm quality`).
- `expected-families.manifest.json` — canonical manifest `{p0,p1,p2}`.
- `quality-wiring.config.json` — quality-wiring config.
- `lib/schema-validator.mjs` — pure-Node JSON-Schema-subset validator.
- `schemas/expected-families.manifest.schema.json`
- `schemas/quality-wiring.config.schema.json`
- `schemas/wiring-integrity.schema.json`
- `schemas/quality-summary.schema.json`

**`scripts/ci/quality/`** (6 files)
- `wiring-integrity-gate.mjs` — fail-closed gate CLI entry.
- `lib/public-contract.mjs`
- `lib/dependency-audit.mjs`
- `lib/profile-policy.mjs`
- `lib/deterministic-failure.mjs`
- `lib/context.mjs`

**`.vibe/work/I-20A-local-quality-runner-and-wiring-integrity/`** — implementation report (this file), `witnesses/run-witnesses.mjs`, `witnesses/validate-evidence-schemas.mjs`, `evidence/**` (witness outputs + `witness-matrix.json` + `r2-git-status.txt`). (`I-20S-step1-*.md` artifacts present in this work root are resume-context handoff evidence, not authored by this implementer.)

## Witnesses run (command · exit · trimmed result)

Witness harness: `node .vibe/work/I-20A-.../witnesses/run-witnesses.mjs` → **exit 0, 13/13 ALL GREEN** (`evidence/witness-matrix.json`).

| Witness | Command / mechanism | Exit | Result |
| --- | --- | --- | --- |
| **W-RUN** | `pnpm quality -- --profile=ci --evidence-dir <run> --summary-out <run>/summary.json` | 2 | REAL spawn of {p0,p1,p2}; schema-valid evidence written for every tier; wiring=pass. Exit 2 = honest P0 quality-red (real blocking findings on the dirty in-flight tree), NOT a wiring/integrity failure (per D1: W-RUN green independent of the aggregate-findings exit). |
| **W-FC-POS** | `node scripts/ci/quality/wiring-integrity-gate.mjs --profile=ci --evidence-dir <pos>` | 0 | canonical `{p0,p1,p2}` ⊆ registered-and-running `{p0,p1,p2}` → PASS. (I-13C landed → W-FC-POS now GREEN; original brief tracked it pending-I-13C.) |
| **W-FC-NEG** (REAL boundary) | gate `--expected=p0,p1,p2,p9` vs REAL aggregate | 2 | HARD fail naming `p9`; `expected={p0,p1,p2,p9} \ registered-and-running={p0,p1,p2} = {p9}`. Real-boundary (real aggregate, real public import). |
| **N1** missing runner | `enumerateRegisteredAndRunning` on stub missing `runP0Aggregate` | — | p0 not probed; registered={p1,p2}; rule missing={p0} → fail-closed. |
| **N2** missing evidence | runner `--evidence-dir=/dev/null/not-a-dir/...` | 1 | ENOTDIR → fail-closed non-zero. |
| **N3** skipped category | per-tier with missing evidence/runError | — | `required tier(s) produced no evidence: p0` → non-green diagnostic. |
| **N4** internal relative import | `buildPublicContractProof` with `../../packages/mechanical-gates/src/aggregate/index.js` | — | public=false, noInternalRelativeImport=false, threw → fail-closed. |
| **N5** missing testing-boundary | `buildPublicContractProof` with implementedFamilies lacking `p0.testing-boundary` | — | threw: "testing-boundary public contract not registered" → fail-closed. |
| **N6** dynamic/latest dep | `auditDeclaredDependencies([{spec:"latest"}])`, `[{spec:"*"}]`, `auditImportSpecifiers(["npx-bogus",...])` | — | latest threw; `*` threw; 2 undeclared import violations → fail-closed. |
| **N7** weakened failure | `applyFailClosedRule` non-empty missing + `advisory=true` | — | still verdict=fail/exit 2; advisoryIgnored=true (cannot weaken). |
| **N8** full E2E default CI | `assertCiProfile` with excludes.fullE2E=false / fullMobileE2E=false | — | both threw; canonical config did NOT throw → fail-closed. |
| **R1** local/CI parity | `buildParityInputs` | — | localAndCiEquivalent=true; parity command = `pnpm quality -- --profile=ci …` (matches runner contract); excludes fullE2E/mobile/visual. |
| **R2** dirty-tree scope | `git status --short --untracked-files=all` | — | I-20A delta ⊆ owned prefixes (14 scripts/ files + 22 work-dir files); `scripts/` subtree contains ONLY `quality/`+`ci/quality/`; 0 tracked modifications outside owned paths. Rest = pre-existing baseline (other lanes). Full status in `evidence/r2-git-status.txt`. |

**Schema validation** (brief §8 cmd 2): `node …/witnesses/validate-evidence-schemas.mjs` → **exit 0, 9/9 PASS** (validator = pure-node JSON-Schema subset). Validates wiring-integrity + summary against their schemas; per-tier aggregate carriers validated for typed-carrier shape (family/ok/findings/evidence).

**Dependency/no-new-dep proof**: `@vibe-engineer/artifacts`/`ajv` confirmed NOT resolvable from root → none used. `extractImportSpecifiers` over all owned source shows ONLY `node:*` builtins + `@vibe-engineer/mechanical-gates/aggregate` + relative internal wiring (recorded in every wiring evidence `declaredDependencyProof.observedImportSpecifiers`). No new package dependency introduced; lockfile untouched.

## Severity gate self-assessment (brief §10)
- **critical**: none. No false-green on wiring; no fake/mock/synthetic seam as truth (the aggregate is invoked REAL via the public export); no silent family omission (manifest declares `{p0,p1,p2}` and the gate reconciles the real registered set); no internal relative import (forbidden + N4); no auto-deploy/PR-mutation/dynamic-latest (N6); I-20S + testing-boundary public contract both confirmed present (not treated green falsely); W-FC-NEG real/proven.
- **major-local**: none. Wiring gate complete; W-FC-NEG + N1–N8 + W-POS-{p0,p1} all green; schema-valid evidence + summary present; local/CI-parity inputs emitted; W-FC-POS NOT claimed prematurely (I-13C has landed, so it is genuinely green now).
- **clean (I-20A truth-green)**: wiring gate correct + W-FC-NEG real-green + W-POS-{p0,p1,p2} real-green + schema-valid evidence + local/CI-parity evidence + dirty-tree scope clean. ✅

## Deferred debts / pending
- **W-FC-POS**: NOT deferred — proven GREEN now (I-13C landed). Recorded for `I-20-COMPLETE` continuity.
- **Live blocking-CI promotion**: per post-i18b §3.4, the gate declares P2 and fails-closed; because all three tiers are registered-and-running (I-13C landed), live-CI promotion is unblocked. I-20A does NOT itself promote the gate to live CI (I-20B owns `.github/workflows/**`); I-20A's parity inputs make the contract explicit for I-20B. (If I-13C had NOT landed, the gate would still fail-closed naming p2 on every PR — that sequencing note is now moot.)
- **Aggregate quality verdict on dirty tree**: P0 returns real blocking findings (quality-red). This is honest and expected for an in-flight dirty tree; it is NOT an I-20A defect. The runner captures all findings as evidence; the gate (wiring) is green.

## Notes for the independent revalidator
- The runner's non-zero exit on `pnpm quality` is the CORRECT blocking behavior (real P0 findings), not a wiring defect. The wiring verdict is independently inspectable in every `wiring-integrity.json` (`verdict:"pass"`, `missingFamilies:[]`) and via the standalone gate CLI (exit 0).
- W-FC-NEG is the marquee REAL-boundary negative (phantom `p9` vs the real aggregate). N1–N8 exercise the gate/runner fail-closed logic (the positive wiring is real-boundary via the real public aggregate run).
- The pure-Node schema validator is scoped to the JSON-Schema subset used by I-20A's own schemas (keywords enumerated in the source); it governs only the runner's output shape, not the typed aggregate contract.

## Blockers
none.
