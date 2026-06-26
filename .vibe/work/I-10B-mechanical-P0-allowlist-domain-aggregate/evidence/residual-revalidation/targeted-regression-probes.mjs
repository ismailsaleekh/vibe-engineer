import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
const fixtureRoot = join(repoRoot, "packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate");

const { validateDomainPurity } = await import(pathToFileURL(join(repoRoot, "packages/mechanical-gates/src/p0/domain-purity/index.js")).href);
const { validateEscapeAllowlist } = await import(pathToFileURL(join(repoRoot, "packages/mechanical-gates/src/p0/allowlist/index.js")).href);
const { runP0Aggregate } = await import(pathToFileURL(join(repoRoot, "packages/mechanical-gates/src/aggregate/index.js")).href);

const allFamilies = ["p0.governed-surface", "p0.config-guards", "p0.boundaries", "p0.allowlist", "p0.domain-purity"];
const lockedTerms = ["ecommerce", "inventory", "Billz", "Telegram"];
const records = [];

function ruleIds(result) {
  return result.findings.map((finding) => finding.ruleId);
}

function hasAll(actual, expected) {
  return expected.every((ruleId) => actual.includes(ruleId));
}

function assert(condition, message, evidence = {}) {
  if (!condition) {
    console.error(JSON.stringify({ ok: false, message, evidence, records }, null, 2));
    process.exit(1);
  }
}

async function domainFixture(name, expectedRules, expectedOk = false) {
  const result = await validateDomainPurity(join(fixtureRoot, name));
  const ids = ruleIds(result);
  records.push({ kind: "domain", name, ok: result.ok, ruleIds: ids, forbiddenTerms: result.evidence?.forbiddenTerms });
  assert(result.ok === expectedOk, `${name} ok mismatch`, { expectedOk, resultOk: result.ok, ids });
  assert(hasAll(ids, expectedRules), `${name} missing expected domain rules`, { expectedRules, ids });
  return result;
}

async function allowlistFixture(name, expectedRules, expectedOk = false) {
  const result = await validateEscapeAllowlist(join(fixtureRoot, name));
  const ids = ruleIds(result);
  records.push({ kind: "allowlist", name, ok: result.ok, ruleIds: ids, hardBannedEscapes: result.evidence?.hardBannedEscapes });
  assert(result.ok === expectedOk, `${name} ok mismatch`, { expectedOk, resultOk: result.ok, ids });
  assert(hasAll(ids, expectedRules), `${name} missing expected allowlist rules`, { expectedRules, ids });
  return result;
}

await domainFixture("domain-malformed-forbidden-number", ["domain-purity.policy-schema"]);
await domainFixture("domain-empty-forbidden-terms", ["domain-purity.policy-schema"]);
await domainFixture("domain-partial-malformed-forbidden-terms", ["domain-purity.policy-schema"]);
const lockedRemoval = await domainFixture("domain-valid-policy-cannot-remove-locked-terms", ["domain-purity.core-domain-leak"]);
assert(lockedTerms.every((term) => lockedRemoval.evidence.forbiddenTerms.includes(term)), "locked defaults missing from custom-only policy evidence", lockedRemoval.evidence);
await domainFixture("sample-leakage-core", ["domain-purity.core-domain-leak"]);
const validDomain = await domainFixture("valid-aggregate", [], true);
assert(lockedTerms.every((term) => validDomain.evidence.forbiddenTerms.includes(term)), "locked defaults missing from valid domain evidence", validDomain.evidence);

await allowlistFixture("as-unknown-unrelated-validate", ["allowlist.unallowlisted-escape"]);
await allowlistFixture("hard-ban-weakening-as-any", ["allowlist.hard-banned"]);
await allowlistFixture("malformed-hard-banned-policy", ["allowlist.policy-schema"]);
await allowlistFixture("broad-model-types", ["allowlist.unallowlisted-escape"]);
await allowlistFixture("ts-comment-escapes", ["allowlist.unallowlisted-escape"]);

const aggregateValid = await runP0Aggregate(join(fixtureRoot, "valid-aggregate"));
const aggregateFamilies = aggregateValid.evidence.subresults.map((result) => result.family);
records.push({ kind: "aggregate", name: "valid-aggregate", ok: aggregateValid.ok, families: aggregateFamilies, summary: aggregateValid.evidence.summary });
assert(aggregateValid.ok === true, "valid aggregate must pass", { ruleIds: ruleIds(aggregateValid) });
assert(allFamilies.every((family) => aggregateFamilies.includes(family)), "valid aggregate missing P0 family", { aggregateFamilies });

const aggregateOmitted = await runP0Aggregate(join(fixtureRoot, "valid-aggregate"), { families: allFamilies.filter((family) => family !== "p0.domain-purity") });
records.push({ kind: "aggregate", name: "omitted-domain-purity", ok: aggregateOmitted.ok, ruleIds: ruleIds(aggregateOmitted) });
assert(ruleIds(aggregateOmitted).includes("aggregate.omitted-family"), "aggregate omission did not fail closed", { ruleIds: ruleIds(aggregateOmitted) });

const aggregateException = await runP0Aggregate(join(fixtureRoot, "valid-aggregate"), { governedSurface: { configPath: "../outside-root.json" } });
records.push({ kind: "aggregate", name: "validator-exception", ok: aggregateException.ok, ruleIds: ruleIds(aggregateException) });
assert(ruleIds(aggregateException).includes("aggregate.validator-exception"), "aggregate validator exception did not become typed finding", { ruleIds: ruleIds(aggregateException) });

console.log(JSON.stringify({ ok: true, records }, null, 2));
