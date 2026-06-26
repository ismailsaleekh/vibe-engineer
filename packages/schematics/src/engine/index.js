import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { loadSchematicManifest } from "../manifest/loader.js";
import { validateAndNormalizeInput } from "../template/input.js";
import { renderTemplate } from "../template/renderer.js";
import { assertSafeTargetPath } from "../template/path-safety.js";
import { ensureTrailingNewline, markerMatches, parseGeneratedBlock, parseGeneratedSections, writeGeneratedBlock } from "./markers.js";

const DOMAIN_FORBIDDEN_TERMS = Object.freeze(["ecommerce", "inventory", "fashion", "Billz", "Telegram", "Instagram", "ProductCatalog", "ShoppingCart", "CustomerOrder", "CheckoutFlow", "WarehouseStock", "FashionDrop", "BillzInvoice", "TelegramBotBusinessRule", "InstagramEngagementModel"]);

function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function sha256Text(text) { return `sha256:${crypto.createHash("sha256").update(text).digest("hex")}`; }
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function fail(code, message, details = {}) { const error = new Error(message); error.code = code; error.details = details; throw error; }
function toDiagnostic(error) { return { code: error.code ?? "blocked", message: error.message, details: error.details ?? {} }; }
async function readIfExists(target) { try { return await fs.readFile(target, "utf8"); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
async function statIfExists(target) { try { return await fs.stat(target); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
async function atomicWrite(target, content) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temp = path.join(path.dirname(target), `.${path.basename(target)}.${process.pid}.tmp`);
  await fs.writeFile(temp, content, { encoding: "utf8", flag: "wx" });
  await fs.rename(temp, target);
}

function staticRelativePath(root, relativePath, code, label) {
  if (typeof relativePath !== "string" || relativePath.length === 0) fail(code, `${label} must be a non-empty static relative path.`, { path: relativePath });
  if (path.isAbsolute(relativePath)) fail(code, `${label} must not be absolute.`, { path: relativePath });
  const normalizedForSegments = relativePath.replaceAll("\\", "/");
  if (normalizedForSegments.split("/").includes("..")) fail(code, `${label} must not contain path traversal segments.`, { path: relativePath });
  const normalized = path.normalize(relativePath);
  if (normalized === "." || normalized.startsWith(`..${path.sep}`) || normalized === ".." || path.isAbsolute(normalized)) fail(code, `${label} escapes its root.`, { path: relativePath, normalized });
  const resolved = path.resolve(root, normalized);
  const rel = path.relative(root, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) fail(code, `${label} escapes its root.`, { path: relativePath, normalized });
  return { normalized: normalized.replaceAll("\\", "/"), resolved };
}

async function loadTemplates(definition) {
  const templateRootBase = path.resolve(definition.manifestDir);
  const templateRootInfo = staticRelativePath(templateRootBase, definition.dl08.templateRoot, "unsafe_template", "Template root");
  const templateRoot = templateRootInfo.resolved;
  const partials = {};
  for (const [name, relativePath] of Object.entries(definition.dl08.partials ?? {})) {
    if (!/^[A-Za-z0-9_.-]+$/.test(name)) fail("unsafe_template", "Partial names must be static identifiers.", { partial: name });
    const partial = staticRelativePath(templateRoot, relativePath, "unsafe_template", `Partial ${name}`);
    partials[name] = await fs.readFile(partial.resolved, "utf8");
  }
  return { templateRoot, partials };
}

function renderPathTemplate(template, variables) {
  return renderTemplate(template, variables, {});
}

function assertDomainNeutral(content, manifest) {
  if (manifest.domainNeutrality?.coreSurface !== true) return;
  const findings = DOMAIN_FORBIDDEN_TERMS.filter((term) => content.includes(term));
  if (findings.length > 0) fail("domain_neutrality", "Core fixture output contains forbidden business-domain term.", { findings });
}

async function operationContent(operation, definition, normalized, loadedTemplates) {
  if (!["create_file", "replace_generated_file", "replace_marked_section"].includes(operation.kind)) return null;
  const templatePath = staticRelativePath(loadedTemplates.templateRoot, operation.template, "unsafe_template", `Template for operation ${operation.id}`);
  const source = await fs.readFile(templatePath.resolved, "utf8");
  const renderedRaw = renderTemplate(source, normalized, loadedTemplates.partials);
  assertDomainNeutral(renderedRaw, definition.manifest);
  const renderedBody = ensureTrailingNewline(renderedRaw);
  const metadata = {
    schematicId: definition.id,
    schematicVersion: definition.version,
    blockId: operation.blockId ?? operation.id,
    inputFingerprint: sha256Text(stableJson(normalized)),
    templateFingerprint: sha256Text(source)
  };
  if (operation.generatedMarker === false) {
    return { rendered: renderedRaw, body: renderedBody, finalContent: renderedRaw, generatedBlock: renderedRaw, marker: null, templateFingerprint: metadata.templateFingerprint, renderedContentHash: sha256Text(renderedRaw) };
  }
  const generatedBlock = writeGeneratedBlock(renderedBody, metadata);
  return { rendered: renderedRaw, body: renderedBody, finalContent: generatedBlock, generatedBlock, marker: metadata, templateFingerprint: metadata.templateFingerprint, renderedContentHash: sha256Text(renderedBody) };
}

function precondition(type, details) {
  return Object.freeze({ type, ...details });
}

function opBase(operation, relativePath, content, beforeText, action, conflict = null, preconditions = [], writeContent = null) {
  const afterContent = writeContent ?? content?.finalContent ?? null;
  return {
    op_id: operation.id,
    kind: operation.kind,
    path: relativePath,
    artifact_type: operation.artifactType ?? "code",
    action,
    content_hash_before: beforeText === null ? null : sha256Text(beforeText),
    content_hash_after: afterContent === null ? null : sha256Text(afterContent),
    marker: content?.marker ?? null,
    preconditions,
    conflict
  };
}

function conflictOp(operation, relativePath, content, before, reason, extraPreconditions = []) {
  const conflict = { path: relativePath, reason, severity: "hard_fail" };
  const preconditions = [
    ...(before === null ? [precondition("target_absent", { path: relativePath, expected: true, actual: true })] : [precondition("current_content_hash", { path: relativePath, expected: sha256Text(before), actual: sha256Text(before) })]),
    ...extraPreconditions
  ];
  return { operation: opBase(operation, relativePath, content, before, "conflict", conflict, preconditions), conflict };
}

function markerPreconditions(relativePath, marker, body) {
  return [
    precondition("generated_marker", { path: relativePath, expected: marker }),
    precondition("generated_body_hash", { path: relativePath, expected: sha256Text(body) })
  ];
}

async function classifyOperation(operation, definition, normalized, targetRoot, loadedTemplates) {
  if (operation.kind === "report_stale_generated") {
    const reportPreconditions = [precondition("report_only_no_write", { path: operation.pathTemplate ?? "", expected: true })];
    return { operation: { op_id: operation.id, kind: operation.kind, path: operation.pathTemplate ?? "", artifact_type: operation.artifactType ?? "report", action: "report_only", content_hash_before: null, content_hash_after: null, marker: null, preconditions: reportPreconditions, conflict: null }, conflict: null };
  }
  const relativePath = renderPathTemplate(operation.pathTemplate, normalized);
  const safe = assertSafeTargetPath({ relativePath, targetRoot, touchedPathPatterns: definition.dl08.touchedPathPatterns, forbiddenPathPatterns: definition.dl08.forbiddenPathPatterns });
  const stat = await statIfExists(safe.absolutePath);
  const content = await operationContent(operation, definition, normalized, loadedTemplates);
  if (operation.kind === "create_directory") {
    if (!stat) return { operation: opBase(operation, safe.relativePath, null, null, "create", null, [precondition("target_absent", { path: safe.relativePath, expected: true, actual: true })]), conflict: null, absolutePath: safe.absolutePath };
    if (stat.isDirectory()) return { operation: opBase(operation, safe.relativePath, null, null, "noop", null, [precondition("directory_exists", { path: safe.relativePath, expected: true, actual: true })]), conflict: null, absolutePath: safe.absolutePath };
    const conflict = { path: safe.relativePath, reason: "directory_path_is_file", severity: "hard_fail" };
    return { operation: opBase(operation, safe.relativePath, null, null, "conflict", conflict, [precondition("directory_exists", { path: safe.relativePath, expected: true, actual: false })]), conflict, absolutePath: safe.absolutePath };
  }
  const before = await readIfExists(safe.absolutePath);
  if (operation.kind === "create_file") {
    if (before === null) return { operation: opBase(operation, safe.relativePath, content, null, "create", null, [precondition("target_absent", { path: safe.relativePath, expected: true, actual: true })]), conflict: null, absolutePath: safe.absolutePath, content, writeContent: content.finalContent };
    if (before === content.finalContent) return { operation: opBase(operation, safe.relativePath, content, before, "noop", null, [precondition("current_content_hash", { path: safe.relativePath, expected: sha256Text(before), actual: sha256Text(before) })]), conflict: null, absolutePath: safe.absolutePath, content, writeContent: content.finalContent };
    return { ...conflictOp(operation, safe.relativePath, content, before, "existing_different_unmarked"), absolutePath: safe.absolutePath, content, writeContent: content.finalContent };
  }
  if (operation.kind === "replace_generated_file") {
    if (before === null) return { operation: opBase(operation, safe.relativePath, content, null, "create", null, [precondition("target_absent", { path: safe.relativePath, expected: true, actual: true })]), conflict: null, absolutePath: safe.absolutePath, content, writeContent: content.finalContent };
    if (before === content.finalContent) return { operation: opBase(operation, safe.relativePath, content, before, "noop", null, [precondition("current_content_hash", { path: safe.relativePath, expected: sha256Text(before), actual: sha256Text(before) }), ...markerPreconditions(safe.relativePath, content.marker, content.body)]), conflict: null, absolutePath: safe.absolutePath, content, writeContent: content.finalContent };
    const parsed = parseGeneratedBlock(before);
    if (!parsed.ok || !content.marker || !markerMatches(parsed.marker, content.marker)) {
      return { ...conflictOp(operation, safe.relativePath, content, before, "generated_marker_mismatch", content.marker ? [precondition("generated_marker", { path: safe.relativePath, expected: content.marker, actual: parsed.ok ? parsed.marker : null })] : []), absolutePath: safe.absolutePath, content, writeContent: content.finalContent };
    }
    if (parsed.body !== content.body) {
      return { ...conflictOp(operation, safe.relativePath, content, before, "generated_body_mismatch", [precondition("generated_body_hash", { path: safe.relativePath, expected: sha256Text(content.body), actual: sha256Text(parsed.body) })]), absolutePath: safe.absolutePath, content, writeContent: content.finalContent };
    }
    const preconditions = [precondition("current_content_hash", { path: safe.relativePath, expected: sha256Text(before), actual: sha256Text(before) }), ...markerPreconditions(safe.relativePath, content.marker, content.body)];
    return { operation: opBase(operation, safe.relativePath, content, before, "replace", null, preconditions), conflict: null, absolutePath: safe.absolutePath, content, writeContent: content.finalContent };
  }
  if (operation.kind === "replace_marked_section") {
    if (before === null) return { operation: opBase(operation, safe.relativePath, content, null, "create", null, [precondition("target_absent", { path: safe.relativePath, expected: true, actual: true })]), conflict: null, absolutePath: safe.absolutePath, content, writeContent: content.finalContent };
    const sections = parseGeneratedSections(before);
    const candidates = sections.filter((section) => section.marker.blockId === content.marker?.blockId);
    if (candidates.length === 0) {
      const reason = sections.length === 0 ? "generated_marker_missing" : "generated_marker_mismatch";
      return { ...conflictOp(operation, safe.relativePath, content, before, reason, [precondition("generated_marker", { path: safe.relativePath, expected: content.marker, actual: sections.map((section) => section.marker) })]), absolutePath: safe.absolutePath, content, writeContent: content.finalContent };
    }
    if (candidates.length > 1) {
      return { ...conflictOp(operation, safe.relativePath, content, before, "multiple_generated_markers", [precondition("generated_marker_count", { path: safe.relativePath, expected: 1, actual: candidates.length })]), absolutePath: safe.absolutePath, content, writeContent: content.finalContent };
    }
    const section = candidates[0];
    if (!markerMatches(section.marker, content.marker)) {
      return { ...conflictOp(operation, safe.relativePath, content, before, "generated_marker_mismatch", [precondition("generated_marker", { path: safe.relativePath, expected: content.marker, actual: section.marker })]), absolutePath: safe.absolutePath, content, writeContent: content.finalContent };
    }
    if (section.body !== content.body) {
      return { ...conflictOp(operation, safe.relativePath, content, before, "generated_body_mismatch", [precondition("generated_body_hash", { path: safe.relativePath, expected: sha256Text(content.body), actual: sha256Text(section.body) })]), absolutePath: safe.absolutePath, content, writeContent: content.finalContent };
    }
    const replacement = `${before.slice(0, section.start)}${content.finalContent}${before.slice(section.end)}`;
    const preconditions = [precondition("current_content_hash", { path: safe.relativePath, expected: sha256Text(before), actual: sha256Text(before) }), ...markerPreconditions(safe.relativePath, content.marker, content.body), precondition("generated_marker_count", { path: safe.relativePath, expected: 1, actual: candidates.length })];
    const action = replacement === before ? "noop" : "replace";
    return { operation: opBase(operation, safe.relativePath, content, before, action, null, preconditions, replacement), conflict: null, absolutePath: safe.absolutePath, content, writeContent: replacement };
  }
  fail("blocked", "Unsupported operation kind reached planner.", { kind: operation.kind });
}

function computePlanFingerprint({ definition, normalized, operations }) {
  return sha256Text(stableJson({
    manifest: { id: definition.id, version: definition.version, path: definition.manifestPath },
    normalized_input: normalized,
    operations: operations.map((operation) => ({
      op_id: operation.op_id,
      kind: operation.kind,
      path: operation.path,
      action: operation.action,
      content_hash_before: operation.content_hash_before,
      content_hash_after: operation.content_hash_after,
      marker: operation.marker,
      preconditions: operation.preconditions
    }))
  }));
}

function resultEnvelope({ status, definition, mode, normalized, operations, conflicts, diagnostics = [] }) {
  const planFingerprint = computePlanFingerprint({ definition, normalized, operations });
  return {
    status,
    schematic: { id: definition.id, version: definition.version, manifest_path: definition.manifestPath },
    mode,
    plan_fingerprint: planFingerprint,
    normalized_input: normalized,
    operations,
    conflicts,
    diagnostics,
    verification_preview: { expected_tests: definition.manifest.requiredTests ?? [], expected_validators: [] },
    context_docs_preview: { expected_context_stubs: definition.manifest.contextUpdates ?? [], expected_docs_stubs: definition.dl08.operations.filter((op) => ["context", "docs"].includes(op.artifactType)).map((op) => op.pathTemplate) },
    domain_neutrality: { classification: definition.domainNeutrality?.coreSurface ? "core" : "project_extension", findings: [] }
  };
}

function extractExpectedPlanFingerprint(expectedPlan, planFingerprint) {
  if (typeof planFingerprint === "string" && planFingerprint.length > 0) return planFingerprint;
  if (!isObject(expectedPlan)) return null;
  if (typeof expectedPlan.plan_fingerprint === "string") return expectedPlan.plan_fingerprint;
  if (typeof expectedPlan.planFingerprint === "string") return expectedPlan.planFingerprint;
  if (typeof expectedPlan.payload?.data?.plan_fingerprint === "string") return expectedPlan.payload.data.plan_fingerprint;
  return null;
}

function stalePlanResult(definition, mode, normalized, planned, expectedFingerprint) {
  const conflict = { path: "", reason: "plan_fingerprint_mismatch", severity: "hard_fail" };
  return resultEnvelope({
    status: "blocked",
    definition,
    mode,
    normalized,
    operations: planned.publicResult.operations,
    conflicts: [conflict],
    diagnostics: [{ code: "plan_fingerprint_mismatch", message: "Supplied dry-run plan fingerprint does not match current manifest/input/template/filesystem preconditions.", details: { expected: expectedFingerprint, actual: planned.publicResult.plan_fingerprint } }]
  });
}

async function verifyPrecondition(root, item) {
  const target = item.path ? path.resolve(root, item.path) : root;
  if (item.type === "target_absent") return (await statIfExists(target)) === null;
  if (item.type === "directory_exists") return (await statIfExists(target))?.isDirectory() === true;
  if (item.type === "current_content_hash") {
    const current = await readIfExists(target);
    return current !== null && sha256Text(current) === item.expected;
  }
  if (["generated_marker", "generated_body_hash", "generated_marker_count", "report_only_no_write"].includes(item.type)) return true;
  return false;
}

async function failedPreconditions(root, operations) {
  for (const operation of operations) {
    for (const item of operation.preconditions ?? []) {
      const ok = await verifyPrecondition(root, item);
      if (!ok) return { operation, precondition: item };
    }
  }
  return null;
}

export async function loadSchematicDefinition(manifestPath, deps) {
  const loaded = await loadSchematicManifest(manifestPath, deps);
  return Object.freeze({ manifest: loaded.manifest, inputSchema: loaded.dl08.inputSchema, normalize: (input) => validateAndNormalizeInput(loaded, input), plan: (normalized, ctx) => planSchematic(loaded, normalized, ctx), ...loaded });
}

export async function planSchematic(definition, normalized, { targetRoot, mode = "dry-run" }) {
  const loadedTemplates = await loadTemplates(definition);
  const planned = [];
  const conflicts = [];
  for (const operation of [...definition.dl08.operations].sort((a, b) => `${a.dependsOn ?? ""}:${a.pathTemplate ?? ""}:${a.id}`.localeCompare(`${b.dependsOn ?? ""}:${b.pathTemplate ?? ""}:${b.id}`))) {
    const classified = await classifyOperation(operation, definition, normalized, targetRoot, loadedTemplates);
    planned.push({ ...classified.operation, absolutePath: classified.absolutePath, content: classified.content, writeContent: classified.writeContent });
    if (classified.conflict) conflicts.push(classified.conflict);
  }
  const publicOps = planned.map(({ absolutePath, content, writeContent, ...op }) => op);
  return { internalOperations: planned, publicResult: resultEnvelope({ status: conflicts.length ? "conflicts" : "ok", definition, mode, normalized, operations: publicOps, conflicts }) };
}

export async function executeSchematic({ manifestPath, input, targetRoot, mode, deps, attemptDryRunWrite = false, expectedPlan = null, planFingerprint = null }) {
  try {
    const definition = await loadSchematicDefinition(manifestPath, deps);
    const normalized = definition.normalize(input);
    const normalizedMode = mode === "plan" ? "dry-run" : mode;
    if (!["dry-run", "apply"].includes(normalizedMode)) fail("invalid_input", "Mode must be plan, dry-run, or apply.", { mode });
    const planned = await planSchematic(definition, normalized, { targetRoot, mode: normalizedMode });
    if (normalizedMode === "dry-run") {
      if (attemptDryRunWrite) fail("dry_run_write_attempt", "Dry-run write attempt was blocked before filesystem mutation.");
      return planned.publicResult;
    }
    const expectedFingerprint = extractExpectedPlanFingerprint(expectedPlan, planFingerprint);
    if (expectedFingerprint && expectedFingerprint !== planned.publicResult.plan_fingerprint) return stalePlanResult(definition, "apply", normalized, planned, expectedFingerprint);
    if (planned.publicResult.conflicts.length > 0) return planned.publicResult;
    const failed = await failedPreconditions(targetRoot, planned.internalOperations.filter((operation) => !["report_only"].includes(operation.action)));
    if (failed) {
      const conflict = { path: failed.operation.path, reason: "precondition_failed", severity: "hard_fail" };
      return resultEnvelope({ status: "blocked", definition, mode: "apply", normalized, operations: planned.publicResult.operations, conflicts: [conflict], diagnostics: [{ code: "precondition_failed", message: "Apply stopped before the first failed operation precondition.", details: { operation: failed.operation.op_id, precondition: failed.precondition } }] });
    }
    const applied = [];
    for (const operation of planned.internalOperations) {
      if (["noop", "report_only"].includes(operation.action)) { applied.push(operation); continue; }
      if (operation.action === "create" || operation.action === "replace") {
        if (operation.kind === "create_directory") await fs.mkdir(operation.absolutePath, { recursive: true });
        else await atomicWrite(operation.absolutePath, operation.writeContent ?? operation.content.finalContent);
        applied.push(operation);
        continue;
      }
      fail("blocked", "Apply encountered an unsupported planned action.", { action: operation.action });
    }
    const rerun = await planSchematic(definition, normalized, { targetRoot, mode: "apply" });
    return { ...rerun.publicResult, mode: "apply", apply: { written: applied.filter((op) => ["create", "replace"].includes(op.action)).map((op) => op.path), stoppedOnFirstFailedPrecondition: true } };
  } catch (error) {
    const diagnostic = toDiagnostic(error);
    const status = error.code === "invalid_input" ? "invalid_input" : "blocked";
    return { status, schematic: { id: null, version: null, manifest_path: manifestPath }, mode, plan_fingerprint: null, normalized_input: null, operations: [], conflicts: diagnostic.code === "dry_run_write_attempt" ? [{ path: "", reason: "dry_run_write_attempt", severity: "hard_fail" }] : [], diagnostics: [diagnostic], verification_preview: { expected_tests: [], expected_validators: [] }, context_docs_preview: { expected_context_stubs: [], expected_docs_stubs: [] }, domain_neutrality: { classification: "unknown", findings: [] } };
  }
}

export function assertDryRunWriteForbidden() {
  fail("dry_run_write_attempt", "Dry-run write attempt was blocked before filesystem mutation.");
}

export { DOMAIN_FORBIDDEN_TERMS, sha256Text, stableJson };
