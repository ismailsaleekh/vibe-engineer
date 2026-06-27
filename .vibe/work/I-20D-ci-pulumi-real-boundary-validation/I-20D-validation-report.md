# I-20D validation report — CI/Pulumi real-boundary validation (Triad-B IMPLEMENT)

- Lane: `I-20D-ci-pulumi-real-boundary-validation` (VALIDATION-ONLY).
- Implementer: Triad-B IMPLEMENTER (glm-5.2 via zai, thinking high).
- Binding brief: `…/implementation-briefs/I-20D-brief-generated.md` (validated PASS, `…/reports/I-20D-brief-validation-artifact.md`).
- Quality bar: prepended verbatim; binding. PERFECT only; no band-aids; no out-of-license edits.
- Working dir: `/Users/lizavasilyeva/work/vibe-engineer`.
- Owned WRITE paths: `.vibe/work/I-20D-ci-pulumi-real-boundary-validation/**` + `.vibe/evidence/I-20D*/**` ONLY.
- Status: **IN PROGRESS** (report created first; updated per witness per §8).

## Stage 0 — Pre-flight gate-state snapshot

- **Sibling lane revalidation verdicts (read from their revalidation artifacts):**
  - I-20S → PASS (truth-green; unblocks I-20A).
  - I-20A → PASS (truth-green; W-RUN, W-FC-NEG, W-FC-POS, schema 9/9 all clean).
  - I-20B → PASS (truth-green; validator on real `quality.yml` + 11 neg fixtures; §3.4 caveat resolved via I-13C truth-green).
  - I-20C → PASS (truth-green for owned deterministic/static surface; live Pulumi preview honestly `pending-live/BLOCKED`, owned by I-20D).
- **Sibling on-disk outputs present + shaped:**
  - root `package.json` has `quality` script (I-20S). `turbo.json` has quality/deploy tasks (I-20S).
  - `scripts/quality/{run-quality.mjs, expected-families.manifest.json, quality-wiring.config.json, schemas/, lib/}` (I-20A).
  - `scripts/ci/quality/{wiring-integrity-gate.mjs, lib/}` (I-20A); `scripts/ci/github-quality/{validate-workflow.mjs, run-fixtures.mjs, lib/, fixtures/}` (I-20B); `scripts/ci/pulumi/validate-pulumi-scaffold.mjs` (I-20C).
  - `.github/workflows/{quality.yml, infra-preview.yml, deploy.yml}` (I-20B/C).
  - `infra/pulumi/{Pulumi.yaml, Pulumi.dev.yaml, Pulumi.prod.yaml, index.ts, tsconfig.json, package.json}` (I-20C/S).
- **I-13C state divergence (noted; brief-anticipated, §3 Step 6):** `packages/mechanical-gates/src/aggregate/index.js` now exports `runP0Aggregate` + `runP1Aggregate` + **`runP2Aggregate`** (I-13C landed). Manifest declares `{p0,p1,p2}`. → W6 (W-FC-POS) is genuinely PASS at runtime (not `pending-I-13C`). The brief's W1(e)/W2-neg prose (written at brief-gen time when only `{p0,p1}` were registered) is superseded by this on-disk reality; W-FC-NEG is reproduced via the sanctioned phantom-family `--expected` override on the wiring gate CLI (its header documents this witness surface) — NOT by mutating the canonical manifest.
- **Live-seam prerequisites identified up front:**
  - W3 hosted GHA: `git remote -v` is **empty** (no GitHub remote) → hosted run impossible.
  - W4 Pulumi preview: `pulumi` CLI present (v3.248.0), but `PULUMI_ACCESS_TOKEN` unset and local backend misconfigured toward an S3 endpoint (`pulumi whoami` → "Invalid region" S3 error); NOT logged into Pulumi Cloud → real preview impossible.
  - W5 repo-settings/API env-protection proof: no remote repo to query.
- **Pre-flight verdict:** launch gates hold (I-20A/B/C PASS + outputs present). Proceed with deterministic witnesses W1/W2/W6; record W3/W4/W5 as `pending-live/BLOCKED` with exact prerequisites.

## Per-witness results

| ID | Witness | Verdict | Evidence |
| --- | --- | --- | --- |
| W1-core | Real aggregate spawn + schema-valid evidence + wiring gate | **PASS** (via `=`-form CLI) | `w1-local-aggregate/formB-*`; wiring=pass, {p0,p1,p2} spawned, summary+wiring schema-valid |
| W1-CLI | Brief/CI parity command (space-form) | **FAIL → DEFECT D1 routed** | `w1-local-aggregate/formA-stderr.txt` |
| W1-neg | W-FC-NEG phantom p9 | **PASS** (exit 2, names p9) | `w1-negative-fc-neg/*` |
| W2-pos | Static validator on REAL `quality.yml` | **PASS** (exit 0) | `w2-workflow-validator/pos-stdout.txt` |
| W2-neg | Negative suite (11 neg + 1 pos) | **PASS** (12/12) | `w2-workflow-validator/fixtures-stdout.txt` |
| W3 | Hosted GitHub Actions run | **pending-live/BLOCKED** | `w3-hosted-gha/capture.txt` (no git remote) |
| W4 | Pulumi preview dev + prod | **pending-live/BLOCKED** | `w4-pulumi-preview/capture.txt` (no Pulumi Cloud creds; backend misconfigured to S3) |
| W5 | Protected-env deploy evidence | **partial / pending-live/BLOCKED** | file-level PASS; repo-env protection API proof pending (no remote) |
| W6 | W-FC-POS P2 positive wiring | **PASS** (I-13C landed; subsumed by W1) | `w1-local-aggregate/formB-summary.json` |

## Stage results

- **W1:** canonical aggregate machinery REAL and sound via the implemented `=`-form CLI (exit 2 = real P0 quality-red on dirty tree, NOT a wiring defect; wiring=pass; {p0,p1,p2} all spawned with schema-valid evidence). The documented/CI space-separated command FAIL-CLOSES (exit 1, unknown args) → **D1 routed** to I-20A (blast radius I-20B: `quality.yml` blocking step uses the broken form). Schema validity independently confirmed for wiring + summary. **No false PASS.**
- **W1-neg (W-FC-NEG):** phantom `p9` override via the gate CLI's sanctioned `--expected` flag (canonical manifest NOT mutated) → exit 2, `missing=[p9]`, diagnostic cites mechanical §7. **PASS.**
- **W2:** validator on real `quality.yml` exit 0; full negative suite 12/12 (every §5.15/mechanical-§7 hard-failure fixture rejected with the expected rule code). Real `js-yaml` parser boundary. **PASS.**
- **W3/W4/W5:** live seams honestly `pending-live/BLOCKED` with exact prerequisites (no remote / no Pulumi Cloud creds + S3-misconfigured backend / no repo-env API). No `act`/mocked-Pulumi/synthetic substitution; no mutating op; no dispatch.
- **W6:** I-13C landed ⇒ `{p0,p1,p2}⊆{p0,p1,p2}` green at runtime (subsumed by W1 canonical run). **PASS** (not `pending-I-13C`).

## §5.15 8-hard-failure sweep + mechanical §7 sweep

All 8 §5.15 hard failures mapped + exercised (see consolidated packet §7). Deterministic surface clean; live-evidence tails (budget wall-clock, Pulumi-Cloud preview, env-protection API, destroy-dispatch proof) honestly `pending-live/BLOCKED`.

## Defects routed (not patched)

- **D1 (CRITICAL → I-20A, blast radius I-20B):** `run-quality.mjs` parser accepts only `=`-form; the space-separated form used by the brief, `quality-wiring.config.json` `parityBlockingCommand`, and `quality.yml`'s blocking step is rejected → hosted CI would fail-closed on every run. Repro + routing in consolidated packet §8. I-20D did NOT edit any product file.

## Dirty-tree scope confirmation

`git status --porcelain` shows I-20D added ONLY untracked files under `.vibe/work/I-20D-ci-pulumi-real-boundary-validation/` and `.vibe/evidence/I-20D-ci-pulumi-real-boundary-validation/`. **Zero** product / sibling / tracked-file modifications by I-20D. No git mutation, no package-manager op, no Pulumi/deploy mutating op.

## Consolidated evidence packet + status

- Packet: `.vibe/evidence/I-20D-ci-pulumi-real-boundary-validation/I-20D-evidence-packet.md` (per-witness verdicts, raw command/output refs, schema-validity, §5.15 8-rule sweep, mechanical §7 sweep, D1 repro + routing, live-seam prerequisites).
- **Status: COMPLETE.** I-20D deterministic-scope truth-green: **PASS (one routed defect D1)**. W1-core/W1-neg/W2/W6 PASS; W3/W4/W5 honestly `pending-live/BLOCKED` with exact prerequisites (block I-20-COMPLETE / FINAL-BUGHUNT live claims, not I-20D's deterministic PASS). No live seam falsely declared PASS; no truth-substitution; no out-of-license edits.
