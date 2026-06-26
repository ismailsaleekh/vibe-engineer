import { runP0Aggregate, type P0AggregateOptions, type P0AggregateResult } from "../../../src/aggregate/index.js";
import { validateEscapeAllowlist, type EscapeAllowlistOptions, type EscapeAllowlistPolicy } from "../../../src/p0/allowlist/index.js";
import { validateDomainPurity, type DomainPurityOptions, type DomainPurityPolicy } from "../../../src/p0/domain-purity/index.js";

const aggregateOptions: P0AggregateOptions = { families: ["p0.governed-surface", "p0.config-guards", "p0.boundaries", "p0.allowlist", "p0.domain-purity"] };
const allowlistOptions: EscapeAllowlistOptions = { policyPath: "mechanical-escape-allowlist.json" };
const domainOptions: DomainPurityOptions = { policyPath: "mechanical-domain-purity.json" };
const allowlistPolicy: EscapeAllowlistPolicy = {
  version: 1,
  proofMode: "typescript-ast-and-comment-scanner",
  scan: { include: ["packages"], generatedVendor: ["generated", "vendor", "node_modules"] },
  hardBannedEscapes: ["as-any"],
  entries: []
};
const explicitForbiddenTermsDomainPolicy: DomainPurityPolicy = {
  version: 1,
  proofMode: "typescript-ast-string-comment-path-carriers",
  scan: { include: ["packages"] },
  forbiddenTerms: ["ecommerce", "inventory", "Billz", "Telegram"],
  surfaces: [{ kind: "core", path: "packages", match: "prefix" }]
};
const omittedForbiddenTermsDomainPolicy: DomainPurityPolicy = {
  version: 1,
  proofMode: "typescript-ast-string-comment-path-carriers",
  scan: { include: ["packages"], maxFileBytes: 200000 },
  surfaces: [{ kind: "core", path: "packages", match: "prefix" }]
};

async function consume(projectRoot: string): Promise<P0AggregateResult> {
  const allowlist = await validateEscapeAllowlist(projectRoot, allowlistOptions);
  const domain = await validateDomainPurity(projectRoot, domainOptions);
  const aggregate = await runP0Aggregate(projectRoot, aggregateOptions);
  if (!allowlist.evidence || !domain.evidence || !aggregate.evidence.subresults) throw new Error("typed evidence missing");
  if (allowlistPolicy.proofMode !== "typescript-ast-and-comment-scanner" || explicitForbiddenTermsDomainPolicy.proofMode !== "typescript-ast-string-comment-path-carriers" || omittedForbiddenTermsDomainPolicy.proofMode !== "typescript-ast-string-comment-path-carriers") throw new Error("typed policy proofMode missing");
  return aggregate;
}

void consume("/tmp/vibe-engineer-mechanical-gates-fixture");
