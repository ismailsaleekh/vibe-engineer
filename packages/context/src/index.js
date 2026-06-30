import { createHash } from "node:crypto";
import fs from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateArtifactFile } from "@vibe-engineer/artifacts";

export const CONTEXT_SCHEMA_VERSION = "1.0.0";
export const CONTEXT_INDEX_VERSION = "1.0.0";
export const CONTEXT_SCHEMA_IDS = Object.freeze({
  graph: "https://schemas.vibe-engineer.dev/context/v1/context-graph.schema.json",
  index: "https://schemas.vibe-engineer.dev/context/v1/context-index.schema.json",
  area: "https://schemas.vibe-engineer.dev/context/v1/context-area.schema.json",
  summary: "https://schemas.vibe-engineer.dev/context/v1/context-summary.schema.json",
  retrievalClosure: "https://schemas.vibe-engineer.dev/context/v1/retrieval-closure.schema.json",
});

const CONTEXT_ROOT = path.join(".vibe", "context");
const DEFAULT_TIME = "2026-06-24T00:00:00.000Z";
const ALLOWED_NODE_KINDS = new Set([
  "area",
  "summary",
  "decision",
  "work_item",
  "source",
  "standard",
]);
const ALLOWED_EDGE_RELS = new Set([
  "derived_from",
  "depends_on",
  "summarizes",
  "cites",
  "supersedes",
  "context_for",
]);
const ALLOWED_LINK_KINDS = new Set(["source", "work", "evidence", "decision"]);
const ALLOWED_SOURCE_KINDS = new Set([
  "source_doc",
  "artifact",
  "decision",
  "work_item",
  "evidence",
  "standard",
]);
const TRUSTED = "trusted";
const DISCLOSURE_LEVELS = new Set([0, 1, 2, 3, 4]);
const PRODUCER_KEYS = new Set(["kind", "id", "name", "version", "runId"]);
const FINGERPRINT_KEYS = new Set(["algorithm", "value"]);
const SCOPE_KEYS = new Set(["kind", "paths", "description"]);
const ARTIFACT_REF_KEYS = new Set(["artifactKind", "artifactId", "path", "required"]);
const SOURCE_KEYS = new Set([
  "sourceId",
  "kind",
  "path",
  "fingerprint",
  "versionRef",
  "trust",
  "required",
  "level",
  "scope",
  "artifactRef",
  "citations",
]);
const CITATION_KEYS = new Set(["citationId", "sourceId", "path", "fingerprint", "versionRef"]);
const NODE_KEYS = new Set([
  "contextId",
  "kind",
  "areaId",
  "title",
  "level",
  "mandatory",
  "trust",
  "scope",
  "owner",
  "headerRef",
  "sourceRefs",
  "artifactPath",
  "derivedFromNodeIds",
]);
const HEADER_REF_KEYS = new Set(["artifactId", "path"]);
const EDGE_KEYS = new Set(["from", "to", "rel"]);
const LINK_KEYS = new Set(["linkId", "kind", "ref", "required", "statusAtLinkTime"]);
const LINK_REF_KEYS = new Set(["artifactKind", "artifactId", "path"]);
const SCHEMA_REFS_KEYS = new Set(["graph", "index", "area", "summary", "retrievalClosure"]);
const RETRIEVAL_POLICY_KEYS = new Set(["requireTaskScope", "mandatoryLevel", "allowedLevels"]);
const INDEX_GRAPH_REF_KEYS = new Set(["graphId", "path", "headerPath"]);
const INDEX_NODE_REF_KEYS = new Set([
  "contextId",
  "areaId",
  "level",
  "mandatory",
  "path",
  "headerPath",
  "sourceRefs",
]);
const INDEX_SOURCE_REF_KEYS = new Set(["sourceId", "path", "fingerprint"]);
const CONTEXT_ITEM_KEYS = new Set([
  "contextId",
  "level",
  "mandatory",
  "text",
  "content",
  "sourceRefs",
  "citationRefs",
]);
const UPDATE_METADATA_KEYS = new Set(["invalidationStatus"]);
const DRIFT_METADATA_KEYS = new Set(["driftStatus", "sourceRefs"]);

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unique(values) {
  return [...new Set(values)];
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assertObject(value, name) {
  if (!isObject(value)) throw new TypeError(`${name} must be an object.`);
}

function assertString(value, name) {
  if (typeof value !== "string" || value.length === 0)
    throw new TypeError(`${name} must be a non-empty string.`);
}

function assertArray(value, name) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array.`);
}

function assertNoUnknownKeys(value, allowed, pointer, findings, filePath, code = "UNKNOWN_FIELD") {
  if (!isObject(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      findings.push(
        finding("error", code, `${pointer}/${key}`, `${filePath}: unknown field is not allowed.`, {
          filePath,
        }),
      );
    }
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function isSha256Hex(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function validateRequiredString(value, pointer, code, message, findings) {
  if (!isNonEmptyString(value)) findings.push(finding("error", code, pointer, message));
}

function validateStringArray(value, pointer, code, message, findings, { minItems = 0 } = {}) {
  if (
    !Array.isArray(value) ||
    value.length < minItems ||
    value.some((item) => !isNonEmptyString(item))
  ) {
    findings.push(finding("error", code, pointer, message));
    return false;
  }
  return true;
}

function finding(severity, code, pointer, message, extra = {}) {
  return {
    severity,
    code,
    pointer,
    message,
    blocking: severity === "error" || severity === "critical",
    ...extra,
  };
}

function cleanResult(extra = {}) {
  return { ok: true, status: "clean", findings: [], ...extra };
}

function failResult(findings, extra = {}) {
  return { ok: false, status: "blocked", findings, ...extra };
}

function relPath(projectRoot, absolutePath) {
  return path.relative(projectRoot, absolutePath).split(path.sep).join("/");
}

function resolveProjectPath(projectRoot, relativeOrAbsolutePath) {
  const resolvedRoot = path.resolve(projectRoot);
  const resolvedPath = path.resolve(resolvedRoot, relativeOrAbsolutePath);
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Path escapes project root: ${relativeOrAbsolutePath}`);
  }
  return resolvedPath;
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, stableJson(value), "utf8");
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readJsonCarrier(filePath, artifactKind, findings) {
  if (path.extname(filePath) !== ".json") {
    findings.push(
      finding(
        "error",
        "CARRIER_NOT_JSON",
        "",
        `${filePath}: canonical context carriers must be JSON.`,
        { filePath, artifactKind },
      ),
    );
    return undefined;
  }
  try {
    return await readJson(filePath);
  } catch (error) {
    findings.push(
      finding(
        "error",
        "MALFORMED_JSON",
        "",
        `${filePath}: malformed JSON carrier (${error.message}).`,
        { filePath, artifactKind },
      ),
    );
    return undefined;
  }
}

async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function sha256File(filePath) {
  const data = await readFile(filePath);
  return createHash("sha256").update(data).digest("hex");
}

function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function contextPath(...parts) {
  return path
    .join(CONTEXT_ROOT, ...parts)
    .split(path.sep)
    .join("/");
}

export function createContextHeader({
  artifactId,
  title,
  generatedAt = DEFAULT_TIME,
  producer = defaultProducer(),
  ownerLane = "I-08-context-graph-index-drift",
  ownedWritePaths = [
    "packages/context/**",
    ".vibe/context/schema/**",
    ".vibe/work/I-08-context-graph-index-drift/**",
  ],
  contextId,
  scope,
  owner = "vibe-engineer-context",
  links,
  sourceRefs = [],
}) {
  assertString(artifactId, "artifactId");
  assertString(title, "title");
  const effectiveContextId = contextId ?? artifactId;
  const effectiveScope = scope ?? {
    kind: "repo",
    paths: ["."],
    description: "Domain-neutral repository context.",
  };
  const effectiveLinks = links ?? [
    {
      rel: "context_for",
      artifactKind: "context_file_header",
      artifactId,
      path: contextPath("index", `${artifactId}.json`),
      required: true,
      statusAtLinkTime: "current",
    },
  ];
  return {
    schemaVersion: "1.0.0",
    artifactKind: "context_file_header",
    artifactId,
    title,
    createdAt: generatedAt,
    updatedAt: generatedAt,
    producer,
    status: "current",
    ownership: {
      ownerLane,
      ownedWritePaths,
      readOnlyPaths: ["packages/artifacts/**", "packages/config/**"],
      untouchablePaths: [".git/**", "pnpm-lock.yaml", "package.json", "pnpm-workspace.yaml"],
      concurrencyNotes: "Dirty-tree safe; only explicit I-08 carriers may be written.",
      handoffPolicy:
        "Consumers must use stable ids, citations, and drift findings before relying on context.",
    },
    links: effectiveLinks,
    extensions: {
      "vibe.context": { schemaVersion: CONTEXT_SCHEMA_VERSION },
    },
    sourceRefs,
    contextId: effectiveContextId,
    scope: effectiveScope,
    owner,
    dependencies: [],
    dependents: [],
    relatedDecisions: [],
    relatedPlansArtifacts: [],
    verificationMetadata: { lastValidationEvidenceRefs: [], status: "unknown" },
    updateMetadata: {
      lastReviewedAt: generatedAt,
      lastUpdatedBy: producer,
      updateReason: "context graph/index write",
    },
    driftMetadata: { driftStatus: "unknown", lastDriftCheckAt: generatedAt, evidenceRefs: [] },
    retrievalHints: [],
    summary: title,
  };
}

export function defaultProducer() {
  return {
    kind: "agent",
    id: "i-08-context-writer",
    name: "@vibe-engineer/context",
    version: "1.0.0",
    runId: "i-08-context-witness",
  };
}

function sourceArtifactRef(source) {
  if (!isObject(source.artifactRef)) return undefined;
  return {
    artifactKind: source.artifactRef.artifactKind,
    artifactId: source.artifactRef.artifactId,
    path: source.relativePath,
    required: source.required !== false,
  };
}

async function materializeSource(projectRoot, source) {
  assertString(source.sourceId, "source.sourceId");
  assertString(source.relativePath, "source.relativePath");
  const content = typeof source.content === "string" ? source.content : `# ${source.sourceId}\n`;
  const absolutePath = resolveProjectPath(projectRoot, source.relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
  const fingerprint = { algorithm: "sha256", value: sha256Text(content) };
  return {
    sourceId: source.sourceId,
    kind: source.kind ?? "source_doc",
    path: source.relativePath.split(path.sep).join("/"),
    fingerprint,
    versionRef: source.versionRef ?? `sha256:${fingerprint.value}`,
    trust: source.trust ?? TRUSTED,
    required: source.required !== false,
    level: source.level ?? 1,
    scope: source.scope ?? {
      kind: "repo",
      paths: [source.relativePath],
      description: "Domain-neutral source context.",
    },
    artifactRef: sourceArtifactRef(source) ?? {
      artifactKind: "context_file_header",
      artifactId: source.sourceId,
      path: source.relativePath,
      required: source.required !== false,
    },
    citations: [
      {
        citationId: `${source.sourceId}:sha256`,
        sourceId: source.sourceId,
        path: source.relativePath.split(path.sep).join("/"),
        fingerprint,
      },
    ],
  };
}

async function materializeLink(projectRoot, link) {
  assertString(link.linkId, "link.linkId");
  assertString(link.kind, "link.kind");
  if (!ALLOWED_LINK_KINDS.has(link.kind))
    throw new TypeError(`Unsupported link kind ${link.kind}.`);
  assertObject(link.ref, "link.ref");
  assertString(link.ref.artifactKind, "link.ref.artifactKind");
  assertString(link.ref.artifactId, "link.ref.artifactId");
  assertString(link.ref.path, "link.ref.path");
  const content =
    typeof link.content === "string" ? link.content : `${link.kind} ${link.ref.artifactId}\n`;
  const absolutePath = resolveProjectPath(projectRoot, link.ref.path);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
  return {
    linkId: link.linkId,
    kind: link.kind,
    ref: {
      artifactKind: link.ref.artifactKind,
      artifactId: link.ref.artifactId,
      path: link.ref.path.split(path.sep).join("/"),
    },
    required: link.required !== false,
    statusAtLinkTime: link.statusAtLinkTime ?? "current",
  };
}

function buildArea({
  areaId,
  title,
  owner = "vibe-engineer-context",
  level = 1,
  mandatory = true,
  sourceRefs = [],
  context = [],
  scope,
}) {
  assertString(areaId, "areaId");
  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    artifactKind: "context_area",
    areaId,
    title,
    owner,
    level,
    mandatory,
    sourceRefs,
    context,
    scope: scope ?? { kind: "repo", paths: ["."], description: "Domain-neutral area context." },
    updateMetadata: { invalidationStatus: "current" },
    driftMetadata: { driftStatus: "clean", sourceRefs },
    schemaRef: CONTEXT_SCHEMA_IDS.area,
  };
}

function buildSummary({
  summaryId,
  title,
  areaId,
  sourceRefs = [],
  derivedFromNodeIds = [],
  level = 2,
  mandatory = false,
  summary,
}) {
  assertString(summaryId, "summaryId");
  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    artifactKind: "context_summary",
    summaryId,
    title,
    areaId,
    level,
    mandatory,
    summary: summary ?? "Domain-neutral summary derived from cited source nodes.",
    sourceRefs,
    derivedFromNodeIds,
    updateMetadata: { invalidationStatus: "current" },
    driftMetadata: { driftStatus: "clean", sourceRefs },
    expandableToSourceRefs: sourceRefs,
    schemaRef: CONTEXT_SCHEMA_IDS.summary,
  };
}

function makeNodeFromArea(area, headerPath) {
  return {
    contextId: `ctx:${area.areaId}`,
    kind: "area",
    areaId: area.areaId,
    title: area.title,
    level: area.level,
    mandatory: area.mandatory,
    trust: TRUSTED,
    scope: area.scope,
    owner: area.owner,
    headerRef: { artifactId: `ctx-area-${area.areaId}`, path: headerPath },
    sourceRefs: area.sourceRefs,
    artifactPath: contextPath("areas", `${area.areaId}.context.json`),
  };
}

function makeNodeFromSummary(summary, headerPath) {
  return {
    contextId: `ctx-summary:${summary.summaryId}`,
    kind: "summary",
    areaId: summary.areaId,
    title: summary.title,
    level: summary.level,
    mandatory: summary.mandatory,
    trust: TRUSTED,
    scope: { kind: "repo", paths: ["."], description: "Derived summary context." },
    owner: "vibe-engineer-context",
    headerRef: { artifactId: `ctx-summary-${summary.summaryId}`, path: headerPath },
    sourceRefs: summary.sourceRefs,
    artifactPath: contextPath("summaries", `${summary.summaryId}.summary.json`),
    derivedFromNodeIds: summary.derivedFromNodeIds,
  };
}

export async function writeContextProject(options) {
  assertObject(options, "options");
  assertString(options.projectRoot, "options.projectRoot");
  const projectRoot = path.resolve(options.projectRoot);
  const generatedAt = options.generatedAt ?? DEFAULT_TIME;
  const producer = options.producer ?? defaultProducer();
  const graphId = options.graphId ?? "context-graph-main";
  if (options.reset === true)
    await rm(path.join(projectRoot, CONTEXT_ROOT), { recursive: true, force: true });
  await mkdir(path.join(projectRoot, CONTEXT_ROOT, "index"), { recursive: true });
  await mkdir(path.join(projectRoot, CONTEXT_ROOT, "areas"), { recursive: true });
  await mkdir(path.join(projectRoot, CONTEXT_ROOT, "summaries"), { recursive: true });
  await mkdir(path.join(projectRoot, CONTEXT_ROOT, "schema"), { recursive: true });

  const sources = [];
  for (const source of options.sources ?? defaultSources())
    sources.push(await materializeSource(projectRoot, source));
  const sourceIds = new Set(sources.map((source) => source.sourceId));
  const links = [];
  for (const link of options.links ?? defaultLinks())
    links.push(await materializeLink(projectRoot, link));

  const areas = (options.areas ?? defaultAreas(sources)).map((area) => buildArea(area));
  const summaries = (options.summaries ?? defaultSummaries(areas)).map((summary) =>
    buildSummary(summary),
  );
  for (const area of areas) {
    for (const sourceRef of area.sourceRefs)
      if (!sourceIds.has(sourceRef))
        throw new Error(`Area ${area.areaId} references unknown source ${sourceRef}.`);
  }
  for (const summary of summaries) {
    for (const sourceRef of summary.sourceRefs)
      if (!sourceIds.has(sourceRef))
        throw new Error(`Summary ${summary.summaryId} references unknown source ${sourceRef}.`);
  }

  const nodes = [];
  for (const area of areas) {
    const headerPath = contextPath("areas", `${area.areaId}.header.json`);
    const header = createContextHeader({
      artifactId: `ctx-area-${area.areaId}`,
      title: `${area.title} header`,
      generatedAt,
      producer,
      contextId: `ctx:${area.areaId}`,
      scope: area.scope,
      links: area.sourceRefs.map((sourceRef) => ({
        rel: "context_for",
        artifactKind: "context_file_header",
        artifactId: sourceRef,
        path: sources.find((s) => s.sourceId === sourceRef)?.path ?? ".",
        required: true,
        statusAtLinkTime: "current",
      })),
      sourceRefs: area.sourceRefs.map((sourceRef) => ({ kind: "source_doc", ref: sourceRef })),
    });
    await writeJson(resolveProjectPath(projectRoot, headerPath), header);
    await writeJson(
      resolveProjectPath(projectRoot, contextPath("areas", `${area.areaId}.context.json`)),
      area,
    );
    nodes.push(makeNodeFromArea(area, headerPath));
  }
  for (const summary of summaries) {
    const headerPath = contextPath("summaries", `${summary.summaryId}.header.json`);
    const header = createContextHeader({
      artifactId: `ctx-summary-${summary.summaryId}`,
      title: `${summary.title} header`,
      generatedAt,
      producer,
      contextId: `ctx-summary:${summary.summaryId}`,
      links: summary.sourceRefs.map((sourceRef) => ({
        rel: "derived_from",
        artifactKind: "context_file_header",
        artifactId: sourceRef,
        path: sources.find((s) => s.sourceId === sourceRef)?.path ?? ".",
        required: true,
        statusAtLinkTime: "current",
      })),
      sourceRefs: summary.sourceRefs.map((sourceRef) => ({ kind: "source_doc", ref: sourceRef })),
    });
    await writeJson(resolveProjectPath(projectRoot, headerPath), header);
    await writeJson(
      resolveProjectPath(
        projectRoot,
        contextPath("summaries", `${summary.summaryId}.summary.json`),
      ),
      summary,
    );
    nodes.push(makeNodeFromSummary(summary, headerPath));
  }

  const edges = [];
  for (const summary of summaries) {
    for (const from of summary.derivedFromNodeIds) {
      edges.push({ from, to: `ctx-summary:${summary.summaryId}`, rel: "summarizes" });
    }
  }

  const graph = {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    artifactKind: "context_graph",
    graphId,
    indexVersion: CONTEXT_INDEX_VERSION,
    producer,
    generatedAt,
    schemaRefs: CONTEXT_SCHEMA_IDS,
    sources,
    nodes,
    edges,
    links,
    retrievalPolicy: { requireTaskScope: true, mandatoryLevel: 1, allowedLevels: [0, 1, 2, 3, 4] },
  };
  const graphHeaderPath = contextPath("index", "context-graph.header.json");
  const indexHeaderPath = contextPath("index", "context-index.header.json");
  await writeJson(
    resolveProjectPath(projectRoot, graphHeaderPath),
    createContextHeader({
      artifactId: "ctx-index-graph",
      title: "Context graph header",
      generatedAt,
      producer,
      contextId: graphId,
    }),
  );
  await writeJson(
    resolveProjectPath(projectRoot, contextPath("index", "context-graph.json")),
    graph,
  );

  const index = buildContextIndex({
    generatedAt,
    producer,
    graph,
    graphPath: contextPath("index", "context-graph.json"),
    graphHeaderPath,
    indexHeaderPath,
  });
  await writeJson(
    resolveProjectPath(projectRoot, indexHeaderPath),
    createContextHeader({
      artifactId: "ctx-index-main",
      title: "Context index header",
      generatedAt,
      producer,
      contextId: index.indexId,
    }),
  );
  await writeJson(
    resolveProjectPath(projectRoot, contextPath("index", "context-index.json")),
    index,
  );
  await writeJson(resolveProjectPath(projectRoot, contextPath("schema", "schema-manifest.json")), {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    artifactKind: "context_schema_manifest",
    schemaRefs: CONTEXT_SCHEMA_IDS,
  });

  return {
    ok: true,
    projectRoot,
    contextRoot: path.join(projectRoot, CONTEXT_ROOT),
    graphPath: path.join(projectRoot, CONTEXT_ROOT, "index", "context-graph.json"),
    indexPath: path.join(projectRoot, CONTEXT_ROOT, "index", "context-index.json"),
    areaPaths: areas.map((area) =>
      path.join(projectRoot, CONTEXT_ROOT, "areas", `${area.areaId}.context.json`),
    ),
    summaryPaths: summaries.map((summary) =>
      path.join(projectRoot, CONTEXT_ROOT, "summaries", `${summary.summaryId}.summary.json`),
    ),
    graph,
    index,
  };
}

function defaultSources() {
  return [
    {
      sourceId: "src:task-contract",
      relativePath: "sources/task-contract.md",
      content: "# Task Contract\nDomain-neutral context source.\n",
      artifactRef: { artifactKind: "work_brief", artifactId: "wb:task-contract" },
      level: 1,
    },
    {
      sourceId: "src:verification-contract",
      relativePath: "sources/verification-contract.md",
      content: "# Verification Contract\nContext must cite sources and fail closed.\n",
      artifactRef: { artifactKind: "verification_delta", artifactId: "vd:verification-contract" },
      level: 2,
    },
  ];
}

function defaultLinks() {
  return [
    {
      linkId: "work:i08",
      kind: "work",
      ref: {
        artifactKind: "implementation_plan",
        artifactId: "ip:i08-context",
        path: ".vibe/work/I-08-context-graph-index-drift/implementation-plan.json",
      },
      content: '{"status":"fixture"}\n',
    },
    {
      linkId: "evidence:i08",
      kind: "evidence",
      ref: {
        artifactKind: "evidence_packet",
        artifactId: "ev:i08-context",
        path: ".vibe/evidence/I-08-context-graph-index-drift/evidence.json",
      },
      content: '{"status":"fixture"}\n',
    },
    {
      linkId: "decision:dl09",
      kind: "decision",
      ref: {
        artifactKind: "context_file_header",
        artifactId: "dl:09",
        path: "docs/decisions/DL-09-context-memory-drift.md",
      },
      content: "# DL-09\nDomain-neutral decision fixture.\n",
    },
  ];
}

function defaultAreas(sources) {
  return [
    {
      areaId: "core-contracts",
      title: "Core Context Contracts",
      sourceRefs: [sources[0].sourceId],
      context: [
        {
          contextId: "ctx:core-contracts:level1",
          level: 1,
          mandatory: true,
          text: "Use cited source context for task contracts.",
          sourceRefs: [sources[0].sourceId],
          citationRefs: [`${sources[0].sourceId}:sha256`],
        },
      ],
      scope: {
        kind: "repo",
        paths: ["packages/context"],
        description: "Context package core contract implementation.",
      },
    },
  ];
}

function defaultSummaries(areas) {
  return [
    {
      summaryId: "core-contracts-summary",
      title: "Core Contract Summary",
      areaId: areas[0].areaId,
      sourceRefs: areas[0].sourceRefs,
      derivedFromNodeIds: [`ctx:${areas[0].areaId}`],
      level: 2,
      mandatory: false,
      summary: "Derived summary of cited core context contracts.",
    },
  ];
}

export function buildContextIndex({
  generatedAt = DEFAULT_TIME,
  producer = defaultProducer(),
  graph,
  graphPath,
  graphHeaderPath,
  indexHeaderPath,
}) {
  assertObject(graph, "graph");
  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    artifactKind: "context_index",
    indexId: "context-index-main",
    indexVersion: CONTEXT_INDEX_VERSION,
    producer,
    generatedAt,
    graphRef: { graphId: graph.graphId, path: graphPath, headerPath: graphHeaderPath },
    headerRef: { artifactId: "ctx-index-main", path: indexHeaderPath },
    nodeRefs: graph.nodes.map((node) => ({
      contextId: node.contextId,
      areaId: node.areaId,
      level: node.level,
      mandatory: node.mandatory,
      path: node.artifactPath,
      headerPath: node.headerRef.path,
      sourceRefs: node.sourceRefs,
    })),
    sourceRefs: graph.sources.map((source) => ({
      sourceId: source.sourceId,
      path: source.path,
      fingerprint: source.fingerprint,
    })),
    schemaRef: CONTEXT_SCHEMA_IDS.index,
  };
}

const GRAPH_KEYS = new Set([
  "schemaVersion",
  "artifactKind",
  "graphId",
  "indexVersion",
  "producer",
  "generatedAt",
  "schemaRefs",
  "sources",
  "nodes",
  "edges",
  "links",
  "retrievalPolicy",
]);
const INDEX_KEYS = new Set([
  "schemaVersion",
  "artifactKind",
  "indexId",
  "indexVersion",
  "producer",
  "generatedAt",
  "graphRef",
  "headerRef",
  "nodeRefs",
  "sourceRefs",
  "schemaRef",
]);
const AREA_KEYS = new Set([
  "schemaVersion",
  "artifactKind",
  "areaId",
  "title",
  "owner",
  "level",
  "mandatory",
  "sourceRefs",
  "context",
  "scope",
  "updateMetadata",
  "driftMetadata",
  "schemaRef",
]);
const SUMMARY_KEYS = new Set([
  "schemaVersion",
  "artifactKind",
  "summaryId",
  "title",
  "areaId",
  "level",
  "mandatory",
  "summary",
  "sourceRefs",
  "derivedFromNodeIds",
  "updateMetadata",
  "driftMetadata",
  "expandableToSourceRefs",
  "schemaRef",
]);

function validateCommonCarrier(carrier, expectedKind, allowedKeys, filePath, findings) {
  if (!isObject(carrier)) {
    findings.push(
      finding("error", "NOT_OBJECT", "", `${filePath}: context carrier must be an object.`, {
        filePath,
        artifactKind: expectedKind,
      }),
    );
    return;
  }
  assertNoUnknownKeys(carrier, allowedKeys, "", findings, filePath);
  if (carrier.schemaVersion !== CONTEXT_SCHEMA_VERSION)
    findings.push(
      finding(
        "error",
        "UNSUPPORTED_CONTEXT_VERSION",
        "/schemaVersion",
        `${filePath}: unsupported context schemaVersion.`,
        { filePath, artifactKind: expectedKind },
      ),
    );
  if (carrier.artifactKind !== expectedKind)
    findings.push(
      finding(
        "error",
        "ARTIFACT_KIND_MISMATCH",
        "/artifactKind",
        `${filePath}: expected ${expectedKind}.`,
        { filePath, artifactKind: expectedKind },
      ),
    );
}

async function validateHeader(projectRoot, headerRef, findings, pointer) {
  if (
    !isObject(headerRef) ||
    typeof headerRef.artifactId !== "string" ||
    typeof headerRef.path !== "string"
  ) {
    findings.push(
      finding(
        "error",
        "MISSING_CONTEXT_HEADER_REF",
        pointer,
        "Context node/index must reference a stable ContextFileHeaderV1 artifact id and path.",
      ),
    );
    return;
  }
  const headerPath = resolveProjectPath(projectRoot, headerRef.path);
  if (!(await fileExists(headerPath))) {
    findings.push(
      finding(
        "error",
        "MISSING_CONTEXT_HEADER",
        pointer,
        `${headerRef.path}: required ContextFileHeaderV1 file is missing.`,
        { filePath: headerPath },
      ),
    );
    return;
  }
  const result = validateArtifactFile(headerPath, { kind: "context_file_header" });
  if (!result.ok) {
    for (const error of result.errors) {
      findings.push(
        finding(
          "error",
          "INVALID_CONTEXT_HEADER",
          pointer,
          `ContextFileHeaderV1 validation failed through @vibe-engineer/artifacts: ${error.message}`,
          { filePath: headerPath, providerCode: error.code },
        ),
      );
    }
    return;
  }
  if (result.artifact.artifactId !== headerRef.artifactId) {
    findings.push(
      finding(
        "error",
        "MISLINKED_CONTEXT_HEADER",
        pointer,
        `${headerRef.path}: header artifactId does not match ref.`,
        { filePath: headerPath },
      ),
    );
  }
}

function validateProducer(value, pointer, findings, filePath) {
  if (!isObject(value)) {
    findings.push(
      finding("error", "INVALID_PRODUCER", pointer, `${filePath}: producer must be an object.`, {
        filePath,
      }),
    );
    return;
  }
  assertNoUnknownKeys(value, PRODUCER_KEYS, pointer, findings, filePath, "INVALID_PRODUCER");
  for (const key of ["kind", "id", "name", "version", "runId"])
    validateRequiredString(
      value[key],
      `${pointer}/${key}`,
      "INVALID_PRODUCER",
      `${filePath}: producer requires ${key}.`,
      findings,
    );
}

function validateFingerprint(value, pointer, findings, filePath, code = "INVALID_FINGERPRINT") {
  if (!isObject(value)) {
    findings.push(
      finding("error", code, pointer, `${filePath}: fingerprint must be an object.`, { filePath }),
    );
    return false;
  }
  assertNoUnknownKeys(value, FINGERPRINT_KEYS, pointer, findings, filePath, code);
  if (value.algorithm !== "sha256" || !isSha256Hex(value.value)) {
    findings.push(
      finding(
        "error",
        code,
        pointer,
        `${filePath}: fingerprint must be sha256 with a 64-character lowercase hex value.`,
        { filePath },
      ),
    );
    return false;
  }
  return true;
}

function validateScope(value, pointer, findings, filePath, code = "INVALID_SCOPE") {
  if (!isObject(value)) {
    findings.push(
      finding("error", code, pointer, `${filePath}: scope must be an object.`, { filePath }),
    );
    return;
  }
  assertNoUnknownKeys(value, SCOPE_KEYS, pointer, findings, filePath, code);
  validateRequiredString(
    value.kind,
    `${pointer}/kind`,
    code,
    `${filePath}: scope requires kind.`,
    findings,
  );
  validateStringArray(
    value.paths,
    `${pointer}/paths`,
    code,
    `${filePath}: scope requires non-empty paths.`,
    findings,
    { minItems: 1 },
  );
  validateRequiredString(
    value.description,
    `${pointer}/description`,
    code,
    `${filePath}: scope requires description.`,
    findings,
  );
}

function validateArtifactRef(value, pointer, findings, filePath, code = "PATH_ONLY_REFERENCE") {
  if (!isObject(value)) {
    findings.push(
      finding(
        "error",
        code,
        pointer,
        "Stable artifact kind/id/path is required; path-only references are not authoritative.",
        { filePath },
      ),
    );
    return;
  }
  assertNoUnknownKeys(value, ARTIFACT_REF_KEYS, pointer, findings, filePath, code);
  if (
    !isNonEmptyString(value.artifactKind) ||
    !isNonEmptyString(value.artifactId) ||
    !isNonEmptyString(value.path)
  ) {
    findings.push(
      finding(
        "error",
        code,
        pointer,
        "Stable artifact kind/id/path is required; path-only references are not authoritative.",
        { filePath },
      ),
    );
  }
  if (typeof value.required !== "boolean")
    findings.push(
      finding("error", code, `${pointer}/required`, "Artifact refs must carry required boolean.", {
        filePath,
      }),
    );
}

function validateSchemaRefs(value, pointer, findings, filePath) {
  if (!isObject(value)) {
    findings.push(
      finding(
        "error",
        "INVALID_SCHEMA_REFS",
        pointer,
        `${filePath}: schemaRefs must be an object.`,
        { filePath },
      ),
    );
    return;
  }
  assertNoUnknownKeys(value, SCHEMA_REFS_KEYS, pointer, findings, filePath, "INVALID_SCHEMA_REFS");
  for (const [key, expected] of Object.entries(CONTEXT_SCHEMA_IDS)) {
    if (value[key] !== expected)
      findings.push(
        finding(
          "error",
          "INVALID_SCHEMA_REFS",
          `${pointer}/${key}`,
          `${filePath}: schemaRefs.${key} must match the committed schema id.`,
          { filePath },
        ),
      );
  }
}

function validateRetrievalPolicy(value, pointer, findings, filePath) {
  if (!isObject(value)) {
    findings.push(
      finding(
        "error",
        "INVALID_RETRIEVAL_POLICY",
        pointer,
        `${filePath}: retrievalPolicy must be an object.`,
        { filePath },
      ),
    );
    return;
  }
  assertNoUnknownKeys(
    value,
    RETRIEVAL_POLICY_KEYS,
    pointer,
    findings,
    filePath,
    "INVALID_RETRIEVAL_POLICY",
  );
  if (value.requireTaskScope !== true)
    findings.push(
      finding(
        "error",
        "INVALID_RETRIEVAL_POLICY",
        `${pointer}/requireTaskScope`,
        `${filePath}: retrieval policy must require task scope.`,
        { filePath },
      ),
    );
  if (value.mandatoryLevel !== 1)
    findings.push(
      finding(
        "error",
        "INVALID_RETRIEVAL_POLICY",
        `${pointer}/mandatoryLevel`,
        `${filePath}: retrieval policy must require Level 1 mandatory context.`,
        { filePath },
      ),
    );
  if (
    !Array.isArray(value.allowedLevels) ||
    value.allowedLevels.length !== 5 ||
    value.allowedLevels.some((level) => !DISCLOSURE_LEVELS.has(level))
  )
    findings.push(
      finding(
        "error",
        "INVALID_RETRIEVAL_POLICY",
        `${pointer}/allowedLevels`,
        `${filePath}: retrieval policy levels must be 0-4.`,
        { filePath },
      ),
    );
}

function validateGraphShape(graph, filePath, findings) {
  validateCommonCarrier(graph, "context_graph", GRAPH_KEYS, filePath, findings);
  validateProducer(graph.producer, "/producer", findings, filePath);
  validateSchemaRefs(graph.schemaRefs, "/schemaRefs", findings, filePath);
  validateRetrievalPolicy(graph.retrievalPolicy, "/retrievalPolicy", findings, filePath);
  if (!isNonEmptyString(graph.graphId))
    findings.push(
      finding(
        "error",
        "INVALID_GRAPH_ID",
        "/graphId",
        `${filePath}: graphId must be a non-empty stable id.`,
        { filePath },
      ),
    );
  if (!isNonEmptyString(graph.generatedAt))
    findings.push(
      finding(
        "error",
        "INVALID_GENERATED_AT",
        "/generatedAt",
        `${filePath}: generatedAt is required.`,
        { filePath },
      ),
    );
  if (graph.indexVersion !== CONTEXT_INDEX_VERSION)
    findings.push(
      finding(
        "error",
        "UNSUPPORTED_INDEX_VERSION",
        "/indexVersion",
        `${filePath}: unsupported indexVersion.`,
        { filePath },
      ),
    );
  if (!Array.isArray(graph.sources) || graph.sources.length === 0)
    findings.push(
      finding(
        "error",
        "MISSING_SOURCE_SET",
        "/sources",
        `${filePath}: graph must include cited source set.`,
        { filePath },
      ),
    );
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0)
    findings.push(
      finding(
        "error",
        "MISSING_CONTEXT_NODES",
        "/nodes",
        `${filePath}: graph must include context nodes.`,
        { filePath },
      ),
    );
  if (!Array.isArray(graph.edges))
    findings.push(
      finding("error", "INVALID_EDGES", "/edges", `${filePath}: edges must be an array.`, {
        filePath,
      }),
    );
  if (!Array.isArray(graph.links))
    findings.push(
      finding("error", "INVALID_LINKS", "/links", `${filePath}: links must be an array.`, {
        filePath,
      }),
    );
}

function validateIndexShape(index, filePath, findings) {
  validateCommonCarrier(index, "context_index", INDEX_KEYS, filePath, findings);
  validateProducer(index.producer, "/producer", findings, filePath);
  if (!isNonEmptyString(index.indexId))
    findings.push(
      finding(
        "error",
        "INVALID_INDEX_ID",
        "/indexId",
        `${filePath}: indexId must be a non-empty stable id.`,
        { filePath },
      ),
    );
  if (!isNonEmptyString(index.generatedAt))
    findings.push(
      finding(
        "error",
        "INVALID_GENERATED_AT",
        "/generatedAt",
        `${filePath}: generatedAt is required.`,
        { filePath },
      ),
    );
  if (index.indexVersion !== CONTEXT_INDEX_VERSION)
    findings.push(
      finding(
        "error",
        "UNSUPPORTED_INDEX_VERSION",
        "/indexVersion",
        `${filePath}: unsupported indexVersion.`,
        { filePath },
      ),
    );
  if (!Array.isArray(index.nodeRefs))
    findings.push(
      finding(
        "error",
        "INVALID_NODE_REFS",
        "/nodeRefs",
        `${filePath}: nodeRefs must be an array.`,
        { filePath },
      ),
    );
  if (!Array.isArray(index.sourceRefs))
    findings.push(
      finding(
        "error",
        "INVALID_SOURCE_REFS",
        "/sourceRefs",
        `${filePath}: sourceRefs must be an array.`,
        { filePath },
      ),
    );
}

function validateSourceVersionRef(source, pointer, findings, filePath, actualFingerprint) {
  if (!isNonEmptyString(source.versionRef)) {
    findings.push(
      finding(
        "error",
        "INVALID_SOURCE_VERSION_REF",
        `${pointer}/versionRef`,
        "Source ref requires a non-empty deterministic versionRef.",
        { filePath },
      ),
    );
    return;
  }
  const expectedFromDeclared =
    isObject(source.fingerprint) && isSha256Hex(source.fingerprint.value)
      ? `sha256:${source.fingerprint.value}`
      : undefined;
  const expectedFromActual = isSha256Hex(actualFingerprint)
    ? `sha256:${actualFingerprint}`
    : undefined;
  if (!source.versionRef.startsWith("sha256:")) {
    findings.push(
      finding(
        "error",
        "INVALID_SOURCE_VERSION_REF",
        `${pointer}/versionRef`,
        "Only deterministic sha256:<fingerprint> source version refs are accepted by this contract.",
        { filePath },
      ),
    );
    return;
  }
  const value = source.versionRef.slice("sha256:".length);
  if (!isSha256Hex(value)) {
    findings.push(
      finding(
        "error",
        "INVALID_SOURCE_VERSION_REF",
        `${pointer}/versionRef`,
        "sha256 source version refs must contain a 64-character lowercase hex digest.",
        { filePath },
      ),
    );
    return;
  }
  if (
    (expectedFromDeclared && source.versionRef !== expectedFromDeclared) ||
    (expectedFromActual && source.versionRef !== expectedFromActual)
  ) {
    findings.push(
      finding(
        "error",
        "STALE_SOURCE_VERSION_REF",
        `${pointer}/versionRef`,
        "Source versionRef does not match the current source fingerprint.",
        {
          filePath,
          expected: expectedFromActual ?? expectedFromDeclared,
          actual: source.versionRef,
        },
      ),
    );
  }
}

function validateSourceCitation(citation, source, pointer, findings, filePath, actualFingerprint) {
  if (!isObject(citation)) {
    findings.push(
      finding(
        "error",
        "INVALID_SOURCE_CITATION",
        pointer,
        "Source citation must be a strict object.",
        { filePath },
      ),
    );
    return;
  }
  assertNoUnknownKeys(
    citation,
    CITATION_KEYS,
    pointer,
    findings,
    filePath,
    "INVALID_SOURCE_CITATION",
  );
  validateRequiredString(
    citation.citationId,
    `${pointer}/citationId`,
    "INVALID_SOURCE_CITATION",
    "Source citation requires stable citationId.",
    findings,
  );
  if (citation.sourceId !== source.sourceId)
    findings.push(
      finding(
        "error",
        "INVALID_SOURCE_CITATION",
        `${pointer}/sourceId`,
        "Source citation sourceId must match its source.",
        { filePath },
      ),
    );
  if (citation.path !== source.path)
    findings.push(
      finding(
        "error",
        "INVALID_SOURCE_CITATION",
        `${pointer}/path`,
        "Source citation path must match its source path.",
        { filePath },
      ),
    );
  const validFingerprint = validateFingerprint(
    citation.fingerprint,
    `${pointer}/fingerprint`,
    findings,
    filePath,
    "INVALID_SOURCE_CITATION",
  );
  if (validFingerprint) {
    if (citation.fingerprint.value !== source.fingerprint?.value)
      findings.push(
        finding(
          "error",
          "INVALID_SOURCE_CITATION",
          `${pointer}/fingerprint`,
          "Source citation fingerprint must match source fingerprint.",
          { filePath },
        ),
      );
    if (isSha256Hex(actualFingerprint) && citation.fingerprint.value !== actualFingerprint)
      findings.push(
        finding(
          "error",
          "INVALID_SOURCE_CITATION",
          `${pointer}/fingerprint`,
          "Source citation fingerprint must match current source content.",
          { filePath, expected: actualFingerprint, actual: citation.fingerprint.value },
        ),
      );
  }
  if (citation.versionRef !== undefined && citation.versionRef !== source.versionRef)
    findings.push(
      finding(
        "error",
        "INVALID_SOURCE_CITATION",
        `${pointer}/versionRef`,
        "Source citation versionRef must match source versionRef.",
        { filePath },
      ),
    );
}

async function validateSources(projectRoot, graph, findings) {
  const ids = new Set();
  for (const [index, source] of (Array.isArray(graph.sources) ? graph.sources : []).entries()) {
    const pointer = `/sources/${index}`;
    if (!isObject(source)) {
      findings.push(
        finding("error", "INVALID_SOURCE_REF", pointer, "Source ref must be an object."),
      );
      continue;
    }
    assertNoUnknownKeys(
      source,
      SOURCE_KEYS,
      pointer,
      findings,
      String(projectRoot),
      "INVALID_SOURCE_REF",
    );
    if (!isNonEmptyString(source.sourceId))
      findings.push(
        finding(
          "error",
          "MISSING_SOURCE_ID",
          `${pointer}/sourceId`,
          "Source ref requires stable sourceId.",
        ),
      );
    else ids.add(source.sourceId);
    if (!ALLOWED_SOURCE_KINDS.has(source.kind))
      findings.push(
        finding("error", "UNSUPPORTED_SOURCE_KIND", `${pointer}/kind`, "Unsupported source kind."),
      );
    if (!isNonEmptyString(source.path))
      findings.push(
        finding("error", "MISSING_SOURCE_PATH", `${pointer}/path`, "Source ref requires a path."),
      );
    validateFingerprint(
      source.fingerprint,
      `${pointer}/fingerprint`,
      findings,
      String(projectRoot),
      "MISSING_SOURCE_FINGERPRINT",
    );
    validateArtifactRef(
      source.artifactRef,
      `${pointer}/artifactRef`,
      findings,
      String(projectRoot),
    );
    validateScope(source.scope, `${pointer}/scope`, findings, String(projectRoot));
    if (!DISCLOSURE_LEVELS.has(source.level))
      findings.push(
        finding(
          "error",
          "UNSUPPORTED_DISCLOSURE_LEVEL",
          `${pointer}/level`,
          "Source disclosure level must be 0-4.",
        ),
      );
    if (typeof source.required !== "boolean")
      findings.push(
        finding(
          "error",
          "INVALID_SOURCE_REF",
          `${pointer}/required`,
          "Source required flag must be boolean.",
        ),
      );
    if (!Array.isArray(source.citations) || source.citations.length === 0)
      findings.push(
        finding(
          "error",
          "MISSING_SOURCE_CITATION",
          `${pointer}/citations`,
          "Source ref requires at least one citation.",
        ),
      );
    if (source.trust !== TRUSTED)
      findings.push(
        finding(
          "error",
          "UNTRUSTED_CONTEXT",
          `${pointer}/trust`,
          "Untrusted source cannot be load-bearing context.",
        ),
      );
    let actual;
    if (isNonEmptyString(source.path)) {
      const sourcePath = resolveProjectPath(projectRoot, source.path);
      if (!(await fileExists(sourcePath))) {
        findings.push(
          finding(
            "error",
            "MISSING_SOURCE_FILE",
            `${pointer}/path`,
            `${source.path}: source file is missing.`,
            { filePath: sourcePath },
          ),
        );
      } else {
        actual = await sha256File(sourcePath);
        if (
          isObject(source.fingerprint) &&
          source.fingerprint.algorithm === "sha256" &&
          isSha256Hex(source.fingerprint.value) &&
          actual !== source.fingerprint.value
        )
          findings.push(
            finding(
              "error",
              "STALE_SOURCE_FINGERPRINT",
              `${pointer}/fingerprint`,
              `${source.path}: fingerprint mismatch.`,
              { filePath: sourcePath, expected: source.fingerprint.value, actual },
            ),
          );
      }
    }
    validateSourceVersionRef(source, pointer, findings, String(projectRoot), actual);
    if (Array.isArray(source.citations)) {
      for (const [citationIndex, citation] of source.citations.entries())
        validateSourceCitation(
          citation,
          source,
          `${pointer}/citations/${citationIndex}`,
          findings,
          String(projectRoot),
          actual,
        );
    }
  }
  return ids;
}

function validateHeaderRefShape(value, pointer, findings, filePath) {
  if (!isObject(value)) {
    findings.push(
      finding(
        "error",
        "MISSING_CONTEXT_HEADER_REF",
        pointer,
        "Context node/index must reference a stable ContextFileHeaderV1 artifact id and path.",
        { filePath },
      ),
    );
    return;
  }
  assertNoUnknownKeys(
    value,
    HEADER_REF_KEYS,
    pointer,
    findings,
    filePath,
    "MISSING_CONTEXT_HEADER_REF",
  );
  if (!isNonEmptyString(value.artifactId) || !isNonEmptyString(value.path))
    findings.push(
      finding(
        "error",
        "MISSING_CONTEXT_HEADER_REF",
        pointer,
        "Context node/index must reference a stable ContextFileHeaderV1 artifact id and path.",
        { filePath },
      ),
    );
}

function validateNodes(graph, sourceIds, findings) {
  const nodeIds = new Set();
  let hasMandatoryLevelOne = false;
  for (const [index, node] of (Array.isArray(graph.nodes) ? graph.nodes : []).entries()) {
    const pointer = `/nodes/${index}`;
    if (!isObject(node)) {
      findings.push(
        finding("error", "INVALID_CONTEXT_NODE", pointer, "Context node must be an object."),
      );
      continue;
    }
    assertNoUnknownKeys(
      node,
      NODE_KEYS,
      pointer,
      findings,
      String(graph.graphId ?? "context_graph"),
      "INVALID_CONTEXT_NODE",
    );
    if (!isNonEmptyString(node.contextId))
      findings.push(
        finding(
          "error",
          "MISSING_CONTEXT_ID",
          `${pointer}/contextId`,
          "Context node requires stable contextId.",
        ),
      );
    else nodeIds.add(node.contextId);
    if (!ALLOWED_NODE_KINDS.has(node.kind))
      findings.push(
        finding(
          "error",
          "UNSUPPORTED_NODE_KIND",
          `${pointer}/kind`,
          "Unsupported context node kind.",
        ),
      );
    validateRequiredString(
      node.areaId,
      `${pointer}/areaId`,
      "INVALID_CONTEXT_NODE",
      "Context node requires areaId.",
      findings,
    );
    validateRequiredString(
      node.title,
      `${pointer}/title`,
      "INVALID_CONTEXT_NODE",
      "Context node requires title.",
      findings,
    );
    validateRequiredString(
      node.owner,
      `${pointer}/owner`,
      "INVALID_CONTEXT_NODE",
      "Context node requires owner.",
      findings,
    );
    validateRequiredString(
      node.artifactPath,
      `${pointer}/artifactPath`,
      "INVALID_CONTEXT_NODE",
      "Context node requires artifactPath.",
      findings,
    );
    validateScope(
      node.scope,
      `${pointer}/scope`,
      findings,
      String(graph.graphId ?? "context_graph"),
      "INVALID_SCOPE",
    );
    if (!DISCLOSURE_LEVELS.has(node.level))
      findings.push(
        finding(
          "error",
          "UNSUPPORTED_DISCLOSURE_LEVEL",
          `${pointer}/level`,
          "Progressive disclosure level must be 0-4.",
        ),
      );
    if (typeof node.mandatory !== "boolean")
      findings.push(
        finding(
          "error",
          "INVALID_CONTEXT_NODE",
          `${pointer}/mandatory`,
          "Context node mandatory flag must be boolean.",
        ),
      );
    if (node.mandatory === true && node.level === 1 && node.trust === TRUSTED)
      hasMandatoryLevelOne = true;
    if (node.mandatory === true && node.trust !== TRUSTED)
      findings.push(
        finding(
          "error",
          "UNTRUSTED_CONTEXT",
          `${pointer}/trust`,
          "Mandatory context must be trusted.",
        ),
      );
    validateStringArray(
      node.sourceRefs,
      `${pointer}/sourceRefs`,
      "MISSING_SOURCE_CITATION",
      "Context node requires source refs.",
      findings,
      { minItems: 1 },
    );
    if (Array.isArray(node.sourceRefs))
      for (const sourceRef of node.sourceRefs)
        if (!sourceIds.has(sourceRef))
          findings.push(
            finding(
              "error",
              "BROKEN_SOURCE_REF",
              `${pointer}/sourceRefs`,
              `Unknown source ref ${sourceRef}.`,
            ),
          );
    validateHeaderRefShape(
      node.headerRef,
      `${pointer}/headerRef`,
      findings,
      String(graph.graphId ?? "context_graph"),
    );
    if (node.derivedFromNodeIds !== undefined)
      validateStringArray(
        node.derivedFromNodeIds,
        `${pointer}/derivedFromNodeIds`,
        "INVALID_CONTEXT_NODE",
        "derivedFromNodeIds must be stable node ids.",
        findings,
      );
  }
  if (!hasMandatoryLevelOne)
    findings.push(
      finding(
        "error",
        "MISSING_MANDATORY_LEVEL_1",
        "/nodes",
        "At least one trusted mandatory Level 1 context node is required.",
      ),
    );
  return nodeIds;
}

function validateEdges(graph, nodeIds, findings) {
  for (const [index, edge] of (Array.isArray(graph.edges) ? graph.edges : []).entries()) {
    const pointer = `/edges/${index}`;
    if (!isObject(edge)) {
      findings.push(finding("error", "INVALID_EDGE", pointer, "Context edge must be an object."));
      continue;
    }
    assertNoUnknownKeys(
      edge,
      EDGE_KEYS,
      pointer,
      findings,
      String(graph.graphId ?? "context_graph"),
      "INVALID_EDGE",
    );
    if (
      !isNonEmptyString(edge.from) ||
      !isNonEmptyString(edge.to) ||
      !nodeIds.has(edge.from) ||
      !nodeIds.has(edge.to)
    )
      findings.push(
        finding(
          "error",
          "BROKEN_CONTEXT_EDGE",
          pointer,
          "Context edge endpoints must reference existing nodes.",
        ),
      );
    if (!ALLOWED_EDGE_RELS.has(edge.rel))
      findings.push(
        finding(
          "error",
          "UNSUPPORTED_EDGE_REL",
          `${pointer}/rel`,
          "Unsupported context edge relation.",
        ),
      );
  }
}

async function validateLinks(projectRoot, graph, findings) {
  for (const [index, link] of (Array.isArray(graph.links) ? graph.links : []).entries()) {
    const pointer = `/links/${index}`;
    if (!isObject(link) || !ALLOWED_LINK_KINDS.has(link.kind)) {
      findings.push(
        finding("error", "INVALID_CONTEXT_LINK", pointer, "Context link kind is invalid."),
      );
      continue;
    }
    assertNoUnknownKeys(
      link,
      LINK_KEYS,
      pointer,
      findings,
      String(projectRoot),
      "INVALID_CONTEXT_LINK",
    );
    validateRequiredString(
      link.linkId,
      `${pointer}/linkId`,
      "INVALID_CONTEXT_LINK",
      "Context link requires stable linkId.",
      findings,
    );
    if (typeof link.required !== "boolean")
      findings.push(
        finding(
          "error",
          "INVALID_CONTEXT_LINK",
          `${pointer}/required`,
          "Context link required flag must be boolean.",
        ),
      );
    validateRequiredString(
      link.statusAtLinkTime,
      `${pointer}/statusAtLinkTime`,
      "INVALID_CONTEXT_LINK",
      "Context link requires statusAtLinkTime.",
      findings,
    );
    if (
      !isObject(link.ref) ||
      !isNonEmptyString(link.ref.artifactKind) ||
      !isNonEmptyString(link.ref.artifactId) ||
      !isNonEmptyString(link.ref.path)
    ) {
      findings.push(
        finding(
          "error",
          "PATH_ONLY_REFERENCE",
          `${pointer}/ref`,
          "Context links require artifactKind, artifactId, and path.",
        ),
      );
      continue;
    }
    assertNoUnknownKeys(
      link.ref,
      LINK_REF_KEYS,
      `${pointer}/ref`,
      findings,
      String(projectRoot),
      "PATH_ONLY_REFERENCE",
    );
    const expectedPrefix =
      link.kind === "work"
        ? ".vibe/work/"
        : link.kind === "evidence"
          ? ".vibe/evidence/"
          : link.kind === "decision"
            ? "docs/decisions/"
            : "";
    if (expectedPrefix && !link.ref.path.startsWith(expectedPrefix))
      findings.push(
        finding(
          "error",
          "MISLINKED_ARTIFACT_PATH",
          `${pointer}/ref/path`,
          `${link.kind} link must point under ${expectedPrefix}.`,
        ),
      );
    const targetPath = resolveProjectPath(projectRoot, link.ref.path);
    if (!(await fileExists(targetPath)))
      findings.push(
        finding(
          "error",
          "BROKEN_CONTEXT_LINK",
          `${pointer}/ref/path`,
          `${link.ref.path}: linked artifact/work/evidence/decision path is missing.`,
          { filePath: targetPath },
        ),
      );
  }
}

function validateUpdateMetadata(value, pointer, findings, filePath) {
  if (!isObject(value)) {
    findings.push(
      finding(
        "error",
        "INVALID_UPDATE_METADATA",
        pointer,
        `${filePath}: updateMetadata must be an object.`,
        { filePath },
      ),
    );
    return;
  }
  assertNoUnknownKeys(
    value,
    UPDATE_METADATA_KEYS,
    pointer,
    findings,
    filePath,
    "INVALID_UPDATE_METADATA",
  );
  validateRequiredString(
    value.invalidationStatus,
    `${pointer}/invalidationStatus`,
    "INVALID_UPDATE_METADATA",
    `${filePath}: updateMetadata requires invalidationStatus.`,
    findings,
  );
}

function validateDriftMetadata(value, pointer, sourceIds, findings, filePath) {
  if (!isObject(value)) {
    findings.push(
      finding(
        "error",
        "INVALID_DRIFT_METADATA",
        pointer,
        `${filePath}: driftMetadata must be an object.`,
        { filePath },
      ),
    );
    return;
  }
  assertNoUnknownKeys(
    value,
    DRIFT_METADATA_KEYS,
    pointer,
    findings,
    filePath,
    "INVALID_DRIFT_METADATA",
  );
  validateRequiredString(
    value.driftStatus,
    `${pointer}/driftStatus`,
    "INVALID_DRIFT_METADATA",
    `${filePath}: driftMetadata requires driftStatus.`,
    findings,
  );
  validateStringArray(
    value.sourceRefs,
    `${pointer}/sourceRefs`,
    "INVALID_DRIFT_METADATA",
    `${filePath}: driftMetadata requires sourceRefs.`,
    findings,
  );
  if (Array.isArray(value.sourceRefs))
    for (const sourceRef of value.sourceRefs)
      if (!sourceIds.has(sourceRef))
        findings.push(
          finding(
            "error",
            "INVALID_DRIFT_METADATA",
            `${pointer}/sourceRefs`,
            `${filePath}: driftMetadata source ref ${sourceRef} is unknown.`,
            { filePath },
          ),
        );
}

function validateContextItem(
  item,
  pointer,
  sourceIds,
  areaSourceRefs,
  sourceCitationIndex,
  findings,
  filePath,
) {
  if (!isObject(item)) {
    findings.push(
      finding(
        "error",
        "INVALID_AREA_CONTEXT_ITEM",
        pointer,
        `${filePath}: context item must be an object.`,
        { filePath },
      ),
    );
    return;
  }
  assertNoUnknownKeys(
    item,
    CONTEXT_ITEM_KEYS,
    pointer,
    findings,
    filePath,
    "INVALID_AREA_CONTEXT_ITEM",
  );
  validateRequiredString(
    item.contextId,
    `${pointer}/contextId`,
    "INVALID_AREA_CONTEXT_ITEM",
    `${filePath}: context item requires contextId.`,
    findings,
  );
  if (!DISCLOSURE_LEVELS.has(item.level))
    findings.push(
      finding(
        "error",
        "INVALID_AREA_CONTEXT_ITEM",
        `${pointer}/level`,
        `${filePath}: context item level must be 0-4.`,
        { filePath },
      ),
    );
  if (typeof item.mandatory !== "boolean")
    findings.push(
      finding(
        "error",
        "INVALID_AREA_CONTEXT_ITEM",
        `${pointer}/mandatory`,
        `${filePath}: context item mandatory must be boolean.`,
        { filePath },
      ),
    );
  const hasText = isNonEmptyString(item.text);
  const hasTypedContent =
    isObject(item.content) &&
    isNonEmptyString(item.content.kind) &&
    item.content.value !== undefined;
  if (!hasText && !hasTypedContent)
    findings.push(
      finding(
        "error",
        "INVALID_AREA_CONTEXT_ITEM",
        `${pointer}/text`,
        `${filePath}: context item requires non-empty text or typed content.`,
        { filePath },
      ),
    );
  const validSourceRefs = validateStringArray(
    item.sourceRefs,
    `${pointer}/sourceRefs`,
    "INVALID_AREA_CONTEXT_ITEM",
    `${filePath}: context item requires stable sourceRefs.`,
    findings,
    { minItems: 1 },
  );
  if (Array.isArray(item.sourceRefs)) {
    for (const sourceRef of item.sourceRefs) {
      if (!sourceIds.has(sourceRef) || !areaSourceRefs.has(sourceRef))
        findings.push(
          finding(
            "error",
            "INVALID_AREA_CONTEXT_ITEM",
            `${pointer}/sourceRefs`,
            `${filePath}: context item source ref ${sourceRef} is unknown or not declared by area.`,
            { filePath },
          ),
        );
    }
  }
  const validCitationRefs = validateStringArray(
    item.citationRefs,
    `${pointer}/citationRefs`,
    "INVALID_AREA_CONTEXT_ITEM",
    `${filePath}: context item requires non-empty citationRefs with stable citation ids.`,
    findings,
    { minItems: 1 },
  );
  if (!validSourceRefs || !validCitationRefs) return;

  const itemSourceRefs = new Set(item.sourceRefs);
  const coveredSourceRefs = new Set();
  for (const [citationIndex, citationRef] of item.citationRefs.entries()) {
    const citationSources = sourceCitationIndex.citationToSourceIds.get(citationRef);
    const citationPointer = `${pointer}/citationRefs/${citationIndex}`;
    if (!citationSources || citationSources.size === 0) {
      findings.push(
        finding(
          "error",
          "INVALID_SOURCE_CITATION",
          citationPointer,
          `${filePath}: citationRef ${citationRef} does not resolve to a graph source citation.`,
          { filePath },
        ),
      );
      continue;
    }
    if (citationSources.size > 1) {
      findings.push(
        finding(
          "error",
          "INVALID_SOURCE_CITATION",
          citationPointer,
          `${filePath}: citationRef ${citationRef} is ambiguous across graph sources.`,
          { filePath },
        ),
      );
      continue;
    }
    const [citationSourceId] = citationSources;
    if (!itemSourceRefs.has(citationSourceId)) {
      findings.push(
        finding(
          "error",
          "INVALID_SOURCE_CITATION",
          citationPointer,
          `${filePath}: citationRef ${citationRef} belongs to source ${citationSourceId}, which is not declared by this context item.`,
          { filePath },
        ),
      );
      continue;
    }
    if (
      !areaSourceRefs.has(citationSourceId) ||
      !sourceIds.has(citationSourceId) ||
      !sourceCitationIndex.trustedSourceIds.has(citationSourceId)
    ) {
      findings.push(
        finding(
          "error",
          "INVALID_SOURCE_CITATION",
          citationPointer,
          `${filePath}: citationRef ${citationRef} does not belong to a known trusted area source.`,
          { filePath },
        ),
      );
      continue;
    }
    coveredSourceRefs.add(citationSourceId);
  }
  for (const sourceRef of itemSourceRefs) {
    if (
      sourceIds.has(sourceRef) &&
      areaSourceRefs.has(sourceRef) &&
      !coveredSourceRefs.has(sourceRef)
    ) {
      findings.push(
        finding(
          "error",
          "INVALID_SOURCE_CITATION",
          `${pointer}/citationRefs`,
          `${filePath}: citationRefs must cover sourceRef ${sourceRef}.`,
          { filePath },
        ),
      );
    }
  }
}

function validateAreaCarrier(carrier, node, sourceIds, sourceCitationIndex, findings, carrierPath) {
  validateCommonCarrier(carrier, "context_area", AREA_KEYS, carrierPath, findings);
  validateRequiredString(
    carrier.areaId,
    "/areaId",
    "INVALID_AREA_CONTEXT",
    `${node.artifactPath}: area requires areaId.`,
    findings,
  );
  validateRequiredString(
    carrier.title,
    "/title",
    "INVALID_AREA_CONTEXT",
    `${node.artifactPath}: area requires title.`,
    findings,
  );
  validateRequiredString(
    carrier.owner,
    "/owner",
    "INVALID_AREA_CONTEXT",
    `${node.artifactPath}: area requires owner.`,
    findings,
  );
  if (!DISCLOSURE_LEVELS.has(carrier.level))
    findings.push(
      finding(
        "error",
        "INVALID_AREA_CONTEXT",
        "/level",
        `${node.artifactPath}: area level must be 0-4.`,
        { filePath: carrierPath },
      ),
    );
  if (typeof carrier.mandatory !== "boolean")
    findings.push(
      finding(
        "error",
        "INVALID_AREA_CONTEXT",
        "/mandatory",
        `${node.artifactPath}: area mandatory must be boolean.`,
        { filePath: carrierPath },
      ),
    );
  validateStringArray(
    carrier.sourceRefs,
    "/sourceRefs",
    "MISSING_SOURCE_CITATION",
    `${node.artifactPath}: area requires source refs.`,
    findings,
    { minItems: 1 },
  );
  const areaSourceRefs = new Set(Array.isArray(carrier.sourceRefs) ? carrier.sourceRefs : []);
  for (const sourceRef of areaSourceRefs)
    if (!sourceIds.has(sourceRef))
      findings.push(
        finding(
          "error",
          "BROKEN_SOURCE_REF",
          "/sourceRefs",
          `${node.artifactPath}: area source ref ${sourceRef} is unknown.`,
          { filePath: carrierPath },
        ),
      );
  if (!Array.isArray(carrier.context)) {
    findings.push(
      finding(
        "error",
        "INVALID_AREA_CONTEXT",
        "/context",
        `${node.artifactPath}: area context must be an array.`,
        { filePath: carrierPath },
      ),
    );
  } else if (carrier.context.length === 0) {
    findings.push(
      finding(
        "error",
        "INVALID_AREA_CONTEXT",
        "/context",
        `${node.artifactPath}: area context must include load-bearing items.`,
        { filePath: carrierPath },
      ),
    );
  } else {
    for (const [index, item] of carrier.context.entries())
      validateContextItem(
        item,
        `/context/${index}`,
        sourceIds,
        areaSourceRefs,
        sourceCitationIndex,
        findings,
        carrierPath,
      );
  }
  validateScope(carrier.scope, "/scope", findings, carrierPath);
  validateUpdateMetadata(carrier.updateMetadata, "/updateMetadata", findings, carrierPath);
  validateDriftMetadata(carrier.driftMetadata, "/driftMetadata", sourceIds, findings, carrierPath);
  if (carrier.schemaRef !== CONTEXT_SCHEMA_IDS.area)
    findings.push(
      finding(
        "error",
        "INVALID_SCHEMA_REFS",
        "/schemaRef",
        `${node.artifactPath}: area schemaRef mismatch.`,
        { filePath: carrierPath },
      ),
    );
}

function validateSummaryCarrier(carrier, node, sourceIds, nodeIds, findings, carrierPath) {
  validateCommonCarrier(carrier, "context_summary", SUMMARY_KEYS, carrierPath, findings);
  validateRequiredString(
    carrier.summaryId,
    "/summaryId",
    "INVALID_CONTEXT_SUMMARY",
    `${node.artifactPath}: summary requires summaryId.`,
    findings,
  );
  validateRequiredString(
    carrier.title,
    "/title",
    "INVALID_CONTEXT_SUMMARY",
    `${node.artifactPath}: summary requires title.`,
    findings,
  );
  validateRequiredString(
    carrier.areaId,
    "/areaId",
    "INVALID_CONTEXT_SUMMARY",
    `${node.artifactPath}: summary requires areaId.`,
    findings,
  );
  validateRequiredString(
    carrier.summary,
    "/summary",
    "INVALID_CONTEXT_SUMMARY",
    `${node.artifactPath}: summary requires text.`,
    findings,
  );
  if (!DISCLOSURE_LEVELS.has(carrier.level))
    findings.push(
      finding(
        "error",
        "INVALID_CONTEXT_SUMMARY",
        "/level",
        `${node.artifactPath}: summary level must be 0-4.`,
        { filePath: carrierPath },
      ),
    );
  if (typeof carrier.mandatory !== "boolean")
    findings.push(
      finding(
        "error",
        "INVALID_CONTEXT_SUMMARY",
        "/mandatory",
        `${node.artifactPath}: summary mandatory must be boolean.`,
        { filePath: carrierPath },
      ),
    );
  if (!Array.isArray(carrier.sourceRefs) || carrier.sourceRefs.length === 0)
    findings.push(
      finding(
        "error",
        "SUMMARY_WITHOUT_SOURCE_REFS",
        "/sourceRefs",
        `${node.artifactPath}: summary requires source refs.`,
        { filePath: carrierPath },
      ),
    );
  if (!Array.isArray(carrier.derivedFromNodeIds) || carrier.derivedFromNodeIds.length === 0)
    findings.push(
      finding(
        "error",
        "SUMMARY_NOT_EXPANDABLE",
        "/derivedFromNodeIds",
        `${node.artifactPath}: summary must expand to source nodes.`,
        { filePath: carrierPath },
      ),
    );
  if (Array.isArray(carrier.sourceRefs))
    for (const sourceRef of carrier.sourceRefs)
      if (!sourceIds.has(sourceRef))
        findings.push(
          finding(
            "error",
            "STALE_SUMMARY_SOURCE_REF",
            "/sourceRefs",
            `${node.artifactPath}: summary source ref ${sourceRef} is stale.`,
            { filePath: carrierPath },
          ),
        );
  if (Array.isArray(carrier.derivedFromNodeIds))
    for (const derivedNodeId of carrier.derivedFromNodeIds)
      if (!nodeIds.has(derivedNodeId))
        findings.push(
          finding(
            "error",
            "SUMMARY_NOT_EXPANDABLE",
            "/derivedFromNodeIds",
            `${node.artifactPath}: summary derived node ${derivedNodeId} is missing.`,
            { filePath: carrierPath },
          ),
        );
  if (
    carrier.mandatory === true &&
    (!Array.isArray(carrier.sourceRefs) || carrier.sourceRefs.length === 0)
  )
    findings.push(
      finding(
        "error",
        "SUMMARY_ONLY_LOAD_BEARING_TRUTH",
        "/mandatory",
        `${node.artifactPath}: mandatory truth cannot be summary-only.`,
        { filePath: carrierPath },
      ),
    );
  validateUpdateMetadata(carrier.updateMetadata, "/updateMetadata", findings, carrierPath);
  validateDriftMetadata(carrier.driftMetadata, "/driftMetadata", sourceIds, findings, carrierPath);
  validateStringArray(
    carrier.expandableToSourceRefs,
    "/expandableToSourceRefs",
    "INVALID_CONTEXT_SUMMARY",
    `${node.artifactPath}: summary requires expandable source refs.`,
    findings,
    { minItems: 1 },
  );
  if (carrier.schemaRef !== CONTEXT_SCHEMA_IDS.summary)
    findings.push(
      finding(
        "error",
        "INVALID_SCHEMA_REFS",
        "/schemaRef",
        `${node.artifactPath}: summary schemaRef mismatch.`,
        { filePath: carrierPath },
      ),
    );
}

function buildSourceCitationIndex(graph) {
  const citationToSourceIds = new Map();
  const sourceToCitationIds = new Map();
  const trustedSourceIds = new Set();
  for (const source of Array.isArray(graph.sources) ? graph.sources : []) {
    if (!isObject(source) || !isNonEmptyString(source.sourceId)) continue;
    if (source.trust === TRUSTED) trustedSourceIds.add(source.sourceId);
    const sourceCitationIds = new Set();
    for (const citation of Array.isArray(source.citations) ? source.citations : []) {
      if (
        !isObject(citation) ||
        !isNonEmptyString(citation.citationId) ||
        citation.sourceId !== source.sourceId
      )
        continue;
      sourceCitationIds.add(citation.citationId);
      if (!citationToSourceIds.has(citation.citationId))
        citationToSourceIds.set(citation.citationId, new Set());
      citationToSourceIds.get(citation.citationId).add(source.sourceId);
    }
    sourceToCitationIds.set(source.sourceId, sourceCitationIds);
  }
  return { citationToSourceIds, sourceToCitationIds, trustedSourceIds };
}

async function validateAreaAndSummaryFiles(
  projectRoot,
  graph,
  sourceIds,
  sourceCitationIndex,
  nodeIds,
  findings,
) {
  for (const node of Array.isArray(graph.nodes) ? graph.nodes : []) {
    if (!isObject(node) || typeof node.artifactPath !== "string") continue;
    const carrierPath = resolveProjectPath(projectRoot, node.artifactPath);
    const carrier = await readJsonCarrier(
      carrierPath,
      node.kind === "summary" ? "context_summary" : "context_area",
      findings,
    );
    if (!carrier) continue;
    if (node.kind === "summary")
      validateSummaryCarrier(carrier, node, sourceIds, nodeIds, findings, carrierPath);
    else validateAreaCarrier(carrier, node, sourceIds, sourceCitationIndex, findings, carrierPath);
  }
}

function validateIndexRefs(index, graph, nodeIds, sourceIds, findings, filePath) {
  if (!isObject(index.graphRef)) {
    findings.push(
      finding(
        "error",
        "INVALID_GRAPH_REF",
        "/graphRef",
        `${filePath}: index graphRef must be an object.`,
        { filePath },
      ),
    );
  } else {
    assertNoUnknownKeys(
      index.graphRef,
      INDEX_GRAPH_REF_KEYS,
      "/graphRef",
      findings,
      filePath,
      "INVALID_GRAPH_REF",
    );
    if (
      index.graphRef.graphId !== graph.graphId ||
      !isNonEmptyString(index.graphRef.path) ||
      !isNonEmptyString(index.graphRef.headerPath)
    )
      findings.push(
        finding(
          "error",
          "INVALID_GRAPH_REF",
          "/graphRef",
          `${filePath}: index graphRef must carry matching graphId, path, and headerPath.`,
          { filePath },
        ),
      );
  }
  validateHeaderRefShape(index.headerRef, "/headerRef", findings, filePath);
  for (const [refIndex, nodeRef] of (Array.isArray(index.nodeRefs)
    ? index.nodeRefs
    : []
  ).entries()) {
    const pointer = `/nodeRefs/${refIndex}`;
    if (!isObject(nodeRef)) {
      findings.push(
        finding("error", "INVALID_NODE_REFS", pointer, `${filePath}: nodeRef must be an object.`, {
          filePath,
        }),
      );
      continue;
    }
    assertNoUnknownKeys(
      nodeRef,
      INDEX_NODE_REF_KEYS,
      pointer,
      findings,
      filePath,
      "INVALID_NODE_REFS",
    );
    if (!isNonEmptyString(nodeRef.contextId) || !nodeIds.has(nodeRef.contextId))
      findings.push(
        finding(
          "error",
          "INVALID_NODE_REFS",
          `${pointer}/contextId`,
          `${filePath}: nodeRef contextId must reference graph node.`,
          { filePath },
        ),
      );
    validateRequiredString(
      nodeRef.areaId,
      `${pointer}/areaId`,
      "INVALID_NODE_REFS",
      `${filePath}: nodeRef requires areaId.`,
      findings,
    );
    if (!DISCLOSURE_LEVELS.has(nodeRef.level))
      findings.push(
        finding(
          "error",
          "INVALID_NODE_REFS",
          `${pointer}/level`,
          `${filePath}: nodeRef level must be 0-4.`,
          { filePath },
        ),
      );
    if (typeof nodeRef.mandatory !== "boolean")
      findings.push(
        finding(
          "error",
          "INVALID_NODE_REFS",
          `${pointer}/mandatory`,
          `${filePath}: nodeRef mandatory must be boolean.`,
          { filePath },
        ),
      );
    validateRequiredString(
      nodeRef.path,
      `${pointer}/path`,
      "INVALID_NODE_REFS",
      `${filePath}: nodeRef requires path.`,
      findings,
    );
    validateRequiredString(
      nodeRef.headerPath,
      `${pointer}/headerPath`,
      "INVALID_NODE_REFS",
      `${filePath}: nodeRef requires headerPath.`,
      findings,
    );
    validateStringArray(
      nodeRef.sourceRefs,
      `${pointer}/sourceRefs`,
      "INVALID_NODE_REFS",
      `${filePath}: nodeRef requires sourceRefs.`,
      findings,
      { minItems: 1 },
    );
    if (Array.isArray(nodeRef.sourceRefs))
      for (const sourceRef of nodeRef.sourceRefs)
        if (!sourceIds.has(sourceRef))
          findings.push(
            finding(
              "error",
              "INVALID_NODE_REFS",
              `${pointer}/sourceRefs`,
              `${filePath}: nodeRef source ref ${sourceRef} is unknown.`,
              { filePath },
            ),
          );
  }
  for (const [refIndex, sourceRef] of (Array.isArray(index.sourceRefs)
    ? index.sourceRefs
    : []
  ).entries()) {
    const pointer = `/sourceRefs/${refIndex}`;
    if (!isObject(sourceRef)) {
      findings.push(
        finding(
          "error",
          "INVALID_SOURCE_REFS",
          pointer,
          `${filePath}: sourceRef must be an object.`,
          { filePath },
        ),
      );
      continue;
    }
    assertNoUnknownKeys(
      sourceRef,
      INDEX_SOURCE_REF_KEYS,
      pointer,
      findings,
      filePath,
      "INVALID_SOURCE_REFS",
    );
    if (!isNonEmptyString(sourceRef.sourceId) || !sourceIds.has(sourceRef.sourceId))
      findings.push(
        finding(
          "error",
          "INVALID_SOURCE_REFS",
          `${pointer}/sourceId`,
          `${filePath}: sourceRef sourceId must reference graph source.`,
          { filePath },
        ),
      );
    validateRequiredString(
      sourceRef.path,
      `${pointer}/path`,
      "INVALID_SOURCE_REFS",
      `${filePath}: sourceRef requires path.`,
      findings,
    );
    validateFingerprint(
      sourceRef.fingerprint,
      `${pointer}/fingerprint`,
      findings,
      filePath,
      "INVALID_SOURCE_REFS",
    );
  }
  if (index.schemaRef !== CONTEXT_SCHEMA_IDS.index)
    findings.push(
      finding(
        "error",
        "INVALID_SCHEMA_REFS",
        "/schemaRef",
        `${filePath}: index schemaRef mismatch.`,
        { filePath },
      ),
    );
}

async function validateAllHeaders(projectRoot, graph, index, findings) {
  await validateHeader(projectRoot, index.headerRef, findings, "/headerRef");
  if (isObject(index.graphRef))
    await validateHeader(
      projectRoot,
      { artifactId: "ctx-index-graph", path: index.graphRef.headerPath },
      findings,
      "/graphRef/headerPath",
    );
  for (const [indexNumber, node] of (Array.isArray(graph.nodes) ? graph.nodes : []).entries())
    await validateHeader(
      projectRoot,
      isObject(node) ? node.headerRef : undefined,
      findings,
      `/nodes/${indexNumber}/headerRef`,
    );
}

export async function validateContextProject(projectRoot, options = {}) {
  const resolvedRoot = path.resolve(projectRoot);
  const findings = [];
  const graphPath = resolveProjectPath(
    resolvedRoot,
    options.graphPath ?? contextPath("index", "context-graph.json"),
  );
  const indexPath = resolveProjectPath(
    resolvedRoot,
    options.indexPath ?? contextPath("index", "context-index.json"),
  );
  const graph = await readJsonCarrier(graphPath, "context_graph", findings);
  const index = await readJsonCarrier(indexPath, "context_index", findings);
  if (!graph || !index)
    return failResult(findings, { projectRoot: resolvedRoot, graphPath, indexPath });
  if (!isObject(graph))
    findings.push(
      finding("error", "NOT_OBJECT", "", `${graphPath}: context graph carrier must be an object.`, {
        filePath: graphPath,
        artifactKind: "context_graph",
      }),
    );
  if (!isObject(index))
    findings.push(
      finding("error", "NOT_OBJECT", "", `${indexPath}: context index carrier must be an object.`, {
        filePath: indexPath,
        artifactKind: "context_index",
      }),
    );
  if (!isObject(graph) || !isObject(index))
    return failResult(findings, { projectRoot: resolvedRoot, graphPath, indexPath });
  validateGraphShape(graph, graphPath, findings);
  validateIndexShape(index, indexPath, findings);
  if (isObject(index.graphRef) && index.graphRef.graphId !== graph.graphId)
    findings.push(
      finding(
        "error",
        "MISLINKED_GRAPH_INDEX",
        "/graphRef/graphId",
        "Context index graphRef does not match graph graphId.",
        { filePath: indexPath },
      ),
    );
  const sourceIds = await validateSources(resolvedRoot, graph, findings);
  const sourceCitationIndex = buildSourceCitationIndex(graph);
  const nodeIds = validateNodes(graph, sourceIds, findings);
  validateIndexRefs(index, graph, nodeIds, sourceIds, findings, indexPath);
  validateEdges(graph, nodeIds, findings);
  await validateLinks(resolvedRoot, graph, findings);
  await validateAreaAndSummaryFiles(
    resolvedRoot,
    graph,
    sourceIds,
    sourceCitationIndex,
    nodeIds,
    findings,
  );
  await validateAllHeaders(resolvedRoot, graph, index, findings);
  return findings.length === 0
    ? cleanResult({ projectRoot: resolvedRoot, graphPath, indexPath, graph, index })
    : failResult(findings, { projectRoot: resolvedRoot, graphPath, indexPath, graph, index });
}

export async function checkContextDrift(projectRoot, options = {}) {
  return validateContextProject(projectRoot, options);
}

function validateRetrievalRequest(request) {
  const findings = [];
  if (!isObject(request)) {
    findings.push(
      finding("error", "INVALID_RETRIEVAL_REQUEST", "", "Retrieval request must be an object."),
    );
    return findings;
  }
  if (request.loadEverything === true)
    findings.push(
      finding(
        "error",
        "LOAD_EVERYTHING_REQUEST",
        "/loadEverything",
        "Retrieval must be scoped; load-everything requests are rejected.",
      ),
    );
  if (!isObject(request.task))
    findings.push(
      finding("error", "MISSING_TASK_SCOPE", "/task", "Retrieval requires task scope."),
    );
  else {
    if (typeof request.task.taskId !== "string")
      findings.push(
        finding("error", "MISSING_TASK_SCOPE", "/task/taskId", "Task scope requires taskId."),
      );
    if (typeof request.task.role !== "string")
      findings.push(
        finding("error", "MISSING_TASK_SCOPE", "/task/role", "Task scope requires role."),
      );
    if (!Array.isArray(request.task.affectedAreas) || request.task.affectedAreas.length === 0)
      findings.push(
        finding(
          "error",
          "MISSING_TASK_SCOPE",
          "/task/affectedAreas",
          "Task scope requires affectedAreas.",
        ),
      );
  }
  if (
    request.domainAssumption &&
    isObject(request.domainAssumption) &&
    request.domainAssumption.authority !== "explicit-project-extension"
  )
    findings.push(
      finding(
        "error",
        "UNSAFE_INFERRED_DOMAIN_CONTEXT",
        "/domainAssumption",
        "Domain-specific roadmap/default context must be explicit project extension, not inferred core default.",
      ),
    );
  return findings;
}

async function collectAreaCitationRefsForNode(projectRoot, node) {
  if (node.kind !== "area") return [];
  const carrier = await readJson(resolveProjectPath(projectRoot, node.artifactPath));
  const citationRefs = [];
  for (const item of Array.isArray(carrier.context) ? carrier.context : []) {
    if (Array.isArray(item.citationRefs))
      citationRefs.push(...item.citationRefs.filter(isNonEmptyString));
  }
  return unique(citationRefs);
}

export async function retrieveContextClosure(projectRoot, request, options = {}) {
  const requestFindings = validateRetrievalRequest(request);
  if (requestFindings.length > 0) {
    return {
      ok: false,
      blocked: true,
      status: "blocked",
      schemaVersion: CONTEXT_SCHEMA_VERSION,
      artifactKind: "context_retrieval_closure",
      findings: requestFindings,
      diagnostics: requestFindings,
      levels: emptyLevels(),
      citations: [],
      omittedOptionalContext: [],
    };
  }
  const validation = await validateContextProject(projectRoot, options);
  const maxLevel = request.maxLevel ?? 4;
  const graph = validation.graph;
  if (!validation.ok) {
    return {
      ok: false,
      blocked: true,
      status: "blocked",
      schemaVersion: CONTEXT_SCHEMA_VERSION,
      artifactKind: "context_retrieval_closure",
      findings: validation.findings,
      diagnostics: validation.findings,
      levels: emptyLevels(),
      citations: [],
      omittedOptionalContext: [],
    };
  }
  const affected = new Set(request.task.affectedAreas);
  const nodes = graph.nodes.filter(
    (node) =>
      affected.has(node.areaId) ||
      affected.has(node.contextId) ||
      request.task.affectedAreas.includes("*"),
  );
  const selected = nodes.filter((node) => node.level <= maxLevel);
  const mandatoryLevelOne = selected.filter(
    (node) => node.level === 1 && node.mandatory === true && node.trust === TRUSTED,
  );
  const findings = [];
  if (mandatoryLevelOne.length === 0)
    findings.push(
      finding(
        "error",
        "MISSING_MANDATORY_LEVEL_1",
        "/closure/levels/1",
        "Task closure is blocked because mandatory Level 1 context is missing.",
      ),
    );
  const levels = emptyLevels();
  for (const node of selected) {
    const closureItem = {
      contextId: node.contextId,
      title: node.title,
      level: node.level,
      mandatory: node.mandatory,
      areaId: node.areaId,
      sourceRefs: node.sourceRefs,
      artifactPath: node.artifactPath,
    };
    const citationRefs = await collectAreaCitationRefsForNode(projectRoot, node);
    if (citationRefs.length > 0) closureItem.citationRefs = citationRefs;
    levels[String(node.level)].push(closureItem);
  }
  const citations = [];
  const sourceById = new Map(graph.sources.map((source) => [source.sourceId, source]));
  for (const node of selected) {
    for (const sourceRef of node.sourceRefs) {
      const source = sourceById.get(sourceRef);
      if (source)
        citations.push(
          ...source.citations.map((citation) => ({ ...citation, contextId: node.contextId })),
        );
    }
  }
  const omittedOptionalContext = nodes
    .filter((node) => node.mandatory !== true && node.level > maxLevel)
    .map((node) => ({
      contextId: node.contextId,
      level: node.level,
      rationale: `Optional level ${node.level} context omitted by maxLevel ${maxLevel}.`,
    }));
  const blocked = findings.length > 0;
  return {
    ok: !blocked,
    blocked,
    status: blocked ? "blocked" : "clean",
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    artifactKind: "context_retrieval_closure",
    closureId: `closure:${request.task.taskId}`,
    task: request.task,
    levels,
    citations: dedupeCitations(citations),
    omittedOptionalContext,
    diagnostics: findings,
    findings,
    schemaRef: CONTEXT_SCHEMA_IDS.retrievalClosure,
  };
}

function emptyLevels() {
  return { 0: [], 1: [], 2: [], 3: [], 4: [] };
}

function dedupeCitations(citations) {
  const seen = new Set();
  const result = [];
  for (const citation of citations) {
    const key = `${citation.contextId}|${citation.citationId}|${citation.path}|${citation.fingerprint?.value}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(citation);
    }
  }
  return result;
}

export function classifyFindings(findings) {
  if (!Array.isArray(findings) || findings.length === 0) return "clean";
  return findings.some((item) => item.blocking) ? "major-local" : "minor-local";
}

export const __providerSeams = Object.freeze({
  artifactsValidateArtifactFileType: typeof validateArtifactFile,
});
