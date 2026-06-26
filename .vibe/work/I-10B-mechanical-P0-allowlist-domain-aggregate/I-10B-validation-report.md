# I-10B Validation Report

## Verdict

NEEDS-FIX

Highest severity: critical.

I-10B is not validation-clean. Required real-boundary commands pass, but independent adversarial probes found load-bearing false greens in the allowlist/domain-purity gates: broad `as unknown` can be missed by a heuristic unrelated `validate*` call, `as any` hard bans can be disabled by policy, and malformed domain-purity policy can accept core `ecommerce` leakage.

## Report-first / license compliance

- Created this validation report before product/source inspection.
- Validator writes were confined to `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/**`.
- Product code, fixtures, manifests, lockfiles, package-manager state, docs, and source files were read-only.
- No `git stash`, `git reset`, `git clean`, `git checkout`, or `git restore` used.
- No install/add/update command run.

## Ground truth inspected

- I-10B generated brief: `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/ta-i-10b-brief-generated.md`.
- Brief/wrapper validations: `ta-i-10b-brief-validation.md`, `i-10b-wrapper-validation.md`, `i-10b-verify-first-execute.md`.
- Implementation report/log: `I-10B-implementation-report.md`, task log `b8307cc25.output`.
- Queue/strategy/status/ledger: `post-q05-ready-queue.md`, queue validation, `post-d1-strategy-final.md`, `status.md`, ledger tail.
- Docs: `mechanical-verification-gates.md`, `verification-layer.md`, `locked-decisions.md`.

Ground truth requires typed/schema-first allowlist and domain-purity gates, actual aggregate P0 runner invoking I-10A + I-10B gates, real on-disk witnesses, no package/root/lockfile mutation, no `packages/core`, no production `@vibe-engineer/testing`, and no P1/P2/testing-boundary scope creep.

## Files and inventories inspected

I-10B source/declarations:

- `packages/mechanical-gates/src/p0/allowlist/index.js`
- `packages/mechanical-gates/src/p0/allowlist/index.d.ts`
- `packages/mechanical-gates/src/p0/allowlist/validate-escape-allowlist.js`
- `packages/mechanical-gates/src/p0/domain-purity/index.js`
- `packages/mechanical-gates/src/p0/domain-purity/index.d.ts`
- `packages/mechanical-gates/src/p0/domain-purity/validate-domain-purity.js`
- `packages/mechanical-gates/src/aggregate/index.js`
- `packages/mechanical-gates/src/aggregate/index.d.ts`
- `packages/mechanical-gates/src/aggregate/run-p0-aggregate.js`
- `packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/**`

I-10A contracts/public subpaths read-only:

- `packages/mechanical-gates/src/p0/boundaries/contracts.js`
- `packages/mechanical-gates/src/p0/boundaries/index.{js,d.ts}`
- `packages/mechanical-gates/src/p0/governed-surface/**`
- `packages/mechanical-gates/src/p0/config-guards/**`
- `packages/mechanical-gates/fixtures/p0/surface-config-boundaries/**`
- `packages/mechanical-gates/package.json`

Inventory/status evidence:

- `evidence/inventory-status.txt`
- `evidence/source-line-evidence.txt`
- `evidence/final-sweep.txt`

Key blast-radius evidence:

- `packages/mechanical-gates/package.json` sha256 is `24306f2307c7ee93b843632618ba1616586dba224fc2f88752fa87d927116116`, matching wrapper-validation evidence; exports remain I-10A-only.
- Scoped tracked diff names are empty.
- Dirty/untracked root/package/sibling baseline exists and is preserved; not classified as I-10B defect.
- No forbidden mechanical P1/P2/testing-boundary dirs found.
- No prohibited production references to `packages/core`, `@vibe-engineer/testing`, `packages/testing`, P1/P2, or testing-boundary in I-10B source.

## Source/contract/schema observations

Clean observations:

- Allowlist detector uses TypeScript AST/comment scanner, bounded path-safe reads via I-10A helpers, stable path/kind/text locator matching, typed findings/results.
- Domain-purity detector uses TypeScript AST/string/comment/path carriers and typed surface policy.
- Aggregate imports I-10A validators via actual public subpaths and I-10B validators via package-local source modules.
- Aggregate preserves subresults and converts validator exceptions into blocking typed aggregate findings.

Defect-relevant observations:

- `validate-escape-allowlist.js` lines 101-121 use name-substring heuristics (`schema|parse|validate|narrow`) and accept the next statement's `validate*` call as proof of narrowing without proving it consumes the `as unknown` value.
- `validate-escape-allowlist.js` line 202 replaces default hard bans with `policy.hardBannedEscapes`, so `hardBannedEscapes: []` disables `as-any` hard ban.
- `validate-domain-purity.js` lines 154-156 filter malformed `forbiddenTerms` entries to an empty array instead of emitting a policy-schema finding.
- `index.d.ts` policy interfaces omit runtime `proofMode` despite runtime/fixtures consuming it; declaration shape is incomplete.

## Commands and witnesses

Required commands, all from existing workspace state:

| Command | Exit | Evidence |
| --- | ---: | --- |
| `cd packages/mechanical-gates && node fixtures/p0/allowlist-domain-aggregate/witness.mjs` | 0 | `evidence/required-witnesses.txt` |
| `cd packages/mechanical-gates && node fixtures/p0/allowlist-domain-aggregate/witness.mjs --typecheck` | 0 | `evidence/required-witnesses.txt` |
| `cd packages/mechanical-gates && node fixtures/p0/surface-config-boundaries/witness.mjs` | 0 | `evidence/required-witnesses.txt` |
| `cd packages/mechanical-gates && node fixtures/p0/surface-config-boundaries/witness.mjs --typecheck` | 0 | `evidence/required-witnesses.txt` |
| `pnpm --filter @vibe-engineer/mechanical-gates typecheck` | 0 | `evidence/required-witnesses.txt`; I-10A script only |
| `pnpm --filter @vibe-engineer/mechanical-gates test:p0` | 0 | `evidence/required-witnesses.txt`; I-10A script only |

Independent adversarial probes:

| Command | Exit | Evidence |
| --- | ---: | --- |
| `node .vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/adversarial-probes.mjs` | 1 | `evidence/adversarial-probes-output.json` |

`bg_status` in this validator runtime reported no background tasks.

## Real-boundary evidence

The I-10B direct witness ran actual aggregate over on-disk fixture `fixtures/p0/allowlist-domain-aggregate/valid-aggregate` and returned `ok:true` with all five P0 families present and ok:

- `p0.governed-surface`
- `p0.config-guards`
- `p0.boundaries`
- `p0.allowlist`
- `p0.domain-purity`

The aggregate imports I-10A validators through public package subpaths and I-10B validators through package-local modules. The witness validates typed result/finding carriers through `assertTypedFindings`, preserves typed subresults, and proves aggregate omission/exception failures in the package witness. This real-boundary proof passes but does not close the critical false-green defects below.

## Positive matrix

- Valid aggregate fixture passes with all five family subresults present: PASS.
- Reviewed/current allowlist entry for fixture non-null assertion passes: PASS.
- Domain-neutral core plus typed sample-demo surface passes: PASS.
- Sample/demo terms are present in `valid-aggregate/packages/app/src/sample-demo/story.ts` and pass only because policy marks that path `sample-demo`: PASS.
- Typed result/finding carriers validated by package witness/typecheck consumer: PASS.

## Negative matrix

Package witness proves these pass as expected:

- unallowlisted `@ts-ignore`: PASS.
- unallowlisted eslint disable: PASS.
- hard-banned `as any` under fixture policy: PASS.
- raw `JSON.parse`: PASS.
- stale allowlist row: PASS.
- duplicate allowlist row: PASS.
- missing rationale: PASS.
- missing reviewer: PASS.
- malformed/missing allowlist policy: PASS.
- regex-only allowlist proof rejected: PASS.
- domain leakage fixture contains `ecommerce inventory Billz Telegram` in core and fails: PASS.
- sample/demo leakage into core fails: PASS.
- malformed/missing domain policy fixtures fail: PASS.
- regex-only domain proof rejected: PASS.
- aggregate omission of every P0 family fails: PASS.
- validator exception becomes typed blocking aggregate finding: PASS.

Independent probes add:

- unallowlisted non-null assertion: PASS.
- broad `Function` / `Object` / `{}` model types: PASS.
- `@ts-expect-error` / `@ts-nocheck`: PASS.
- allowlist policy path traversal: PASS.
- broad `as unknown` not narrowed by the same schema value: FAIL / false green.
- policy-disabled `as any` hard ban: FAIL / false green.
- malformed domain `forbiddenTerms` policy with core `ecommerce` leakage: FAIL / false green.

## Regression matrix

- I-10A public-subpath direct witness and `--typecheck` pass: PASS.
- Existing package-filter scripts pass and are correctly treated as I-10A-only, not I-10B coverage: PASS.
- No `packages/core` assumption in I-10B source: PASS.
- No production dependency/reference to `@vibe-engineer/testing`: PASS.
- No P1/P2/testing-boundary directories created: PASS.
- Root/lockfile/package-manager files remain dirty/untracked baseline with no scoped tracked diff evidence; no install/add/update run by validator: PASS with dirty-tree note.
- Declarations are consumable by package witness, but policy declarations are incomplete for runtime `proofMode`: NEEDS-FIX major-local.

## Findings

### F-CRIT-01 — Allowlist false-green for broad `as unknown`

Severity: critical.

Evidence:

- `evidence/adversarial-probes-output.json`, probe `allowlist rejects broad as unknown not narrowed by same named runtime schema`: expected `ok:false`, actual `ok:true`, no findings.
- Source lines 101-121 accept any next-statement call whose name contains `validate`/`parse`/`schema`/`narrow`; they do not prove the `as unknown` value is passed to that schema/narrower.

Impact: unallowlisted unsafe broad `as unknown` can pass P0 allowlist. This is a heuristic production false green for a required negative.

Required fix: require structured proof that the same expression/declared value is immediately consumed by a named runtime schema/narrower, otherwise emit blocking `allowlist.unallowlisted-escape`; add owned product fixture/witness coverage.

### F-CRIT-02 — `as any` hard ban can be disabled by policy

Severity: critical.

Evidence:

- `evidence/adversarial-probes-output.json`, probe `allowlist does not allow policy to weaken default hard ban for as any`: expected `ok:false`, actual `ok:true`, no findings.
- Source line 202 replaces `DEFAULT_HARD_BANNED` with `policy.hardBannedEscapes` when the policy field is present, so `hardBannedEscapes: []` removes the default `as-any` hard ban.

Impact: policy can approve a hard-banned unsafe type escape, contradicting mechanical gate doctrine.

Required fix: make default hard bans non-removable, union any policy additions with defaults, reject attempts to weaken defaults, and add a negative fixture proving `as any` remains blocking even with an allowlist row.

### F-CRIT-03 — Domain-purity policy schema is permissive and can accept core leakage

Severity: critical.

Evidence:

- `evidence/adversarial-probes-output.json`, probe `domain-purity rejects malformed forbiddenTerms policy instead of default-green`: expected `ok:false`, actual `ok:true`, no findings, with source text containing core `ecommerce`.
- Source lines 154-156 filter malformed `forbiddenTerms` values to `[]` rather than emitting a policy-schema finding.

Impact: malformed domain policy can silently disable forbidden-term scanning and allow business-domain leakage in core.

Required fix: validate `forbiddenTerms` as a non-empty string array when present/required by schema; fail closed on malformed/empty entries; add fixture/witness coverage.

### F-MAJOR-01 — Package-local negative witness matrix is incomplete

Severity: major-local.

Evidence:

- `witness.mjs` allowlist/domain failure arrays cover 23 negatives but omit package-owned fixtures for broad `as unknown`, unallowlisted non-null assertion, broad `Function/Object/{}` types, `@ts-expect-error`/`@ts-nocheck`, policy hard-ban weakening, and malformed typed `forbiddenTerms`.
- Independent probes had to supply these missing witnesses and found three false greens.

Required fix: add real on-disk fixtures under `fixtures/p0/allowlist-domain-aggregate/**` and package-local witness assertions for every required negative.

### F-MAJOR-02 — Policy declarations do not match runtime/fixture shape

Severity: major-local.

Evidence:

- Runtime and fixtures use `proofMode` in allowlist/domain policy schemas; `src/p0/allowlist/index.d.ts` and `src/p0/domain-purity/index.d.ts` exported policy interfaces omit it.

Required fix: update owned declarations to match runtime policy schemas after source schema fixes, and extend declaration consumer checks.

## Dirty-tree safety / blast radius

- Dirty tree accepted; no clean-tree request.
- Unrelated untracked root/package/sibling paths remain untouched.
- I-10B product edits are confined to owned source/fixture paths; validator writes only work-dir report/evidence.
- `packages/mechanical-gates/package.json` unchanged from wrapper-validation hash and still has only I-10A exports/scripts.
- No root manifest/config/lockfile/package-manager mutation by this validation.

## Final decision

NEEDS-FIX. Defects are fixable within I-10B owned source/fixture/declaration paths; no scheduler/root/package-manager ruling is required for the fixes identified here. I-10B must not unlock I-10C/I-07C until fixed and independently revalidated.
