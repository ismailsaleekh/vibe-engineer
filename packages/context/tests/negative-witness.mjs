import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateArtifactFile } from "@vibe-engineer/artifacts";
import {
  retrieveContextClosure,
  validateContextProject,
  writeContextProject,
} from "@vibe-engineer/context";

const defaultRunRoot = await mkdtemp(path.join(os.tmpdir(), "vibe-context-negative-"));
const runRoot = path.resolve(process.env.VIBE_CONTEXT_WITNESS_ROOT ?? defaultRunRoot);
const evidencePath = path.resolve(
  process.env.VIBE_CONTEXT_EVIDENCE_PATH ??
    path.join(runRoot, "evidence", "negative-witness-result.json"),
);
const negativeRoot = path.join(runRoot, "negative-projects");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createCase(name) {
  const projectRoot = path.join(negativeRoot, name);
  await rm(projectRoot, { recursive: true, force: true });
  await writeContextProject({ projectRoot, reset: true, generatedAt: "2026-06-24T00:00:00.000Z" });
  return projectRoot;
}

async function expectCodes(name, mutate, expectedCodes) {
  const projectRoot = await createCase(name);
  await mutate(projectRoot);
  const result = await validateContextProject(projectRoot);
  const codes = new Set(result.findings.map((finding) => finding.code));
  for (const code of expectedCodes)
    assert(codes.has(code), `${name}: expected code ${code}, got ${[...codes].join(",")}`);
  assert(result.ok === false, `${name}: negative witness unexpectedly passed`);
  const retrieval = await retrieveContextClosure(projectRoot, {
    task: { taskId: `task:${name}`, role: "validator", affectedAreas: ["core-contracts"] },
    maxLevel: 4,
  });
  const retrievalCodes = new Set(retrieval.findings.map((finding) => finding.code));
  assert(
    retrieval.blocked === true && retrieval.ok === false,
    `${name}: retriever did not block malformed context`,
  );
  for (const code of expectedCodes)
    assert(
      retrievalCodes.has(code),
      `${name}: retriever expected code ${code}, got ${[...retrievalCodes].join(",")}`,
    );
  return {
    name,
    ok: false,
    expectedCodes,
    actualCodes: [...codes].sort(),
    retrievalCodes: [...retrievalCodes].sort(),
  };
}

async function mutateGraph(projectRoot, mutate) {
  const graphPath = path.join(projectRoot, ".vibe/context/index/context-graph.json");
  const graph = await readJson(graphPath);
  mutate(graph);
  await writeJson(graphPath, graph);
}

async function mutateIndex(projectRoot, mutate) {
  const indexPath = path.join(projectRoot, ".vibe/context/index/context-index.json");
  const index = await readJson(indexPath);
  mutate(index);
  await writeJson(indexPath, index);
}

async function mutateArea(projectRoot, mutate) {
  const areaPath = path.join(projectRoot, ".vibe/context/areas/core-contracts.context.json");
  const area = await readJson(areaPath);
  mutate(area);
  await writeJson(areaPath, area);
}

async function mutateSummary(projectRoot, mutate) {
  const summaryPath = path.join(
    projectRoot,
    ".vibe/context/summaries/core-contracts-summary.summary.json",
  );
  const summary = await readJson(summaryPath);
  mutate(summary);
  await writeJson(summaryPath, summary);
}

await rm(negativeRoot, { recursive: true, force: true });
await mkdir(path.dirname(evidencePath), { recursive: true });

const results = [];
results.push(
  await expectCodes(
    "stale-source-fingerprint",
    async (projectRoot) => {
      await writeFile(
        path.join(projectRoot, "sources/task-contract.md"),
        "# Changed Source\n",
        "utf8",
      );
    },
    ["STALE_SOURCE_FINGERPRINT", "STALE_SOURCE_VERSION_REF", "INVALID_SOURCE_CITATION"],
  ),
);

results.push(
  await expectCodes(
    "stale-source-version-ref-matching-content-fingerprint",
    async (projectRoot) => {
      await mutateGraph(projectRoot, (graph) => {
        graph.sources[0].versionRef = `sha256:${"0".repeat(64)}`;
      });
    },
    ["STALE_SOURCE_VERSION_REF"],
  ),
);

results.push(
  await expectCodes(
    "missing-source-version-ref",
    async (projectRoot) => {
      await mutateGraph(projectRoot, (graph) => {
        delete graph.sources[0].versionRef;
      });
    },
    ["INVALID_SOURCE_VERSION_REF"],
  ),
);

results.push(
  await expectCodes(
    "invalid-source-version-ref-shape",
    async (projectRoot) => {
      await mutateGraph(projectRoot, (graph) => {
        graph.sources[0].versionRef = "floating-main";
      });
    },
    ["INVALID_SOURCE_VERSION_REF"],
  ),
);

results.push(
  await expectCodes(
    "malformed-source-citation-object",
    async (projectRoot) => {
      await mutateGraph(projectRoot, (graph) => {
        graph.sources[0].citations = [{}];
      });
    },
    ["INVALID_SOURCE_CITATION"],
  ),
);

results.push(
  await expectCodes(
    "citation-fingerprint-mismatch",
    async (projectRoot) => {
      await mutateGraph(projectRoot, (graph) => {
        graph.sources[0].citations[0].fingerprint.value = `${"1".repeat(64)}`;
      });
    },
    ["INVALID_SOURCE_CITATION"],
  ),
);

results.push(
  await expectCodes(
    "citation-source-path-mismatch",
    async (projectRoot) => {
      await mutateGraph(projectRoot, (graph) => {
        graph.sources[0].citations[0].sourceId = "src:other";
        graph.sources[0].citations[0].path = "wrong.md";
      });
    },
    ["INVALID_SOURCE_CITATION"],
  ),
);

results.push(
  await expectCodes(
    "wrong-shaped-area-context-non-array",
    async (projectRoot) => {
      await mutateArea(projectRoot, (area) => {
        area.context = { contextId: "bad" };
      });
    },
    ["INVALID_AREA_CONTEXT"],
  ),
);

for (const [name, mutateItem] of [
  ["wrong-shaped-area-context-empty-object", (item) => Object.assign(item, {})],
  [
    "area-context-missing-context-id",
    (item) => {
      delete item.contextId;
    },
  ],
  [
    "area-context-missing-level",
    (item) => {
      delete item.level;
    },
  ],
  [
    "area-context-missing-mandatory",
    (item) => {
      delete item.mandatory;
    },
  ],
  [
    "area-context-missing-text",
    (item) => {
      delete item.text;
    },
  ],
  [
    "area-context-missing-source-refs",
    (item) => {
      delete item.sourceRefs;
    },
  ],
  [
    "area-context-missing-citation-refs",
    (item) => {
      delete item.citationRefs;
    },
  ],
  [
    "area-context-empty-citation-refs",
    (item) => {
      item.citationRefs = [];
    },
  ],
  [
    "area-context-non-array-citation-refs",
    (item) => {
      item.citationRefs = "src:task-contract:sha256";
    },
  ],
  [
    "area-context-non-string-citation-ref-entry",
    (item) => {
      item.citationRefs = [42];
    },
  ],
  [
    "area-context-empty-string-citation-ref-entry",
    (item) => {
      item.citationRefs = [""];
    },
  ],
]) {
  results.push(
    await expectCodes(
      name,
      async (projectRoot) => {
        await mutateArea(projectRoot, (area) => {
          area.context =
            name === "wrong-shaped-area-context-empty-object" ? [{}] : [{ ...area.context[0] }];
          mutateItem(area.context[0]);
        });
      },
      ["INVALID_AREA_CONTEXT_ITEM"],
    ),
  );
}

results.push(
  await expectCodes(
    "area-context-unresolved-citation-ref",
    async (projectRoot) => {
      await mutateArea(projectRoot, (area) => {
        area.context[0].citationRefs = ["missing-citation-id"];
      });
    },
    ["INVALID_SOURCE_CITATION"],
  ),
);

results.push(
  await expectCodes(
    "area-context-citation-ref-wrong-source",
    async (projectRoot) => {
      const graph = await readJson(
        path.join(projectRoot, ".vibe/context/index/context-graph.json"),
      );
      await mutateArea(projectRoot, (area) => {
        area.context[0].citationRefs = [graph.sources[1].citations[0].citationId];
      });
    },
    ["INVALID_SOURCE_CITATION"],
  ),
);

results.push(
  await expectCodes(
    "area-context-multiple-source-refs-incomplete-citation-coverage",
    async (projectRoot) => {
      const graph = await readJson(
        path.join(projectRoot, ".vibe/context/index/context-graph.json"),
      );
      await mutateArea(projectRoot, (area) => {
        area.sourceRefs = graph.sources.map((source) => source.sourceId);
        area.driftMetadata.sourceRefs = graph.sources.map((source) => source.sourceId);
        area.context[0].sourceRefs = graph.sources.map((source) => source.sourceId);
        area.context[0].citationRefs = [graph.sources[0].citations[0].citationId];
      });
    },
    ["INVALID_SOURCE_CITATION"],
  ),
);

results.push(
  await expectCodes(
    "unsupported-context-version",
    async (projectRoot) => {
      await mutateGraph(projectRoot, (graph) => {
        graph.schemaVersion = "9.0.0";
      });
    },
    ["UNSUPPORTED_CONTEXT_VERSION"],
  ),
);

results.push(
  await expectCodes(
    "unsupported-index-version",
    async (projectRoot) => {
      await mutateIndex(projectRoot, (index) => {
        index.indexVersion = "9.0.0";
      });
    },
    ["UNSUPPORTED_INDEX_VERSION"],
  ),
);

results.push(
  await expectCodes(
    "missing-source-citation",
    async (projectRoot) => {
      await mutateGraph(projectRoot, (graph) => {
        graph.sources[0].citations = [];
      });
    },
    ["MISSING_SOURCE_CITATION"],
  ),
);

results.push(
  await expectCodes(
    "missing-source-file",
    async (projectRoot) => {
      await rm(path.join(projectRoot, "sources/task-contract.md"), { force: true });
    },
    ["MISSING_SOURCE_FILE"],
  ),
);

results.push(
  await expectCodes(
    "broken-evidence-link",
    async (projectRoot) => {
      await mutateGraph(projectRoot, (graph) => {
        graph.links[1].ref.path = ".vibe/evidence/I-08-context-graph-index-drift/missing.json";
      });
    },
    ["BROKEN_CONTEXT_LINK"],
  ),
);

results.push(
  await expectCodes(
    "broken-decision-link",
    async (projectRoot) => {
      await mutateGraph(projectRoot, (graph) => {
        graph.links[2].ref.path = "docs/decisions/missing-dl.md";
      });
    },
    ["BROKEN_CONTEXT_LINK"],
  ),
);

results.push(
  await expectCodes(
    "mislinked-work-path",
    async (projectRoot) => {
      await mutateGraph(projectRoot, (graph) => {
        graph.links[0].ref.path = "wrong/work-location.json";
      });
    },
    ["MISLINKED_ARTIFACT_PATH", "BROKEN_CONTEXT_LINK"],
  ),
);

results.push(
  await expectCodes(
    "malformed-graph-json",
    async (projectRoot) => {
      await writeFile(
        path.join(projectRoot, ".vibe/context/index/context-graph.json"),
        "{ not-json",
        "utf8",
      );
    },
    ["MALFORMED_JSON"],
  ),
);

results.push(
  await expectCodes(
    "malformed-index-json",
    async (projectRoot) => {
      await writeFile(
        path.join(projectRoot, ".vibe/context/index/context-index.json"),
        "{ not-json",
        "utf8",
      );
    },
    ["MALFORMED_JSON"],
  ),
);

results.push(
  await expectCodes(
    "malformed-context-header-json",
    async (projectRoot) => {
      await writeFile(
        path.join(projectRoot, ".vibe/context/areas/core-contracts.header.json"),
        "{ not-json",
        "utf8",
      );
    },
    ["INVALID_CONTEXT_HEADER"],
  ),
);

results.push(
  await expectCodes(
    "invalid-context-header",
    async (projectRoot) => {
      const headerPath = path.join(projectRoot, ".vibe/context/areas/core-contracts.header.json");
      const header = await readJson(headerPath);
      delete header.producer;
      await writeJson(headerPath, header);
      const providerResult = validateArtifactFile(headerPath, { kind: "context_file_header" });
      assert(
        providerResult.ok === false,
        "public artifacts provider unexpectedly accepted invalid ContextFileHeaderV1",
      );
    },
    ["INVALID_CONTEXT_HEADER"],
  ),
);

results.push(
  await expectCodes(
    "summary-without-source-refs",
    async (projectRoot) => {
      await mutateSummary(projectRoot, (summary) => {
        summary.sourceRefs = [];
        summary.expandableToSourceRefs = [];
        summary.mandatory = true;
      });
    },
    ["SUMMARY_WITHOUT_SOURCE_REFS", "SUMMARY_ONLY_LOAD_BEARING_TRUTH"],
  ),
);

results.push(
  await expectCodes(
    "stale-summary-ref",
    async (projectRoot) => {
      await mutateSummary(projectRoot, (summary) => {
        summary.sourceRefs = ["src:missing"];
      });
    },
    ["STALE_SUMMARY_SOURCE_REF"],
  ),
);

results.push(
  await expectCodes(
    "missing-mandatory-level-one",
    async (projectRoot) => {
      await mutateGraph(projectRoot, (graph) => {
        graph.nodes = graph.nodes.filter((node) => !(node.level === 1 && node.mandatory === true));
      });
    },
    ["MISSING_MANDATORY_LEVEL_1"],
  ),
);

results.push(
  await expectCodes(
    "path-only-source-ref",
    async (projectRoot) => {
      await mutateGraph(projectRoot, (graph) => {
        delete graph.sources[0].artifactRef.artifactId;
      });
    },
    ["PATH_ONLY_REFERENCE"],
  ),
);

results.push(
  await expectCodes(
    "path-only-link-ref",
    async (projectRoot) => {
      await mutateGraph(projectRoot, (graph) => {
        delete graph.links[0].ref.artifactId;
      });
    },
    ["PATH_ONLY_REFERENCE"],
  ),
);

const retrievalLoadEverything = await retrieveContextClosure(
  await createCase("load-everything-request"),
  { loadEverything: true },
);
assert(
  retrievalLoadEverything.blocked === true,
  "load-everything retrieval request was not blocked",
);
assert(
  retrievalLoadEverything.findings.some((finding) => finding.code === "LOAD_EVERYTHING_REQUEST"),
  "load-everything finding missing",
);
assert(
  retrievalLoadEverything.findings.some((finding) => finding.code === "MISSING_TASK_SCOPE"),
  "missing task scope finding missing",
);
results.push({
  name: "load-everything-request",
  ok: false,
  expectedCodes: ["LOAD_EVERYTHING_REQUEST", "MISSING_TASK_SCOPE"],
  actualCodes: retrievalLoadEverything.findings.map((finding) => finding.code),
});

const retrievalUnsafeDomain = await retrieveContextClosure(
  await createCase("unsafe-domain-request"),
  {
    task: { taskId: "task:unsafe-domain", role: "implementer", affectedAreas: ["core-contracts"] },
    domainAssumption: {
      authority: "inferred-core-default",
      label: "forbidden-domain-leak-example",
    },
  },
);
assert(retrievalUnsafeDomain.blocked === true, "unsafe inferred domain request was not blocked");
assert(
  retrievalUnsafeDomain.findings.some(
    (finding) => finding.code === "UNSAFE_INFERRED_DOMAIN_CONTEXT",
  ),
  "unsafe domain finding missing",
);
results.push({
  name: "unsafe-domain-request",
  ok: false,
  expectedCodes: ["UNSAFE_INFERRED_DOMAIN_CONTEXT"],
  actualCodes: retrievalUnsafeDomain.findings.map((finding) => finding.code),
});

const retrievalMissingLevelOneRoot = await createCase("retriever-missing-level-one");
await mutateGraph(retrievalMissingLevelOneRoot, (graph) => {
  graph.nodes = graph.nodes.filter((node) => node.level !== 1);
});
const retrievalMissingLevelOne = await retrieveContextClosure(retrievalMissingLevelOneRoot, {
  task: { taskId: "task:missing-l1", role: "implementer", affectedAreas: ["core-contracts"] },
});
assert(
  retrievalMissingLevelOne.blocked === true,
  "retriever did not block missing Level 1 context",
);
assert(
  retrievalMissingLevelOne.findings.some((finding) => finding.code === "MISSING_MANDATORY_LEVEL_1"),
  "retriever missing Level 1 finding missing",
);
results.push({
  name: "retriever-missing-level-one",
  ok: false,
  expectedCodes: ["MISSING_MANDATORY_LEVEL_1"],
  actualCodes: retrievalMissingLevelOne.findings.map((finding) => finding.code),
});

const evidence = { ok: true, runRoot, evidencePath, negativeWitnesses: results };
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(`negative witness ok: ${evidencePath}`);
