# I-19 Revalidation Artifact (Triad-B adversarial revalidator)

> Model/role: glm-5.2 (zai, thinking=xhigh), **independent adversarial revalidator**.
> Implementer `DONE` is never validator `PASS`. Shape-green is not truth-green.
> Target impl report: `./implementation-report.md`
> Owned WRITE: this artifact + `revalidation-evidence/**`. Everything else read-only. No git/PM ops performed.

## VERDICT: **PASS** — I-19 is **truth-green** → unblocks I-23.

Independent re-run + independent real-boundary probes confirm every load-bearing typed
producer→consumer seam has a REAL witness (real Pino, real OTel spans/metrics via
InMemory exporters, real CSPRNG UUID v4, real W3C propagation, real DL-22 redaction).
Lockfile handoff scoped + frozen-clean; dirty-tree scope clean; sibling (I-16B) green.
4 minor-local robustness/documentation nits, **zero critical/major**, none undermining the real-boundary evidence.

---

## Stage 1 — Witnesses re-run independently (all green, real evidence)

| Witness | Command | Result |
|---|---|---|
| Vitest unit suite | `pnpm --filter @vibe-engineer/observability test` | **47/47 PASS, exit 0** (re-run myself) |
| Fixture real-boundary witness | `node run-observability-witness.mjs` | **8/8 PASS, exit 0** (re-run myself): W-RESOLVE, W1-GOLDEN-PATH (correlationId join), W2-ERROR-PATH (400+redacted), W3-NEG (4 fail-closed cases), W4-NEG-ANTI-DEGRADATION, W-PROBE-CONTRAST, W5-REG-DOMAIN-NEUTRAL, W-INVARIANTS |
| `node --check` on 9 `.js` entrypoints | report claim #1 | **exit 0** |

## Stage 2 — Independent real-boundary probes (`revalidation-evidence/probes.mjs`)

6/6 PASS (exit 0); full detail in `revalidation-evidence/probe-result.json`:
- **P1-security-binding-REAL**: `@vibe-engineer/security` resolves; `redactSecurityValue`/`redactSecurityText`/`evaluateEvidenceSafety` are real functions ⇒ the evidence's `redactionStatus:applied` is the REAL DL-22 path, **NOT** the `blocked-pending-live` fallback. **(rules out fake-green on redaction)**
- **P2-sentinel-scrubbed**: injected sentinel actually scrubbed from serialized carrier (not just a status flag); `assertNoSentinelLeak` passes; typed classification survives.
- **P3-pending-live-marker-exists**: bounded enum includes `blocked-pending-live` (honest W6 fail-closed marker present).
- **P4-uuid-v4-crypto-correct**: **50,000 ids** — all canonical v4, version nibble=4, variant∈{8,9,a,b}, **0 collisions** ⇒ real CSPRNG, no Math.random.
- **P5-w3c-propagation-roundtrip**: traceparent round-trip preserves ids; invalid inbound regenerates + flags **WITHOUT** returning/logging the raw invalid value.
- **P6-sink-enabled-sentinel-absent**: emitting a sentinel through the real sink leaves it ABSENT from capture; status=applied.

### Real-library confirmation (no mocks)
- `tracing.js` / `metrics.js` import REAL `@opentelemetry/api` + `sdk-trace-base` + `sdk-metrics` + `resources` + `semantic-conventions`; reads emitted artifacts from real `InMemorySpanExporter`/`InMemoryMetricExporter`.
- `logging.js` pino adapter calls real `pino` (level-mapped) → real newline-delimited JSON line.
- `ids.js` real CSPRNG (`crypto.randomUUID`); **fail-closed throw** if no crypto source; **no Math.random**.
- `redaction.js` consumes `@vibe-engineer/security` read-only (P1) → real `redactSecurityValue`.

## Stage 3 — W6 honest (no fake-green) ✓
- RN-crypto: RESOLVED (WebCrypto `getRandomValues` fallback + RFC bit-fixups + fail-closed throw). Not pending-live.
- Golden-path runtime: RUNS (in-process real provider; local capture/test exporters sufficient per DL-23). Not pending-live.
- Redaction: DL-22/I-18 GREEN + resolvable → `applied` (P1). `blocked-pending-live` exists ONLY as the honest fail-closed path if security is ever unresolvable (P3) — never faked.

## Stage 4 — Lockfile handoff SCOPED + dirty-tree scope + sibling (all clean)

### Lockfile (true I-19 delta = current `pnpm-lock.yaml` vs the implementer's `lockfile-before.yaml` I-19-start baseline)
- **ADDED (14)**: the pino tree exactly as reported — `pino@9.7.0`, `atomic-sleep`, `on-exit-leak-free`, `pino-abstract-transport`, `pino-std-serializers`, `process-warning`, `quick-format-unescaped`, `real-require`, `safe-stable-stringify`, `sonic-boom`, `thread-stream`, `fast-redact`, `split2` — plus clean `vite@7.1.0(@types/node@24.13.2)`.
- **REMOVED (reconciliation)**: the vite-8 native toolchain orphans — `vite@8.1.0`(+peer), `rolldown@1.1.3`, `detect-libc@2.1.2`, the 13-member `lightningcss@1.32.0` platform family, and the old lightningcss-pinned `vite@7.1.0` variant. Root cause = pre-existing root-`package.json` vite 8→7 downgrade by another lane; I-19's install reconciled the lockfile (recurring `LOCKFILE-RECONCILE`/`EXTEND` class, autonomously pre-authorized).
- **OTel: NO new snapshots** (report §5 claim verified) — already in store transitively via vitest/coverage-v8; only importer link edges added under `packages/observability`. `@vibe-engineer/security` = `link:../security` workspace edge.
- `before` baseline had 74 drift-token refs (`vite@8.1.0`/`rolldown`/`@emnapi`/`@oxc-project`/`@napi-rs/wasm-runtime`); **current has 0** → reconciliation direction matches the report.
- **NO observability-unrelated deps, NO arbitrary version bumps, NO other-lane deps materialized by I-19.** `pnpm install --frozen-lockfile` → **exit 0** (lockfile consistent with all manifests).
- Note: the large `git diff` (2332 ins) is vs committed HEAD, which predates ALL dirty-tree work; the **I-19-attributable** delta (vs its own start baseline) is tightly scoped as above.

### Dirty-tree scope (only owned paths)
`git status` attributable to I-19: `M packages/observability/package.json`; `?? packages/observability/{src,test}`; `?? examples/starter-reference/generated-fixtures/observability/`; `?? .vibe/work/I-19-observability-defaults-tests/`; + serialized `M pnpm-lock.yaml`. **No observability content in any non-owned manifest** (root, cli, presets/nest-react-rn, skills, workspace, turbo all grept empty). **No golden-* source modified** (all golden-* are pre-existing untracked `??` — consumed read-only).

### Sibling regression — NONE
I-16B golden-flow sibling-pin witness re-run myself: **10/10 PASS, exit 0**. Observability fixture consumes the golden boundary (golden-client → golden-api → golden-contracts) read-only and got real 200 (success) + 400 (fail-closed request gate) → golden seam healthy.

### TS deferral — honest
tsc errors on fixture `.ts` all accepted TS-02A class (TS2307 module-resolution / TS2339 OTel-typing / TS2580 global-require) — type-level only, **zero runtime defects** (proven by passing tests + witness). Brief §7#8/§11 explicitly defers strict-tsc.

## Findings

### Critical / Major — NONE.

### Minor-local (non-blocking; do not gate I-23)
- **M1 — `ids.js` primary crypto path is dead in ESM** (robustness nit). The package is `type:module`, so bare `require("node:crypto")` throws `ReferenceError` (caught) and execution relies on the `globalThis.crypto` (WebCrypto) fallback. Verified empirically: path = `bare-require-threw:ReferenceError -> globalThis.crypto(WebCrypto)`. **Crypto outcome is still genuinely real** (Node 24 WebCrypto `randomUUID` is CSPRNG-backed; P4 = 50k zero-collision canonical v4). tsc flags this as TS2580, absorbed under the TS-02A deferral. Recommend TS-02A sweep replace bare `require` with `createRequire(import.meta.url)` so the intended node:crypto primary path actually executes. Not a correctness/fake-green defect (both paths are crypto; no Math.random).
- **M2 — join-matrix: 2 of 5 cells hardcoded `true`** (`operationMetric`, `evidenceAssertion`) in `instrumented-boundary.ts`. The 3 load-bearing cells (`clientCallSpan`, `apiRequestSpan`, `successLog`) ARE proven by reading REAL captured OTel spans/log and asserting the SAME `correlationId`. The 2 `true` cells are structural and acceptable: DL-23 bounded-label rule forbids high-cardinality `correlationId` as a metric label, so metric emission is real (typed helper → real OTel instrument) but cannot be joined-by-id by design. The core DL-23 §7 correlation claim is proven with real evidence.
- **M3 — report §5 orphan list imprecise**. Report cited pruned orphans as `@emnapi/@oxc-project/@napi-rs/wasm-runtime`; actual pruned set is `vite@8.1.0`/`rolldown@1.1.3`/`lightningcss@1.32.0`(13 platforms)/`detect-libc@2.1.2`. Same vite 8→7 drift root; reconciliation is real and scoped (Stage 4). Documentation imprecision only.
- **M4 — W-INVARIANTS undercounts the owned serialized surface**. The witness counts root `pnpm-lock.yaml` as `baseline` (`lockfileOwned: 0`) rather than owned. The invariant check still PASSES and the lockfile scope is independently verified clean in Stage 4 above. Cosmetic accounting nit.

## Severity gate / next action
I-19 is **truth-green**: every load-bearing seam has a real-boundary witness, fail-closed negatives are non-vacuous, redaction is the real DL-22 path, UUID v4 is real crypto, W3C propagation round-trips, the lockfile delta is scoped, dirty-tree scope is clean, and the I-16B sibling is green. The 4 minor-local nits are robustness/documentation items for later sweeps (TS-02A, M2 metric-join), **none of which undermine truth-green**.

→ **PASS. Unblocks I-23.**

## Evidence files (revalidator-owned)
- `revalidation-evidence/probes.mjs` — independent real-boundary probe script.
- `revalidation-evidence/probe-result.json` — 6/6 PASS detail (security export keys, 50k-uuid stats, W3C round-trip, sentinel-scrub).
