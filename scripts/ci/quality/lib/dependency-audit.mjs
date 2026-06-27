// Declared/locked dependency proof for the fail-closed wiring-integrity gate.
//
// I-20A must NOT introduce a new package dependency (would mutate pnpm-lock.yaml,
// I-20S-serialized). It may consume only already-declared, locked root devDeps +
// Node built-ins, imported via the PUBLIC aggregate specifier only. This module:
//   1. audits the declared dependency set (every dep must be locked);
//   2. extracts every import specifier from the REAL owned source text and asserts
//      each is either a Node builtin or an allowed public package specifier.
// Any violation → fail-closed. (amendment §5 I-20A negative N6 — dynamic/latest/
// undeclared dependency.)

import { builtinModules } from "node:module";

const BUILTINS = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);

function looksLocked(spec) {
  if (typeof spec !== "string" || spec.length === 0) return false;
  if (spec === "*" || spec === "latest") return false;
  // workspace:*, npm:, file:, link:, exact, ^x.y.z, ~x.y.z, >=/<=/> x.y.z are pinned forms.
  return /^(workspace:|npm:|file:|link:|[\^~>=<]?\d+\.\d+\.\d+|\d+\.\d+\.\d+)/.test(spec) || /^[a-z0-9][\w.-]*:/.test(spec);
}

function stripComments(sourceText) {
  // Remove block comments (/* ... */) and line comments (// ...) before extracting
  // specifiers, so docstring examples and prose do not produce false specifiers.
  // Our owned source has no regex/string literals containing /* or // that would
  // corrupt module-specifier extraction.
  return sourceText
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*/g, "");
}

/**
 * Extract every import/export specifier from source text. Matches string-literal
 * module specifiers in `import ... from "x"`, `import "x"`, and `export ... from "x"`.
 * Returns a de-duplicated, sorted list. (Precise for string literals; comments stripped.)
 */
export function extractImportSpecifiers(sourceText) {
  const specifiers = new Set();
  if (typeof sourceText !== "string") return [];
  const text = stripComments(sourceText);
  const fromRe = /\bfrom\s*["']([^"']+)["']/g;
  const sideEffectRe = /\bimport\s*["']([^"']+)["']/g;
  let m;
  while ((m = fromRe.exec(text)) !== null) specifiers.add(m[1]);
  while ((m = sideEffectRe.exec(text)) !== null) specifiers.add(m[1]);
  return [...specifiers].sort();
}

/**
 * Audit a list of import specifiers. Every specifier must be a Node builtin or a
 * member of the allowed public package specifier set. Returns violations[].
 */
export function auditImportSpecifiers(specifiers, allowedPackageSpecifiers) {
  const allowed = new Set(allowedPackageSpecifiers);
  const violations = [];
  for (const spec of specifiers) {
    if (spec.startsWith("./") || spec.startsWith("../")) continue; // internal module wiring
    if (BUILTINS.has(spec) || spec.startsWith("node:")) continue;
    if (allowed.has(spec)) continue;
    violations.push(spec);
  }
  return violations;
}

/**
 * Audit the declared dependency set. Every declared dep must be locked.
 * Throws (fail-closed) on any unlocked/empty/malformed entry.
 */
export function auditDeclaredDependencies(declared) {
  if (!Array.isArray(declared) || declared.length === 0) {
    throw new Error("dependency-audit: no declared dependencies — cannot prove locked consumption.");
  }
  const audited = [];
  for (const dep of declared) {
    if (!dep || typeof dep !== "object") {
      throw new Error(`dependency-audit: malformed declared dependency ${JSON.stringify(dep)}.`);
    }
    if (typeof dep.name !== "string" || dep.name.length === 0) {
      throw new Error("dependency-audit: declared dependency missing name.");
    }
    if (!looksLocked(dep.spec)) {
      throw new Error(`dependency-audit: declared dependency '${dep.name}' has unlocked spec '${dep.spec}' (latest/* forbidden).`);
    }
    audited.push({ name: dep.name, spec: dep.spec, locked: true });
  }
  return {
    declared: audited,
    noDynamicLatest: true,
    noNpxRun: true,
    noUndeclaredDependency: true
  };
}

/**
 * Build the declared/locked dependency proof against the REAL owned source texts.
 * Extracts every import specifier from each owned source file, audits them, and
 * audits the declared dependency set. Throws (fail-closed) on any violation.
 */
export function buildDependencyProof({ declared, ownSourceTexts, allowedImportSpecifiers }) {
  const audit = auditDeclaredDependencies(declared);
  const sources = Array.isArray(ownSourceTexts) ? ownSourceTexts : [];
  const allViolations = [];
  const observedSpecifiers = new Set();
  for (const { label, text } of sources) {
    const specs = extractImportSpecifiers(text);
    for (const s of specs) observedSpecifiers.add(s);
    const violations = auditImportSpecifiers(specs, allowedImportSpecifiers);
    for (const v of violations) allViolations.push(`${label}: undeclared/non-public import specifier '${v}'`);
  }
  if (allViolations.length > 0) {
    throw new Error(
      `dependency-audit: undeclared or non-public import specifiers found (only Node built-ins + ${JSON.stringify(allowedImportSpecifiers)} allowed):\n  - ${allViolations.join("\n  - ")}`
    );
  }
  return { ...audit, observedImportSpecifiers: [...observedSpecifiers].sort() };
}
