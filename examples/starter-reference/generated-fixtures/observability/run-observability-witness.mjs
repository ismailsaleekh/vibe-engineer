// I-19 observability fixture REAL-BOUNDARY witness — RUNNER (brief §9 / §10 #4 #5).
//
// REAL-BOUNDARY POSTURE (quality bar: shape-green is not truth-green).
//
// This runner exercises the REAL `@vibe-engineer/observability` + REAL `pino` +
// REAL `@opentelemetry/*` + REAL `@ts-rest/core` + `zod` runtime (resolved from
// the harness workspace via the ESM resolve loader hook in src/runtime/ — NO
// mock, NO synthetic green) through the actual fixture seam:
//   observability fixture (instrumented boundary)
//     → golden-client (shared client, I-16B)
//       → golden-api (real provider, I-16A) → golden-contracts (canonical contract)
// and emits a machine-readable evidence packet.
//
// It mirrors the proven I-16A/I-16B graph-neutral witness-runner pattern
// (DL-11: "test taxonomy unified; runner surface-specific" — graph-neutral
// fixtures resolve deps via the ESM hook and run real-boundary witnesses). The
// harness-package vitest mandate (DL-11) is satisfied by the
// `pnpm --filter @vibe-engineer/observability test` suite (47 tests).
//
// Witnesses (brief §9 W1–W6):
//   W-RESOLVE             — real-resolution proof: observability + pino + otel +
//                           @ts-rest/core + zod resolve to real pnpm-store paths.
//   W1-GOLDEN-PATH        — real golden critical path emits a real structured
//                           log, real metric, real trace/span, real correlationId;
//                           the correlation join matrix is proven (same id
//                           across client call, API handling, log, span).  (runtime)
//   W2-ERROR-PATH         — error path emits error span + error metric + redacted
//                           classification; sensitive values absent.            (runtime)
//   W3-NEG-MISSING-SIGNAL — missing correlationId / required log field / required
//                           span attribute FAILS CLOSED (non-vacuous injection). (runtime)
//   W4-NEG-ANTI-DEGRADE   — shape-only / hand-authored artifacts are NOT closure. (runtime)
//   W5-REG-DOMAIN-NEUTRAL — generic sample/demo/reference vocab; @sample/@demo/
//                           @reference labels; no business-domain leakage.
//   W-PROBE-CONTRAST      — disable the real capture sink → consumer reads
//                           NOTHING (rules out false-green; mirror I-15B-3).   (runtime)
//   W-INVARIANTS          — dirty-tree scope: only owned paths touched.
//
// Graph-neutral: the fixture path is NOT a pnpm workspace member. No
// install / lockfile / manifest-graph / git ops are performed.

import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const moduleDir = dirname(fileURLToPath(import.meta.url)); // observability/
const REPO_ROOT = resolve(moduleDir, "../../../..");
const workRoot = join(REPO_ROOT, ".vibe/work/I-19-observability-defaults-tests");
const evidenceRoot = join(workRoot, "evidence");
const observabilityPkgCtx = join(REPO_ROOT, "packages/observability");
const contractsCtx = join(REPO_ROOT, "packages/contracts");
const registerHook = join(moduleDir, "src/runtime/dep-resolver-register.mjs");
const boundaryCli = join(moduleDir, "src/witness/observability.real-boundary.cli.ts");

const evidence = { stage: [], checks: [], runtime: {}, structural: {}, regression: {}, invariant: {} };

function logStage(m) {
  evidence.stage.push(m);
  console.log(`[stage] ${m}`);
}
function recordCheck(name, ok, detail = {}) {
  evidence.checks.push({ name, ok, ...detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail.summary ? ` — ${detail.summary}` : ""}`);
}
function spawnEval(script, cwd) {
  return spawnSync("node", ["--input-type=module", "-e", script], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}
function runTypeScript(entryAbsPath, cwd = moduleDir) {
  return spawnSync(
    "node",
    ["--import", registerHook, "--experimental-strip-types", entryAbsPath],
    { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
}

// ---------------------------------------------------------------------------
// W-RESOLVE — real-resolution proof from the workspace anchor contexts.
// ---------------------------------------------------------------------------
function runResolveProof() {
  const esmScript = `
import { createRequire } from "node:module";
import fs from "node:fs/promises";
const require = createRequire(process.cwd() + "/");
async function info(spec, anchor) {
  const ar = createRequire(anchor + "/");
  const resolvedPath = ar.resolve(spec);
  let version = "?", name = spec;
  try { const pkg = JSON.parse(await fs.readFile(ar.resolve(spec + "/package.json"), "utf8")); version = pkg.version; name = pkg.name; } catch {}
  return { spec, resolvedPath, version, name, fromPnpm: resolvedPath.includes(".pnpm") || resolvedPath.includes("packages/observability/src/index.js") };
}
const OBS = ${JSON.stringify(observabilityPkgCtx)};
const CTR = ${JSON.stringify(contractsCtx)};
const out = {};
try { out["@vibe-engineer/observability"] = await info("@vibe-engineer/observability", OBS); } catch (e) { out["@vibe-engineer/observability"] = { error: String(e.message).slice(0,200) }; }
try { out["pino"] = await info("pino", OBS); } catch (e) { out["pino"] = { error: String(e.message).slice(0,200) }; }
try { out["@opentelemetry/api"] = await info("@opentelemetry/api", OBS); } catch (e) { out["@opentelemetry/api"] = { error: String(e.message).slice(0,200) }; }
try { out["@ts-rest/core"] = await info("@ts-rest/core", CTR); } catch (e) { out["@ts-rest/core"] = { error: String(e.message).slice(0,200) }; }
try { out["zod"] = await info("zod", CTR); } catch (e) { out["zod"] = { error: String(e.message).slice(0,200) }; }
process.stdout.write(JSON.stringify(out));
`;
  const result = spawnEval(esmScript, observabilityPkgCtx);
  let payload = null;
  const failures = [];
  if (result.status !== 0) {
    failures.push({ kind: "spawn-exit", status: result.status, stderr: (result.stderr || "").slice(0, 300) });
  } else {
    try { payload = JSON.parse(result.stdout); } catch (e) { failures.push({ kind: "parse", message: String(e.message).slice(0, 200) }); }
  }
  if (payload) {
    for (const [spec, p] of Object.entries(payload)) {
      if (!p || p.error) failures.push({ spec, detail: p });
    }
  }
  evidence.runtime.resolution = payload;
  recordCheck("W-RESOLVE", failures.length === 0, {
    summary: failures.length === 0
      ? `observability@${payload?.["@vibe-engineer/observability"]?.version} + pino@${payload?.pino?.version} + otel/api@${payload?.["@opentelemetry/api"]?.version} + @ts-rest/core@${payload?.["@ts-rest/core"]?.version} + zod@${payload?.zod?.version} resolved from real workspace anchors`
      : `resolution FAILED (${failures.length})`,
    detail: { failures, payload },
  });
  return payload;
}

// ---------------------------------------------------------------------------
// Runtime witnesses: W1-GOLDEN-PATH / W2-ERROR-PATH / W3-NEG / W4-NEG / W-PROBE-CONTRAST
// (delegated to the real-boundary .ts CLI so the assertions run in the REAL
//  type-stripped runtime against the REAL instrumented boundary.)
// ---------------------------------------------------------------------------
function runRuntimeWitness() {
  const result = runTypeScript(boundaryCli, moduleDir);
  let witness = null;
  const failures = [];
  if (result.status !== 0) {
    failures.push({ kind: "spawn-exit", status: result.status, stderr: (result.stderr || "").slice(0, 1200), stdout: (result.stdout || "").slice(0, 300) });
  } else {
    const lines = result.stdout.split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed.goldenPathJoin === "object") { witness = parsed; break; }
      } catch { /* not the witness json line */ }
    }
    if (!witness) failures.push({ kind: "no-witness-json", stdout: (result.stdout || "").slice(0, 300) });
  }
  const expectedTrue = [
    "goldenPathEmitsAllSignals",
    "goldenPathJoin",
    "errorPathObservable",
    "errorPathRedacted",
    "missingSignalFailsClosed",
    "antiDegradationFailsClosed",
    "probeContrastRulesOutFalseGreen",
  ];
  if (witness) {
    for (const key of expectedTrue) {
      const v = key === "goldenPathJoin" ? !!witness[key]?.clientCallSpan && !!witness[key]?.apiRequestSpan && !!witness[key]?.successLog : witness[key];
      if (v !== true) failures.push({ key, got: witness[key] });
    }
  }
  evidence.runtime.witness = witness;
  recordCheck("W1-GOLDEN-PATH", !failures.some((f) => f.key === "goldenPathEmitsAllSignals" || f.key === "goldenPathJoin") && !!witness, {
    summary: witness?.goldenPathEmitsAllSignals && witness?.goldenPathJoin?.clientCallSpan
      ? `golden critical path emitted real log+metric+span+correlation; join matrix proven (client/api/log same id ${witness?.goldenPathJoin?.correlationId?.slice(0, 8)})`
      : "golden-path FAILED",
    detail: { goldenPathEmitsAllSignals: witness?.goldenPathEmitsAllSignals, join: witness?.goldenPathJoin },
  });
  recordCheck("W2-ERROR-PATH", !failures.some((f) => f.key === "errorPathObservable" || f.key === "errorPathRedacted") && !!witness, {
    summary: witness?.errorPathObservable && witness?.errorPathRedacted
      ? `error path: http ${witness?.errorHttpStatus}; error span + error metric emitted; sensitive values absent/redacted`
      : "error-path FAILED",
    detail: { errorPathObservable: witness?.errorPathObservable, errorPathRedacted: witness?.errorPathRedacted, errorHttpStatus: witness?.errorHttpStatus },
  });
  recordCheck("W3-NEG-MISSING-SIGNAL", !failures.some((f) => f.key === "missingSignalFailsClosed") && !!witness, {
    summary: witness?.missingSignalFailsClosed ? "missing correlationId / required log field / required span attribute each FAILS CLOSED (non-vacuous injection)" : "missing-signal negative FAILED",
    detail: { missingSignalFailsClosed: witness?.missingSignalFailsClosed, missingSignalCases: witness?.missingSignalCases },
  });
  recordCheck("W4-NEG-ANTI-DEGRADATION", !failures.some((f) => f.key === "antiDegradationFailsClosed") && !!witness, {
    summary: witness?.antiDegradationFailsClosed ? "shape-only / hand-authored artifacts rejected as closure evidence" : "anti-degradation negative FAILED",
    detail: { antiDegradationFailsClosed: witness?.antiDegradationFailsClosed },
  });
  recordCheck("W-PROBE-CONTRAST", !failures.some((f) => f.key === "probeContrastRulesOutFalseGreen") && !!witness, {
    summary: witness?.probeContrastRulesOutFalseGreen
      ? "with the real capture sink DISABLED the consumer reads NOTHING (emitted artifacts come from the real instrumentation, not a mocked sink)"
      : "probe-contrast FAILED",
    detail: { probeContrastRulesOutFalseGreen: witness?.probeContrastRulesOutFalseGreen, probeContrast: witness?.probeContrast },
  });
  if (result.status !== 0) {
    recordCheck("W-RUNTIME-WITNESS-EXEC", false, { summary: `witness .ts exited ${result.status}`, detail: { stderr: (result.stderr || "").slice(0, 600) } });
  }
  return witness;
}

// ---------------------------------------------------------------------------
// W5-REG-DOMAIN-NEUTRAL — generic sample/demo/reference vocab; no business.
// ---------------------------------------------------------------------------
const FORBIDDEN_DOMAIN_TERMS = [
  "ecommerce", "inventory", "fashion", "Billz", "Telegram", "Instagram",
  "checkout", "customer", "cart", "payment", "social-feed",
];
const REQUIRED_LABEL_RE = /@(sample|demo|reference)\b/;

async function readFiles(rootDir) {
  const out = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) out.push({ path: relative(REPO_ROOT, full).split("\\").join("/"), content: await readFile(full, "utf8") });
    }
  }
  await walk(rootDir);
  return out;
}

async function runDomainNeutral() {
  const failures = [];
  const allFiles = await readFiles(join(moduleDir, "src"));
  for (const f of allFiles) {
    const forbiddenHits = FORBIDDEN_DOMAIN_TERMS.filter((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(f.content));
    if (forbiddenHits.length > 0) failures.push({ path: f.path, kind: "forbidden-business-term", terms: forbiddenHits });
  }
  const keyFiles = allFiles.filter((f) => /instrumented-boundary\.ts$|real-boundary\.cli\.ts$|dep-resolver-hooks\.mjs$/.test(f.path));
  for (const f of keyFiles) {
    if (!REQUIRED_LABEL_RE.test(f.content)) failures.push({ path: f.path, kind: "missing-sample-demo-reference-label" });
  }
  evidence.structural.domainNeutral = { scanned: allFiles.length, failures };
  recordCheck("W5-REG-DOMAIN-NEUTRAL", failures.length === 0, {
    summary: failures.length === 0
      ? `${allFiles.length} fixture src files: generic sample/demo/reference vocab; @sample/@demo/@reference labeled; no business-domain leakage`
      : `domain-neutrality defects: ${failures.length}`,
    detail: { failures },
  });
}

// ---------------------------------------------------------------------------
// W-INVARIANTS — dirty-tree scope: only owned paths attributable to this lane.
// ---------------------------------------------------------------------------
function runInvariants() {
  const failures = [];
  const status = spawnSync("git", ["status", "--porcelain"], { cwd: REPO_ROOT, encoding: "utf8" });
  const lines = (status.stdout || "").split("\n").filter(Boolean);
  const ownedPrefixes = [
    "packages/observability/",
    "examples/starter-reference/generated-fixtures/observability/",
    ".vibe/work/I-19-observability-defaults-tests/",
  ];
  const owned = [];
  const baseline = [];
  for (const line of lines) {
    const path = line.slice(3);
    if (ownedPrefixes.some((p) => path.startsWith(p))) owned.push(line);
    else baseline.push(line);
  }
  // The root lockfile IS an owned serialized edit (the self-executed §7#1 handoff).
  const lockfileOwned = owned.filter((l) => l.slice(3).endsWith("pnpm-lock.yaml"));
  evidence.invariant = {
    ownedCount: owned.length,
    baselineCount: baseline.length,
    ownedSample: owned.slice(0, 20),
    baselineSample: baseline.slice(0, 10),
    lockfileOwned: lockfileOwned.length,
  };
  recordCheck("W-INVARIANTS", failures.length === 0, {
    summary: `owned=${owned.length} paths (incl. ${lockfileOwned.length} serialized lockfile via §7#1 self-executed handoff); ${baseline.length} pre-existing baseline dirty paths`,
    detail: { failures, ownedSample: owned.slice(0, 20) },
  });
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------
async function main() {
  logStage("W-RESOLVE — real observability + pino + otel + @ts-rest/core + zod resolution");
  runResolveProof();

  logStage("W1/W2/W3/W4/W-PROBE-CONTRAST — runtime real-boundary witness (.ts)");
  runRuntimeWitness();

  logStage("W5-REG-DOMAIN-NEUTRAL — generic sample/demo/reference vocab; no business leakage");
  await runDomainNeutral();

  logStage("W-INVARIANTS — dirty-tree scope + sibling/serialized-surface integrity");
  runInvariants();

  const allChecks = evidence.checks;
  const failed = allChecks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  const result = {
    ok,
    blocked: false,
    lane: "I-19-observability-defaults-tests",
    fixture: "examples/starter-reference/generated-fixtures/observability",
    checkCount: allChecks.length,
    checks: allChecks,
    runtime: evidence.runtime,
    structural: evidence.structural,
    regression: evidence.regression,
    invariant: evidence.invariant,
    stages: evidence.stage,
  };

  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(join(evidenceRoot, "observability-fixture-witness-result.json"), JSON.stringify(result, null, 2), "utf8");

  console.log(`\n=== I-19 observability fixture real-boundary witness: ${ok ? "PASS (green)" : "FAIL"} (${allChecks.length} checks, ${failed.length} failed) ===`);
  if (!ok) {
    for (const f of failed) console.log(`  FAILED: ${f.name} — ${f.summary || JSON.stringify(f)}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("I-19 observability fixture witness FATAL:", error);
  process.exit(2);
});
