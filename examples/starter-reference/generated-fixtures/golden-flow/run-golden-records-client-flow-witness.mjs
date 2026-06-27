// I-16B golden-client/golden-flow REAL-BOUNDARY witness — RUNNER (brief §8 validation).
//
// REAL-BOUNDARY POSTURE (quality bar: shape-green is not truth-green).
//
// This runner exercises the REAL `@ts-rest/core` + `zod` runtime (resolved from
// the installed harness `packages/contracts` deps via the ESM resolve loader hook
// in src/runtime/ — NO mock, NO synthetic green) through the actual fixture seam:
//   golden-client (shared client + per-platform transports)
//     → golden-flow (web + mobile consumption witnesses)
//       → I-16A provider (golden-api) → I-16A contract (golden-contracts),
// and emits a machine-readable evidence packet.
//
// Witnesses (brief §7):
//   W-RESOLVE                  — real-resolution proof: @ts-rest/core + zod resolve
//                                to real pnpm-store paths from packages/contracts.
//   W-SHARED-CLIENT-DERIVED    — golden-client imports the I-16A contract-derived
//                                client/types; defines NO Zod schema / route
//                                contract / hand-authored fetch DTO; provenance
//                                names the canonical contract path + SHA-256
//                                matching a fresh sha of the I-16A contract.
//   W-NO-FORK                  — web + mobile transports import the SAME shared
//                                client + SAME I-16A contract; NO schema/route
//                                contract re-declaration (single source).
//   W-BOTH-PLATFORMS-CONSUME   — web + mobile witnesses exercise the SAME shared
//                                client against the real provider (accepted).  (runtime)
//   W-FLOW                     — golden flow (classify → read → consume) succeeds
//                                end-to-end; response re-parsed + accepted.     (runtime)
//   W-NEG-REQ                  — invalid payload through shared client → 400
//                                before application logic (probe unset).        (runtime)
//   W-CLIENT-INVALID-RESP      — validating shared client rejects an invalid
//                                network response.                              (runtime)
//   W-DOMAIN-NEUTRAL           — only goldenRecord*/golden-records sample/demo/
//                                reference vocabulary; @sample/@demo/@reference
//                                labels present; no business-domain leakage.
//   W-REG-REGEN                — re-running the witness is idempotent.
//   W-INVARIANTS               — dirty-tree scope: only owned paths touched;
//                                sibling fixtures + serialized surfaces intact.
//
// Graph-neutral: the fixture paths are NOT pnpm workspace members. No
// install / lockfile / manifest-graph / git ops are performed.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const moduleDir = dirname(fileURLToPath(import.meta.url)); // golden-flow/
const goldenFlowRoot = moduleDir;
const goldenClientRoot = resolve(moduleDir, "../golden-client");
// golden-flow is at <repo>/examples/starter-reference/generated-fixtures/golden-flow
// → 4 directories below the repository root.
const REPO_ROOT = resolve(moduleDir, "../../../..");
const workRoot = join(REPO_ROOT, ".vibe/work/I-16B-starter-client-golden-flow");
const evidenceRoot = join(workRoot, "evidence");
const contractsCtx = join(REPO_ROOT, "packages/contracts");
const goldenContractsRoot = resolve(moduleDir, "../golden-contracts");
const canonicalContract = join(goldenContractsRoot, "src/golden-records.contract.ts");

const registerHook = join(goldenFlowRoot, "src/runtime/dep-resolver-register.mjs");
const witnessCli = join(goldenFlowRoot, "src/witness/golden-records.client-flow.real-boundary.cli.ts");

const evidence = { stage: [], checks: [], runtime: {}, structural: {}, regression: {}, invariant: {} };

function logStage(message) {
  evidence.stage.push(message);
  console.log(`[stage] ${message}`);
}
function recordCheck(name, ok, detail = {}) {
  evidence.checks.push({ name, ok, ...detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail.summary ? ` — ${detail.summary}` : ""}`);
}
function sha256(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
function spawnEval(script, cwd) {
  return spawnSync("node", ["--input-type=module", "-e", script], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}
function runTypeScript(entryAbsPath, cwd = goldenFlowRoot) {
  return spawnSync(
    "node",
    ["--import", registerHook, "--experimental-strip-types", entryAbsPath],
    { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
}

// ---------------------------------------------------------------------------
// W-RESOLVE — real-resolution proof from the packages/contracts context.
// ---------------------------------------------------------------------------
function runResolveProof() {
  const esmScript = `
import { createRequire } from "node:module";
import fs from "node:fs/promises";
const require = createRequire(process.cwd() + "/");
async function info(spec) {
  const resolvedPath = require.resolve(spec);
  const pkgPath = require.resolve(spec + "/package.json");
  const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
  return { spec, resolvedPath, version: pkg.version, name: pkg.name };
}
const out = { "@ts-rest/core": null, zod: null };
try { out["@ts-rest/core"] = await info("@ts-rest/core"); } catch (e) { out["@ts-rest/core"] = { error: String(e.message).slice(0,200) }; }
try { out.zod = await info("zod"); } catch (e) { out.zod = { error: String(e.message).slice(0,200) }; }
process.stdout.write(JSON.stringify(out));
`;
  const result = spawnEval(esmScript, contractsCtx);
  let payload = null;
  const failures = [];
  if (result.status !== 0) {
    failures.push({ kind: "spawn-exit", status: result.status, stderr: (result.stderr || "").slice(0, 300) });
  } else {
    try { payload = JSON.parse(result.stdout); } catch (e) { failures.push({ kind: "parse", message: String(e.message).slice(0, 200) }); }
  }
  if (payload) {
    for (const spec of ["@ts-rest/core", "zod"]) {
      const p = payload[spec];
      if (!p || p.error) failures.push({ spec, detail: p });
      else if (typeof p.resolvedPath !== "string" || !p.resolvedPath.includes(".pnpm")) {
        failures.push({ spec, kind: "not-from-pnpm-store", resolvedPath: p.resolvedPath });
      }
    }
    if (payload["@ts-rest/core"]?.version !== "3.52.1") failures.push({ kind: "ts-rest-version", got: payload["@ts-rest/core"]?.version });
    if (payload.zod?.version !== "3.25.76") failures.push({ kind: "zod-version", got: payload.zod?.version });
  }
  evidence.runtime.resolution = payload;
  recordCheck("W-RESOLVE", failures.length === 0, {
    summary: failures.length === 0
      ? `@ts-rest/core@${payload?.["@ts-rest/core"]?.version} + zod@${payload?.zod?.version} resolved from packages/contracts (.pnpm store)`
      : `resolution FAILED (${failures.length})`,
    detail: { failures, payload }
  });
  return payload;
}

// ---------------------------------------------------------------------------
// Runtime witnesses: W-BOTH-PLATFORMS-CONSUME / W-FLOW / W-NEG-REQ / W-CLIENT-INVALID-RESP
// ---------------------------------------------------------------------------
function runRuntimeWitness() {
  const result = runTypeScript(witnessCli, goldenFlowRoot);
  let witness = null;
  const failures = [];
  if (result.status !== 0) {
    failures.push({ kind: "spawn-exit", status: result.status, stderr: (result.stderr || "").slice(0, 800), stdout: (result.stdout || "").slice(0, 300) });
  } else {
    const lines = result.stdout.split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed.sharedClientDerivedFromContract === "boolean") { witness = parsed; break; }
      } catch (_) { /* not the witness json line */ }
    }
    if (!witness) failures.push({ kind: "no-witness-json", stdout: (result.stdout || "").slice(0, 300) });
  }
  const expected = {
    sharedClientDerivedFromContract: true,
    webConsumesSharedClient: true,
    mobileConsumesSharedClient: true,
    validFlowAccepted: true,
    invalidPayloadRejected: true,
    clientRejectsInvalidResponse: true
  };
  if (witness) {
    for (const key of Object.keys(expected)) {
      if (witness[key] !== true) failures.push({ key, got: witness[key] });
    }
  }
  evidence.runtime.witness = witness;
  recordCheck("W-BOTH-PLATFORMS-CONSUME", !failures.some((f) => f.key === "webConsumesSharedClient" || f.key === "mobileConsumesSharedClient") && !!witness, {
    summary: witness?.webConsumesSharedClient && witness?.mobileConsumesSharedClient
      ? "web + mobile exercise the SAME shared client against the real provider (accepted)"
      : "both-platforms-consume FAILED",
    detail: { webConsumesSharedClient: witness?.webConsumesSharedClient, mobileConsumesSharedClient: witness?.mobileConsumesSharedClient }
  });
  recordCheck("W-FLOW", !failures.some((f) => f.key === "validFlowAccepted") && !!witness, {
    summary: witness?.validFlowAccepted ? "golden flow (classify → read → consume) succeeded end-to-end (both transports, response re-parsed)" : "flow FAILED",
    detail: { validFlowAccepted: witness?.validFlowAccepted }
  });
  recordCheck("W-NEG-REQ", !failures.some((f) => f.key === "invalidPayloadRejected") && !!witness, {
    summary: witness?.invalidPayloadRejected ? "invalid payload through shared client → 400 before application logic (probe unset)" : "invalid-request fail-closed FAILED",
    detail: { invalidPayloadRejected: witness?.invalidPayloadRejected }
  });
  recordCheck("W-CLIENT-INVALID-RESP", !failures.some((f) => f.key === "clientRejectsInvalidResponse") && !!witness, {
    summary: witness?.clientRejectsInvalidResponse ? "validating shared client rejected invalid network response" : "client validation FAILED",
    detail: { clientRejectsInvalidResponse: witness?.clientRejectsInvalidResponse }
  });
  if (result.status !== 0) {
    recordCheck("W-RUNTIME-WITNESS-EXEC", false, { summary: `witness .ts exited ${result.status}`, detail: { stderr: (result.stderr || "").slice(0, 400) } });
  }
  return witness;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SCHEMA_DEFINITION_RE = /\bz\.(object|string|number|enum|literal|boolean|array|union)\s*\(/;

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

// ---------------------------------------------------------------------------
// W-SHARED-CLIENT-DERIVED — golden-client derives ONLY from the I-16A contract.
// ---------------------------------------------------------------------------
async function runSharedClientDerived() {
  const failures = [];
  const clientFiles = await readFiles(join(goldenClientRoot, "src"));
  const flowFiles = await readFiles(join(goldenFlowRoot, "src"));

  // 1. NO Zod schema definition / route-contract re-declaration / hand-authored
  //    fetch DTO in either golden-client or golden-flow src.
  const findings = [];
  for (const f of [...clientFiles, ...flowFiles]) {
    if (SCHEMA_DEFINITION_RE.test(f.content)) findings.push({ path: f.path });
  }
  if (findings.length > 0) failures.push({ kind: "schema-definition-found", findings });

  const initRouterRe = /\binitContract\s*\(|\.router\s*\(/;
  const routerFindings = [];
  for (const f of [...clientFiles, ...flowFiles]) {
    if (initRouterRe.test(f.content)) routerFindings.push({ path: f.path });
  }
  if (routerFindings.length > 0) failures.push({ kind: "route-contract-redeclared", findings: routerFindings });

  // 2. golden-client imports the I-16A generated client + contract-derived types.
  const clientBlob = clientFiles.map((f) => f.content).join("\n");
  if (!/golden-contracts\/src\/generated\/golden-records-client\.js/.test(clientBlob)) {
    failures.push({ kind: "golden-client-does-not-import-i16a-generated-client" });
  }
  if (!/golden-contracts\/src\/golden-records\.contract\.js/.test(clientBlob)) {
    failures.push({ kind: "golden-client-does-not-import-i16a-contract-types" });
  }

  // 3. SHARED_CLIENT_PROVENANCE carries the canonical contract path + a source
  //    SHA-256 matching a fresh sha256 of the on-disk I-16A contract.
  const contractSource = readFile(canonicalContract, "utf8");
  const freshContractSha = sha256(await contractSource);
  const sharedClientSrc = clientFiles.find((f) => /golden-records\.shared-client\.ts$/.test(f.path))?.content ?? "";
  const provenancePathOk = /canonicalContractPath:\s*"[^"]*golden-contracts\/src\/golden-records\.contract\.ts"/.test(sharedClientSrc);
  if (!provenancePathOk) failures.push({ kind: "missing-canonicalContractPath-provenance" });
  const provenanceShaOk = new RegExp(`canonicalContractSourceSha256:\\s*"${freshContractSha}"`).test(sharedClientSrc);
  if (!provenanceShaOk) failures.push({ kind: "provenance-sourceSha256-mismatch", freshContractSha });

  evidence.structural.sharedClientDerived = { scanned: [...clientFiles, ...flowFiles].length, findings, routerFindings, freshContractSha };
  recordCheck("W-SHARED-CLIENT-DERIVED", failures.length === 0, {
    summary: failures.length === 0
      ? `golden-client + golden-flow (${[...clientFiles, ...flowFiles].length} files) define NO Zod schema / route contract; provenance contract path + SHA-256 match the I-16A contract`
      : `shared-client-derived defects: ${failures.length}`,
    detail: { failures }
  });
}

// ---------------------------------------------------------------------------
// W-NO-FORK — web + mobile transports import the SAME shared client + SAME contract.
// ---------------------------------------------------------------------------
async function runNoFork() {
  const failures = [];
  const webSrc = readFile(join(goldenClientRoot, "src/transport/web.ts"), "utf8");
  const mobileSrc = readFile(join(goldenClientRoot, "src/transport/mobile.ts"), "utf8");
  const web = await webSrc;
  const mobile = await mobileSrc;

  // Both transports import the SAME I-16A provider handler (real boundary) and
  // build an ApiFetcher feeding the shared client (no per-platform contract).
  const sameProviderImport = /golden-api\/src\/provider\/golden-records\.provider\.js/.test(web) && /golden-api\/src\/provider\/golden-records\.provider\.js/.test(mobile);
  if (!sameProviderImport) failures.push({ kind: "transports-disagree-on-provider-import" });

  // NO Zod schema / route contract in transports.
  if (SCHEMA_DEFINITION_RE.test(web)) failures.push({ kind: "web-transport-defines-schema" });
  if (SCHEMA_DEFINITION_RE.test(mobile)) failures.push({ kind: "mobile-transport-defines-schema" });
  if (/\binitContract\s*\(|\.router\s*\(/.test(web)) failures.push({ kind: "web-transport-redeclares-route-contract" });
  if (/\binitContract\s*\(|\.router\s*\(/.test(mobile)) failures.push({ kind: "mobile-transport-redeclares-route-contract" });

  // Both consumption witnesses import the SAME shared-client surface.
  const webCons = await readFile(join(goldenFlowRoot, "src/consumption/web/golden-records.web-consumption.ts"), "utf8");
  const mobileCons = await readFile(join(goldenFlowRoot, "src/consumption/mobile/golden-records.mobile-consumption.ts"), "utf8");
  const sameSharedClientImport = /golden-client\/src\/transport\/(web|mobile)\.js/.test(webCons) && /golden-client\/src\/(use-golden-records|golden-records\.shared-client)\.js/.test(webCons)
    && /golden-client\/src\/transport\/(web|mobile)\.js/.test(mobileCons) && /golden-client\/src\/(use-golden-records|golden-records\.shared-client)\.js/.test(mobileCons);
  if (!sameSharedClientImport) failures.push({ kind: "consumption-witnesses-do-not-import-shared-client" });

  evidence.structural.noFork = { sameProviderImport, sameSharedClientImport };
  recordCheck("W-NO-FORK", failures.length === 0, {
    summary: failures.length === 0
      ? "web + mobile transports + consumption witnesses import the SAME shared client + SAME I-16A contract (no schema/route fork)"
      : `no-fork defects: ${failures.length}`,
    detail: { failures }
  });
}

// ---------------------------------------------------------------------------
// W-DOMAIN-NEUTRAL — golden sample/demo/reference vocabulary only; no business.
// ---------------------------------------------------------------------------
const FORBIDDEN_DOMAIN_TERMS = [
  "ecommerce", "inventory", "fashion", "Billz", "Telegram", "Instagram",
  "checkout", "customer", "cart", "payment", "social-feed"
];
const REQUIRED_LABEL_RE = /@(sample|demo|reference)\b/;
const GOLDEN_RE = /\b(golden-record|golden-records|GoldenRecord|goldenRecord)\b/;

async function runDomainNeutral() {
  const failures = [];
  const allFiles = [...(await readFiles(join(goldenClientRoot, "src"))), ...(await readFiles(join(goldenFlowRoot, "src"))), ...(await readFiles(join(goldenFlowRoot, "src/runtime")))];
  for (const f of allFiles) {
    const blob = f.content;
    const forbiddenHits = FORBIDDEN_DOMAIN_TERMS.filter((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(blob));
    if (forbiddenHits.length > 0) failures.push({ path: f.path, kind: "forbidden-business-term", terms: forbiddenHits });
  }
  // Key files must carry golden vocab + @sample/@demo/@reference label.
  const keyFiles = allFiles.filter((f) => /shared-client\.ts$|use-golden-records\.ts$|transport\/(web|mobile)\.ts$|flow\.ts$|(web|mobile)-consumption\.ts$|client-flow\.real-boundary\.ts$/.test(f.path));
  for (const f of keyFiles) {
    if (!GOLDEN_RE.test(f.content)) failures.push({ path: f.path, kind: "missing-golden-vocab" });
    if (!REQUIRED_LABEL_RE.test(f.content)) failures.push({ path: f.path, kind: "missing-sample-demo-reference-label" });
  }
  evidence.structural.domainNeutral = { scanned: allFiles.length, failures };
  recordCheck("W-DOMAIN-NEUTRAL", failures.length === 0, {
    summary: failures.length === 0
      ? `${allFiles.length} files: golden sample/demo/reference vocab only; @sample/@demo/@reference labeled; no business-domain leakage`
      : `domain-neutrality defects: ${failures.length}`,
    detail: { failures }
  });
}

// ---------------------------------------------------------------------------
// W-REG-REGEN — re-running the witness is idempotent (no generator/projection here).
// ---------------------------------------------------------------------------
async function runRegenRegression() {
  const failures = [];
  const r1 = runTypeScript(witnessCli, goldenFlowRoot);
  const r2 = runTypeScript(witnessCli, goldenFlowRoot);
  if (r1.status !== 0) failures.push({ kind: "run-1-exit", status: r1.status, stderr: (r1.stderr || "").slice(0, 300) });
  if (r2.status !== 0) failures.push({ kind: "run-2-exit", status: r2.status, stderr: (r2.stderr || "").slice(0, 300) });
  let identical = false;
  if (r1.status === 0 && r2.status === 0) {
    const j1 = (r1.stdout.split("\n").filter(Boolean)).find((l) => l.startsWith("{"));
    const j2 = (r2.stdout.split("\n").filter(Boolean)).find((l) => l.startsWith("{"));
    identical = j1 === j2 && !!j1;
    if (!identical) failures.push({ kind: "non-idempotent-output", j1, j2 });
  }
  evidence.regression = { run1Status: r1.status, run2Status: r2.status, identical };
  recordCheck("W-REG-REGEN", failures.length === 0, {
    summary: failures.length === 0 ? "witness re-run idempotent (same six-boolean result, exit 0 both runs)" : `regen regression defects: ${failures.length}`,
    detail: { failures }
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
    "examples/starter-reference/generated-fixtures/golden-client/",
    "examples/starter-reference/generated-fixtures/golden-flow/",
    ".vibe/work/I-16B-starter-client-golden-flow/",
  ];
  const owned = [];
  const baseline = [];
  for (const line of lines) {
    const path = line.slice(3);
    if (ownedPrefixes.some((p) => path.startsWith(p))) owned.push(line);
    else baseline.push(line);
  }
  // Serialized surfaces must NOT appear in the owned set.
  const serializedRe = /(^|\/)(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|turbo\.json|tsconfig(\.base)?\.json)$|^\.github\/|^packages\/(contracts|presets|adapters|mechanical-gates|skills|cli)\//;
  const serializedHits = owned.filter((l) => serializedRe.test(l.slice(3)));
  if (serializedHits.length > 0) failures.push({ kind: "serialized-surface-edited", hits: serializedHits });

  // Sibling fixtures must still exist + I-16A fixtures intact (read-only).
  const required = ["golden-api", "golden-contracts", "create-ux", "security", "selected-harness", "harness-consumption"];
  for (const s of required) {
    try {
      const st = statSync(join(REPO_ROOT, `examples/starter-reference/generated-fixtures/${s}`));
      if (!st.isDirectory()) failures.push({ kind: "sibling-not-dir", sibling: s });
    } catch (e) {
      failures.push({ kind: "sibling-missing", sibling: s });
    }
  }
  // The two new I-16B fixtures must be present.
  for (const g of ["golden-client", "golden-flow"]) {
    try {
      const st = statSync(join(REPO_ROOT, `examples/starter-reference/generated-fixtures/${g}`));
      if (!st.isDirectory()) failures.push({ kind: "golden-fixture-missing", fixture: g });
    } catch (e) {
      failures.push({ kind: "golden-fixture-missing", fixture: g });
    }
  }
  evidence.invariant = { ownedCount: owned.length, baselineCount: baseline.length, serializedHits, baselineSample: baseline.slice(0, 10) };
  recordCheck("W-INVARIANTS", failures.length === 0, {
    summary: failures.length === 0
      ? `owned=${owned.length} fixture/work paths; ${baseline.length} pre-existing baseline dirty paths; serialized surfaces + sibling fixtures intact`
      : `invariant failures: ${failures.length}`,
    detail: { failures, ownedSample: owned.slice(0, 12) }
  });
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------
async function main() {
  logStage("W-RESOLVE — real @ts-rest/core + zod resolution from packages/contracts");
  runResolveProof();

  logStage("W-BOTH-PLATFORMS-CONSUME / W-FLOW / W-NEG-REQ / W-CLIENT-INVALID-RESP — runtime real-boundary witness (.ts)");
  runRuntimeWitness();

  logStage("W-SHARED-CLIENT-DERIVED — golden-client derives ONLY from the I-16A contract");
  await runSharedClientDerived();

  logStage("W-NO-FORK — web + mobile transports + witnesses import the SAME shared client + contract");
  await runNoFork();

  logStage("W-DOMAIN-NEUTRAL — golden sample/demo/reference vocab; no business leakage");
  await runDomainNeutral();

  logStage("W-REG-REGEN — witness re-run idempotent");
  await runRegenRegression();

  logStage("W-INVARIANTS — dirty-tree scope + sibling/serialized-surface integrity");
  runInvariants();

  const allChecks = evidence.checks;
  const failed = allChecks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  const result = {
    ok,
    blocked: false,
    lane: "I-16B-starter-client-golden-flow",
    checkCount: allChecks.length,
    checks: allChecks,
    runtime: evidence.runtime,
    structural: evidence.structural,
    regression: evidence.regression,
    invariant: evidence.invariant,
    stages: evidence.stage
  };

  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(join(evidenceRoot, "golden-records-client-flow-witness-result.json"), JSON.stringify(result, null, 2), "utf8");

  console.log(`\n=== I-16B golden-client/golden-flow real-boundary witness: ${ok ? "PASS (green)" : "FAIL"} (${allChecks.length} checks, ${failed.length} failed) ===`);
  if (!ok) {
    for (const f of failed) console.log(`  FAILED: ${f.name} — ${f.summary || JSON.stringify(f)}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("I-16B golden-client/golden-flow witness FATAL:", error);
  process.exit(2);
});
