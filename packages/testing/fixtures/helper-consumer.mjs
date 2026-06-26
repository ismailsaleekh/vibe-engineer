import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";

import {
  assertBlockingFinding,
  assertOkResult,
  createEphemeralWorkspace,
  normalizeForSnapshot
} from "@vibe-engineer/testing";

const workspace = await createEphemeralWorkspace({ prefix: "vibe-helper-consumer-" });
try {
  const written = await workspace.writeFile("fixtures/sample.txt", "stable helper witness\n");
  const text = await readFile(written, "utf8");
  assert.equal(text, "stable helper witness\n");

  const okResult = assertOkResult({ ok: true, findings: [] }, "synthetic typed helper result");
  assert.equal(okResult.ok, true);

  const blocking = assertBlockingFinding({
    ok: false,
    findings: [{ ruleId: "example.blocking", blocking: true, evidence: { path: written } }]
  }, "example.blocking", "synthetic typed helper failure");
  assert.equal(blocking.ruleId, "example.blocking");

  const normalized = normalizeForSnapshot({ path: written });
  assert.equal(typeof normalized.path, "string");

  console.log(JSON.stringify({ ok: true, helperPackage: "@vibe-engineer/testing", workspaceRoot: workspace.root }));
} finally {
  await workspace.dispose();
}
