import type { DomainPurityPolicy } from "../../../../../packages/mechanical-gates/src/p0/domain-purity/index.js";

const policyWithoutForbiddenTerms: DomainPurityPolicy = {
  version: 1,
  proofMode: "typescript-ast-string-comment-path-carriers",
  scan: { include: ["src"], maxFileBytes: 200000 },
  surfaces: [{ kind: "core", path: "src", match: "prefix" }]
};

void policyWithoutForbiddenTerms;
