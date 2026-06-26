import type { DomainPurityPolicy } from "../../../../../packages/mechanical-gates/src/p0/domain-purity/index.js";

const policyWithMalformedForbiddenTerms: DomainPurityPolicy = {
  version: 1,
  proofMode: "typescript-ast-string-comment-path-carriers",
  scan: { include: ["src"], maxFileBytes: 200000 },
  forbiddenTerms: [42],
  surfaces: [{ kind: "core", path: "src", match: "prefix" }]
};

void policyWithMalformedForbiddenTerms;
