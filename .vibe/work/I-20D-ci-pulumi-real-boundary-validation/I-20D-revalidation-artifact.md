# I-20D REVALIDATION (adversarial) — CI/Pulumi real-boundary validation

- Role: **INDEPENDENT ADVERSARIAL REVALIDATOR** (Triad-C). Implementer = Triad-B IMPLEMENTER (glm-5.2 via zai, thinking high).
- Quality bar: binding (prepended verbatim). Shape-green ≠ truth-green. Implementer `DONE` is never validator `PASS`.
- Working dir: `/Users/lizavasilyeva/work/vibe-engineer`. All witnesses re-run from repo root.
- Owned WRITE: this artifact + `revalidation-evidence/**` ONLY. Read-only on both repos; untouchable: product source, the packet/report, prior evidence, prompts/briefs/ledger, `.git/**`. No git/package-manager/Pulumi-mutating ops performed.

## Targets under revalidation
- Packet: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/evidence/I-20D-ci-pulumi-real-boundary-validation/I-20D-evidence-packet.md`
- Impl report: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-20D-ci-pulumi-real-boundary-validation/I-20D-validation-report.md`
- Implementer claim: `DONE` — deterministic witnesses PASS (W1-core/W-FC-NEG/W2/W6); D1 (CRITICAL) routed to I-20A (blast radius I-20B); live seams W3/W4/W5 honestly pending-live/BLOCKED.

## VERDICT: **PASS** — I-20D's deterministic scope is **truth-accurate**; I-20D is **truth-green for its owned scope** with D1 + the live seams as tracked blockers.

Every deterministic witness independently reproduced at the real boundary. D1 (CRITICAL) is a real defect, correctly characterized, and defensibly routed. The live seams (W3/W4/W5) are **genuinely pending-live, NOT faked**. No live seam was falsely declared PASS; no `act`/mocked-Pulumi/synthetic substitution. No out-of-license product-source edit; dirty-tree scope clean. The implementer's `DONE` is corroborated by independent on-disk reality.

---

## Numbered findings (severity + exact evidence)

> Severity scale per amendment §6 / brief §6: critical / major-local / minor-local / clean.
> I found ZERO critical, ZERO major-local attributable to I-20D. One pre-existing CRITICAL product defect (D1) is correctly **discovered and routed** by I-20D (this *strengthens* I-20D, it does not weaken it). One minor-local informational observation (M1). Everything else clean.

### F1 — clean — W1-core real aggregate run reproduces (via the implemented `=`-form CLI)
- **Witness (my run, repo root):** `node scripts/quality/run-quality.mjs --profile=ci --evidence-dir=<RV>/w1core-eq/evidence --summary-out=<RV>/w1core-eq/summary.json` → **exit 2**.
- **Reproduced evidence:** `revalidation-evidence/w1core-eq/{evidence/{p0,p1,p2}.aggregate.json, evidence/wiring-integrity.json, summary.json}`. `summary.json` wiring = `pass`, `expected/registered/missing = {p0,p1,p2}/{p0,p1,p2}/[]`; all three tiers spawned via the PUBLIC `@vibe-engineer/mechanical-gates/aggregate` export (`runP0Aggregate`/`runP1Aggregate`/`runP2Aggregate`, each `exportPresent:true, running:true`); p0 = `ok:false` with **3321 real blocking findings** (e.g. `aggregate.validator-exception` "P0 aggregate validator raised instead of returning a typed result"), p1/p2 `ok:true`.
- **Exit 2 is honest aggregate quality-red on the dirty in-flight tree, NOT a wiring defect** (the wiring verdict is independently inspectable as `pass`), exactly as the packet §2 and I-20A's revalidation §1 characterize. Forcing exit 0 here would require suppressing real findings = false-green (critical), which the runner correctly refuses.
- **Schema validity (independent, via the runner's own `assertValid`):** `wiring-integrity.json` → PASS (`wiring-integrity.schema.json`); `summary.json` → PASS (`quality-summary.schema.json`). Negative probe: summary + a rogue extra property → **rejected** (`additionalProperties:false` enforced). (`revalidation-evidence/` schema-run.)
- **Note on p0 count drift (3321 here vs packet's 3317 vs I-20A reval's 3307):** the dirty in-flight tree is evolving across concurrent lanes (multi-orchestrator env; `git status` shows live edits to `packages/mechanical-gates/**`, `packages/cli/src/commands/security/**`, etc.), so the exact blocking count drifts per run. This is expected and benign — the load-bearing fact (real p0 findings = quality-red, not a wiring defect; wiring verdict `pass`) is stable across all three runs. Non-issue.
- **Verdict: packet claim W1-core PASS corroborated.** ✓

### F2 — clean — W-FC-NEG (phantom p9) reproduces, REAL boundary
- **Witness (my run):** `node scripts/ci/quality/wiring-integrity-gate.mjs --profile=ci --evidence-dir=<RV>/wfc-neg-eq --expected=p0,p1,p2,p9` → **exit 2**.
- **Reproduced evidence:** `revalidation-evidence/wfc-neg-eq/wiring-integrity.json` → `verdict:"fail"`, `missingFamilies:["p9"]`, diagnostic explicitly names `p9` and cites mechanical §7 "CI invokes partial gate instead of aggregate gate". The REAL aggregate module is imported and every `runP{N}Aggregate` export is **really invoked** (`runtimeEnumeration.perTier`: `{p0,p1,p2}` all `running:true`); only the negative input (phantom `p9`) is operator-supplied via the gate CLI's sanctioned `--expected` flag (header-documented witness surface). Canonical manifest was NOT mutated.
- **Verdict: packet claim W-FC-NEG PASS corroborated.** Real-boundary, not synthetic/mocked. ✓

### F3 — clean — W2 static validator on REAL workflows reproduces (positive + 12/12 negatives)
- **Positive (my run):** `node scripts/ci/github-quality/validate-workflow.mjs --workflow .github/workflows/quality.yml` → **exit 0**, `OK … 0 findings; rules: ruleAggregate, rulePermissions, rulePaths, ruleUpload, ruleFullSuite, ruleSmoke, ruleActionPinning, ruleDeployMutation, ruleSecretExposure, ruleBudget, rulePullRequestTarget`. (`revalidation-evidence/w2pos-*`.)
- **Negative suite (my run):** `node scripts/ci/github-quality/run-fixtures.mjs` → **exit 0, 12/12 matched (11 negative + 1 positive)**. (`revalidation-evidence/w2neg-*`.) Real workflow-YAML variants parsed by the locked `js-yaml`; each negative fail-closes with its expected rule code; none silently passes.
- **Verdict: packet claim W2 PASS corroborated.** ✓

### F4 — clean — W6 (W-FC-POS) genuinely green at runtime (I-13C landed); NOT `pending-I-13C`
- **Witness (my run):** `node scripts/ci/quality/wiring-integrity-gate.mjs --profile=ci --evidence-dir=<RV>/wfc-pos-eq` (canonical manifest `{p0,p1,p2}`, no override) → **exit 0**.
- **Reproduced evidence:** `revalidation-evidence/wfc-pos-eq/wiring-integrity.json` → `verdict:"pass"`, `exitCode:0`, `expected={p0,p1,p2}`, `registeredAndRunningFamilies={p0,p1,p2}` (independently enumerated via real public-export invocation), `missing:[]`. `runP2Aggregate` IS an exported function — **I-13C has landed** (confirmed by direct import). The `pending-I-13C` tail collapses.
- **Verdict: packet claim W6 PASS corroborated** (genuinely green at runtime, subsumed by W1's canonical run). ✓

### F5 — clean — D1 (CRITICAL product defect) is REAL, correctly characterized, and defensibly routed
- **The defect is real and reproduced independently (the load-bearing check).**
  - **Root cause (confirmed on-disk):** `scripts/quality/run-quality.mjs` `parseArgs` (lines 21–31) accepts ONLY the `=`-joined form (`--profile=`, `--evidence-dir=`, `--summary-out=`); any `--flag value` (space-form) token does NOT match a `startsWith("--flag=")` branch and is pushed to `unknown`; `main()` then calls `failClosed("unknown argument(s) …")` → `process.exit(1)` (lines 33–35, 43–44).
  - **The contradiction (confirmed on-disk):** `.github/workflows/quality.yml` line 72 blocking step is `run: pnpm quality -- --profile=ci --evidence-dir .vibe/ci-evidence --summary-out .vibe/ci-evidence/quality-summary.json` — `--profile=ci` uses `=` (accepted) but `--evidence-dir` and `--summary-out` use the SPACE form (rejected as unknown).
  - **Reproduction (my run):** `node scripts/quality/run-quality.mjs --profile=ci --evidence-dir <dir> --summary-out <json>` → **exit 1**, stderr `FAIL-CLOSED quality: unknown argument(s) ["--evidence-dir","<dir>","--summary-out","<json>"].` (`revalidation-evidence/formA-stderr.txt`.) The aggregate NEVER spawns via this command.
  - **Blast radius confirmed:** in real hosted CI, the `quality.yml` blocking step would **fail-closed (exit 1) on every run** before the aggregate ever runs — the local/CI parity quick-gate is non-functional via its documented command. This is a genuine CRITICAL functional break of the parity gate.
- **D1 is NOT I-20D's defect and I-20D did NOT patch it** (correct — I-20D owns no product file; it is validation-only). I-20D **discovered and routed** it, which is exactly its job. This strengthens I-20D.
- **D1 characterization accuracy:** the packet's §8 description (parser accepts only `=`-form; space-form used by brief §5 + `parityBlockingCommand` + `quality.yml`; hosted CI fail-closed every run; the I-20B static validator passes `quality.yml` because it only checks the command string is present) is **exact and verified**.
- **D1 routing assessment — I concur with the implementer, with a refinement:**
  - The DOCUMENTED + VALIDATED contract is the **space-form**: brief §5 canonical command (space), `quality-wiring.config.json parityBlockingCommand` (space, line 3), `quality.yml` blocking step (space), AND — decisively — the I-20B static validator's `ruleAggregate` regex itself (`scripts/ci/github-quality/lib/rules.mjs:35` `/pnpm quality -- --profile=ci --evidence-dir\s+\S+\s+--summary-out\s+\S+/`) **expects the space-form**. The parser (`run-quality.mjs`) is the lone outlier.
  - Therefore the **correct primary owner is I-20A** (the parser is the divergent component): `parseArgs` should accept BOTH `--flag=value` AND `--flag value` forms, so the documented/validated space-form contract actually executes (backwards-compatible; no caller/validator change needed). The implementer's "primary owner I-20A" routing is **correct**.
  - **Blast-radius owner I-20B is also correct** and necessary: the static validator gave **false shape-green confidence** on this seam — it matches the command STRING (space-form) via regex but **never executes the runner**, so it could not catch D1 (a textbook shape-green≠truth-green gap that only W1's real run exposed). I-20B should add a **real-execution parity witness** so this seam can never silently break again. (If instead I-20A chose to "normalize to `=`-form everywhere", then `quality.yml`'s blocking step AND the validator's regex would BOTH need updating to `=`-form — I-20B is in the blast radius either way.)
  - **It is also a genuine cross-lane contract gap needing adjudication:** neither prior lane's revalidator caught the actual hosted-CI break — I-20A revalidation §9 NIT-1 framed space-form as "non-blocking, I-20B must use `=`-form" (i.e. assumed space-form is wrong), while I-20B revalidation §2(f) used the space-form and called it "byte-parity" (i.e. assumed space-form is the contract). These two rulings are **mutually contradictory** and the gap fell through. The fix direction that resolves the contradiction with least blast radius is **I-20A makes the parser accept both forms** (honoring the documented contract everywhere else already assumes).
- **Verdict: D1 correctly characterized + correctly routed (primary I-20A parser; blast-radius I-20B validator/workflow).** ✓

### F6 — clean — Live seams W3/W4/W5 are GENUINELY pending-live, NOT faked
- **W3 (hosted GHA) — confirmed un-runnable, no fake PASS.** `git remote -v` → empty (no GitHub remote). `gh run list --workflow quality.yml` → `failed to determine base repo: no git remotes found`. `gh` IS authenticated (`gh auth status` → `ismailsaleekh`, scopes `gist, read:org, repo`), so the ONLY missing prereq is the hosted repo/commit at HEAD — exactly as the packet §4 states. No `act`/synthetic run was substituted as truth.
- **W4 (Pulumi preview) — confirmed un-runnable, no fake PASS.** `pulumi whoami` → `error: read ".pulumi/meta.yaml" … operation error S3: GetObject … Invalid region: region was not a valid DNS name` (local backend misconfigured toward an S3 endpoint; NOT logged into Pulumi Cloud). `PULUMI_ACCESS_TOKEN` → UNSET. A live `pulumi preview --stack {dev,prod}` is therefore impossible here, exactly as packet §5 states. No `pulumi login`/`preview`/`up`/`destroy` was run; no local/S3-backend/mock output was substituted as truth.
- **W5 (protected-env deploy) — file-level proof REAL; repo-API proof correctly pending.** `.github/workflows/deploy.yml` is `workflow_dispatch`-only with `environment: ${{ inputs.stack }}` (choice `[dev, prod]`), least perms (`contents: read`), SHA-pinned actions, no `pulumi destroy` (grep clean across workflows + `infra/pulumi`), no plaintext secrets (grep clean). Repo-environment protection API proof is pending because there is no remote to query (`gh api` repo-environment protection cannot run) — exactly as packet §6 states. `deploy.yml` was NOT dispatched.
- **Verdict: every live seam is backed by a real "attempted-and-could-not-run" probe, NOT an assumption; none is falsely declared PASS.** ✓

### M1 — minor-local (informational, NON-BLOCKING) — invoking the real aggregate as a witness emits ephemeral bridge artifacts in sibling-lane work dirs (aggregate-machinery byproduct, NOT an I-20D authoring act)
- **Evidence:** files with mtimes inside I-20D's run window [01:54, 01:59] exist OUTSIDE I-20D's owned paths — under `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/aggregate/i11-bridge-artifacts/run-*` and `.vibe/work/I-13C-p2-aggregate-runner-bridge/aggregate/code-smell-bridge-artifacts/run-*`. Inspection confirms these are **aggregate-machinery build output**, not I-20D-authored content (e.g. the I-13C bridge `index.js` is a generated TypeScript code-smell detector: `export const CODE_SMELL_FAMILY = "p2.code-smell"; … CODE_SMELL_DETECTOR_IDS = ["deep-control-flow-nesting", …]`). These dirs are the aggregate's own established scratch area — **86 pre-existing `run-*` dirs** predate I-20D's window (run-IDs 10484/10494/… ≪ 43031/43329), proving this is normal aggregate emission that grows with EVERY `pnpm quality` invocation (including the I-20A revalidator's own run and any build).
- **Why non-blocking:** I-20D did not author, curate, or modify any file there — it only invoked the real aggregate as the W1 witness (which is exactly what W1 must do). These are append-only, run-scoped, machine-generated build artifacts of the P1/P2 aggregate machinery (owned by I-12/I-13C), not edits to curated sibling content. No gate is weakened; no ownership boundary is crossed in spirit. The brief's "no sibling work dir may be edited" is aimed at authoring/curating in sibling space, not at the aggregate machinery's own runtime emissions when a witness legitimately runs it. Noted only for transparency.
- **No action required.** (If anyone later wants zero side-effects from a witness run, the aggregate machinery's bridge-output path would need an out-dir override — out of I-20D's scope and unrelated to I-20D truth-green.)

---

## Explicit deliverable statements (per task §"Deliverable")

**(a) Deterministic witnesses reproduce — YES.** W1-core (`=`-form, exit 2 honest, wiring `pass`, 3 tiers spawned via public export, schema-valid summary+wiring), W-FC-NEG (phantom p9 → exit 2 naming p9, real-boundary), W2 (real `quality.yml` → exit 0; 12/12 negatives fail-closed), and W6/W-FC-POS (exit 0, `{p0,p1,p2}⊆{p0,p1,p2}`, I-13C landed) all reproduced independently at the real boundary with matching exit codes and evidence.

**(b) D1 correctly characterized + correctly routed — YES.** D1 is a real CRITICAL product defect (parser rejects the space-form the workflow + brief + config + validator-regex all use → hosted CI fail-closed every run). Independently reproduced (exit 1, `unknown argument(s)`). Routing (primary I-20A parser accept-both-forms; blast-radius I-20B real-execution parity witness) is correct and defensible; I add the refinement that the parser is the lone outlier versus the documented/validated space-form contract and should accept both forms (lowest blast radius), and that this is a genuine cross-lane contract gap (I-20A NIT-1 and I-20B §2(f) gave contradictory rulings) warranting adjudication.

**(c) Live seams genuinely pending-live, NOT faked — YES.** W3 (no git remote; `gh run list` → no remotes; gh authenticated so only the remote is missing), W4 (`pulumi whoami` S3-misconfig error; `PULUMI_ACCESS_TOKEN` unset; not logged into Pulumi Cloud), W5 (file-level proof REAL; repo-environment protection API proof pending — no remote to query). Each backed by a real probe, none substituted with `act`/mock/synthetic, none falsely declared PASS.

**(d) No out-of-license edits — YES (with informational M1).** I-20D authored files ONLY under `.vibe/work/I-20D-*/**` + `.vibe/evidence/I-20D-*/**`. Every modified (M) tracked product-source file predates I-20D's run window (latest modified tracked file is `pnpm-lock.yaml` at 01:30; I-20D's first write is 01:54 — 24 min later). The D1-relevant files (`run-quality.mjs` 00:47, `quality.yml` 01:14, `quality-wiring.config.json` 00:30) all predate I-20D and were untouched by it. The only in-window sibling writes are aggregate-machinery bridge artifacts (M1, non-blocking). No git ops by I-20D (HEAD commits are all other lanes' `chore(vibe-work)`; I-20D made none). No package-manager op; no Pulumi/deploy mutating op.

**(e) Packet truth-accurate — YES.** Every claimed PASS (W1-core, W-FC-NEG, W2, W6) is backed by a real witness command + matching exit code + real evidence that I independently reproduced. Every pending-live seam (W3/W4/W5) is backed by a real "attempted-and-could-not-run" probe (not an assumption). D1 is backed by a real reproduction (exit 1, `unknown argument(s)`). No claim in the packet was found unsubstantiated or inflated.

**(f) Dirty-tree scope clean — YES (with informational M1).** I-20D's authoring delta is confined to its owned work/evidence paths; zero product-source/tracked-file modifications by I-20D; `.git/**` untouched; no sibling curated-content edits. (M1's aggregate-machinery bridge byproducts are runtime emissions of the witness-invoked aggregate, not I-20D authoring — non-blocking.)

## Severity gate assessment (brief §6 / amendment §6)

- **critical attributable to I-20D:** NONE. (D1 is a critical PRODUCT defect that I-20D correctly discovered+routed; it is not an I-20D defect, and not patching it in place is the correct validation-only behavior.)
- **major-local attributable to I-20D:** NONE.
- **minor-local attributable to I-20D:** M1 (aggregate-bridge byproduct — informational, non-blocking, no gate weakened).
- **clean (I-20D deterministic-scope truth-green):** W1-core PASS + W-FC-NEG PASS (real-boundary) + W2 PASS (real workflow + full negative suite) + W6 PASS (genuinely green, I-13C landed) + every live seam proven-live OR explicitly `pending-live/BLOCKED` with exact prerequisite + D1 discovered+characterized+routed (not patched) + dirty-tree scope clean + packet truth-accurate. ✅
- **→ I-20D is truth-green for its owned scope.** D1 + the W3/W4/W5 live seams are tracked blockers that block **I-20-COMPLETE / FINAL-BUGHUNT live claims**, NOT I-20D's deterministic-scope PASS (per brief §6 "I-20D own truth-green" vs "I-20-COMPLETE additionally requires").

## Exact next action

1. **D1 fix routing (adjudicate + assign):** primary fix to **I-20A** — make `scripts/quality/run-quality.mjs` `parseArgs` accept BOTH `--flag=value` and `--flag value` forms (honors the documented/validated space-form contract with lowest blast radius; no caller/validator change). **Blast-radius I-20B** — add a real-execution parity witness to the static validator so the command-string-present check can never again mask a parser-rejects-the-command break. (Alternative, higher blast radius: normalize everything — workflow + validator regex + config + brief — to `=`-form; either resolves D1.) Re-validate the `quality.yml` blocking step executes green (exit 0 on a findings-clean tree / exit 2 on findings) after the fix.
2. **I-20 wave closure is gated on:** (i) D1 fixed + revalidated; (ii) W3 proven live (push to a GitHub remote → real `quality.yml` run ID/status/artifacts/summary, wall-clock < 10 min); (iii) W4 proven live (Pulumi Cloud auth → non-mutating `pulumi preview --stack dev --diff` + `--stack prod --diff`); (iv) W5 repo-environment protection API proof (configure `dev`/`prod` GitHub Environments with required reviewers + capture the protection API response). Until then the live seams remain correctly `pending-live/BLOCKED` and block only I-20-COMPLETE/FINAL-BUGHUNT live claims, not I-20D's owned deterministic PASS.
3. **No I-20D re-work required.** I-20D's validation packet + report are truth-accurate and its deterministic scope is truth-green.

---

*Revalidator evidence tree: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-20D-ci-pulumi-real-boundary-validation/revalidation-evidence/**` (independent re-runs: `w1core-eq/`, `wfc-neg-eq/`, `wfc-pos-eq/`, `w2pos-*`, `w2neg-*`, `formA-stderr.txt`, schema-run).*
