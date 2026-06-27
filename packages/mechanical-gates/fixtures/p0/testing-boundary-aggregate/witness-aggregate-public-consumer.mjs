// Real public-consumer witness for I-10C-AGG (Model A).
//
// This consumer lives INSIDE packages/mechanical-gates/** so that the PUBLIC
// package name "@vibe-engineer/mechanical-gates/aggregate" resolves via package
// self-reference through the `exports` map (confirmed on-disk: resolves from
// inside the package; ERR_MODULE_NOT_FOUND from repo-root .vibe/work/). It does
// NOT import via a relative path into src/ — that would be shape-green, not
// truth-green (it would not exercise the public contract I-20A consumes).
//
// Coverage:
//   W-1  public-consumer positive (real boundary) — typed p0.testing-boundary subresult, ok:true.
//   W-2  default-run enforcement (no families opt-in) — p0.testing-boundary present in subresults.
//   W-3  omitted-family fail-closed — requesting the five non-testing families emits aggregate.omitted-family for p0.testing-boundary.
//   W-4  validator-failure routing (real) — a real testing-boundary violation surfaces as a blocking finding through the public aggregate and sets ok:false.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runP0Aggregate } from "@vibe-engineer/mechanical-gates/aggregate";

const fixtureRoot = dirname(fileURLToPath(import.meta.url));
const testingBoundaryFixtureRoot = join(fixtureRoot, "..", "testing-boundary");
const aggregateFixtureRoot = join(fixtureRoot, "..", "allowlist-domain-aggregate");

function workspace(name) {
  return join(testingBoundaryFixtureRoot, name);
}

// The full 6-family green aggregate root (valid-aggregate) hosts valid policies
// for every implemented family including the testing-boundary corpus copied in
// by this lane. It is the only fixture where the DEFAULT (no families) run is
// green across all six families, so W-2/W-3 use it.
function aggregateWorkspace() {
  return join(aggregateFixtureRoot, "valid-aggregate");
}

function assert(condition, message, evidence = {}) {
  if (!condition) {
    const error = new Error(message);
    error.evidence = evidence;
    throw error;
  }
}

function assertResultTyped(result, family) {
  assert(result && typeof result === "object", `${family} result must be object`, { result });
  assert(result.family === family, `${family} family mismatch`, { expected: family, actual: result.family });
  assert(typeof result.ok === "boolean", `${family} ok must be boolean`, { result });
  assert(Array.isArray(result.findings), `${family} findings must be array`, { result });
  assert(result.evidence && typeof result.evidence === "object", `${family} evidence must be object`, { result });
}

function findSubresult(aggregate, family) {
  return aggregate.evidence.subresults.find((sub) => sub.family === family);
}

// W-1 + W-2: real public consumer against the green valid-test-only workspace.
async function witnessPositive() {
  const validRoot = workspace("valid-test-only");

  // W-1: explicit families opt-in yields a clean, typed p0.testing-boundary subresult.
  const explicit = await runP0Aggregate(validRoot, { families: ["p0.testing-boundary"] });
  assertResultTyped(explicit, "p0.aggregate");
  const tbExplicit = findSubresult(explicit, "p0.testing-boundary");
  assert(tbExplicit, "W-1: aggregate must include p0.testing-boundary subresult", { families: explicit.evidence.subresults.map((s) => s.family) });
  assertResultTyped(tbExplicit, "p0.testing-boundary");
  assert(tbExplicit.ok === true, "W-1: p0.testing-boundary subresult must be ok", { tbExplicit });
  assert(Array.isArray(tbExplicit.findings) && tbExplicit.findings.length === 0, "W-1: p0.testing-boundary subresult must have zero findings", { tbExplicit });
  assert(typeof tbExplicit.evidence.parser === "string" && tbExplicit.evidence.proofMode === "typescript-ast", "W-1: testing-boundary evidence must carry real typed-carrier fields", { tbExplicit });

  // W-2: DEFAULT run (no families option) now exercises testing-boundary — the
  // substantive handoff closure (testing-boundary on the single blocking path).
  // Uses the full 6-family green aggregate root so the default run is ok across
  // every implemented family (valid-test-only is testing-boundary-only).
  const defaulted = await runP0Aggregate(aggregateWorkspace());
  assertResultTyped(defaulted, "p0.aggregate");
  const tbDefault = findSubresult(defaulted, "p0.testing-boundary");
  assert(tbDefault, "W-2: default aggregate run must include p0.testing-boundary subresult", { families: defaulted.evidence.subresults.map((s) => s.family) });
  assertResultTyped(tbDefault, "p0.testing-boundary");
  assert(tbDefault.ok === true, "W-2: default-run p0.testing-boundary subresult must be ok", { tbDefault });
  assert(defaulted.evidence.implementedFamilies.includes("p0.testing-boundary"), "W-2: implementedFamilies must list p0.testing-boundary", { implementedFamilies: defaulted.evidence.implementedFamilies });
  assert(defaulted.ok === true, "W-2: default aggregate over a valid workspace must be ok", { summary: defaulted.evidence.summary });

  return { tbExplicit, tbDefault, defaultSummary: defaulted.evidence.summary };
}

// W-3: omitted-family fail-closed. Requesting the five NON-testing families must
// emit aggregate.omitted-family naming p0.testing-boundary. Uses the full
// 6-family green aggregate root so the five requested families pass and ONLY the
// omission is the failure.
async function witnessOmittedFamily() {
  const validRoot = aggregateWorkspace();
  const fiveOther = ["p0.governed-surface", "p0.config-guards", "p0.boundaries", "p0.allowlist", "p0.domain-purity"];
  const result = await runP0Aggregate(validRoot, { families: fiveOther });
  assertResultTyped(result, "p0.aggregate");
  assert(!result.ok, "W-3: omitted-family run must fail closed (ok:false)", { ok: result.ok, findings: result.findings });
  const omittedFindings = result.findings.filter((f) => f.ruleId === "aggregate.omitted-family");
  assert(omittedFindings.length >= 1, "W-3: must emit at least one aggregate.omitted-family finding", { findings: result.findings });
  const namesOmitted = omittedFindings.find((f) => f.evidence && f.evidence.omittedFamily === "p0.testing-boundary");
  assert(namesOmitted, "W-3: an aggregate.omitted-family finding must name p0.testing-boundary", { omittedEvidence: omittedFindings.map((f) => f.evidence) });
  assert(!findSubresult(result, "p0.testing-boundary"), "W-3: p0.testing-boundary must NOT be present as a subresult when omitted", { families: result.evidence.subresults.map((s) => s.family) });
  return { omittedFindings: omittedFindings.length };
}

// W-4: validator-failure routing. A REAL testing-boundary violation (production
// dependency) must surface as a blocking finding through the public aggregate
// and set ok:false. Reuses the green I-10C adversarial production-dependency
// fixture corpus — not mocked.
async function witnessValidatorFailure() {
  const violationRoot = workspace("production-dependency");
  const result = await runP0Aggregate(violationRoot, { families: ["p0.testing-boundary"] });
  assertResultTyped(result, "p0.aggregate");
  assert(!result.ok, "W-4: aggregate over a testing-boundary violation must be ok:false", { ok: result.ok, summary: result.evidence.summary });
  const tbSub = findSubresult(result, "p0.testing-boundary");
  assert(tbSub, "W-4: aggregate must include p0.testing-boundary subresult", { families: result.evidence.subresults.map((s) => s.family) });
  assert(!tbSub.ok, "W-4: p0.testing-boundary subresult must be ok:false", { tbSub });
  const tbFindings = result.findings.filter((f) => f.family === "p0.testing-boundary");
  assert(tbFindings.length >= 1, "W-4: aggregate must carry testing-boundary findings", { families: result.findings.map((f) => f.family) });
  const productionDependencyFinding = tbFindings.find((f) => f.ruleId === "testing-boundary.production-dependency");
  assert(productionDependencyFinding, "W-4: must route testing-boundary.production-dependency finding through the aggregate", { ruleIds: tbFindings.map((f) => f.ruleId) });
  assert(productionDependencyFinding.blocking === true, "W-4: production-dependency finding must be blocking", { productionDependencyFinding });
  return { routedRuleId: productionDependencyFinding.ruleId, blocking: productionDependencyFinding.blocking };
}

const positive = await witnessPositive();
const omitted = await witnessOmittedFamily();
const failure = await witnessValidatorFailure();

console.log(JSON.stringify({
  ok: true,
  mode: "i-10c-agg-public-consumer",
  importPath: "@vibe-engineer/mechanical-gates/aggregate",
  witnesses: {
    "W-1-public-consumer-positive": { ok: true, subresultFamily: positive.tbExplicit.family, subresultOk: positive.tbExplicit.ok },
    "W-2-default-run-enforcement": { ok: true, implementedFamiliesIncludesTestingBoundary: true, summary: positive.defaultSummary },
    "W-3-omitted-family-fail-closed": { ok: true, omittedFindings: omitted.omittedFindings },
    "W-4-validator-failure-routing": { ok: true, routedRuleId: failure.routedRuleId, blocking: failure.blocking }
  }
}));
