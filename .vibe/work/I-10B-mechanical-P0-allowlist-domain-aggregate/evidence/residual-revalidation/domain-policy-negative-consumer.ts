import type { DomainPurityPolicy } from "../../../../../packages/mechanical-gates/src/p0/domain-purity/index.js";

const malformedForbiddenTermsPolicy: DomainPurityPolicy = {
  version: 1,
  proofMode: "typescript-ast-string-comment-path-carriers",
  scan: { include: ["src"] },
  forbiddenTerms: [42],
  surfaces: [{ kind: "core", path: "src", match: "prefix" }]
};

void malformedForbiddenTermsPolicy;
