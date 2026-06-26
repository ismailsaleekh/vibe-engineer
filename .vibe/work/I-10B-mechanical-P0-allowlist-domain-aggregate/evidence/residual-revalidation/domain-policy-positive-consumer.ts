import type { DomainPurityPolicy } from "../../../../../packages/mechanical-gates/src/p0/domain-purity/index.js";

const omittedForbiddenTermsPolicy: DomainPurityPolicy = {
  version: 1,
  proofMode: "typescript-ast-string-comment-path-carriers",
  scan: { include: ["src"], maxFileBytes: 200000 },
  surfaces: [{ kind: "core", path: "src", match: "prefix" }]
};

const explicitForbiddenTermsPolicy: DomainPurityPolicy = {
  version: 1,
  proofMode: "typescript-ast-string-comment-path-carriers",
  scan: { include: ["src"] },
  forbiddenTerms: ["ecommerce", "inventory", "Billz", "Telegram"],
  surfaces: [{ kind: "core", path: "src", match: "prefix" }]
};

const policies: DomainPurityPolicy[] = [omittedForbiddenTermsPolicy, explicitForbiddenTermsPolicy];
const maybeTerms: string[] | undefined = omittedForbiddenTermsPolicy.forbiddenTerms;
const explicitTerms: string[] | undefined = explicitForbiddenTermsPolicy.forbiddenTerms;

void policies;
void maybeTerms;
void explicitTerms;
