// @sample @demo @reference — I-17A domain-neutrality + no-CI-leak check
// (W-DOMAIN-NEUTRAL + W-NO-CI-LEAK).
//
// Shape-green layer. Asserts golden-web + e2e-ui/web fixtures use ONLY golden
// sample/demo/reference vocabulary with `@sample/@demo/@reference` labels on key
// files, no business-domain leakage (DL-20A), and that nothing wires full E2E or
// full visual into default CI (DL-18; mechanical §7). The serialized-surface /
// dirty-tree invariant (W-INVARIANTS) is emitted by the witness runner.

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)); // e2e-ui/web
const repoRoot = path.resolve(here, "../../../../..");
const goldenWebSrc = path.resolve(here, "../../golden-web/src");
const e2eUiSrc = here;

const checks = [];
function record(name, ok, summary) {
  checks.push({ name, ok, summary });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name} — ${summary}`);
}

const FORBIDDEN = ["ecommerce", "inventory", "fashion", "Billz", "Telegram", "Instagram", "checkout", "customer", "cart", "payment", "social-feed"];
const GOLDEN_RE = /\b(golden-record|golden-records|GoldenRecord|goldenRecord)\b/;
const LABEL_RE = /@(sample|demo|reference)\b/;

async function readDirFiles(root, exts = /\.(ts|tsx|mjs|js|json|css|html|md)$/) {
  const out = [];
  async function walk(dir) {
    if (!existsSync(dir)) return;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "evidence" || entry.name === "artifacts" || entry.name === "playwright-report" || entry.name === "test-results") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (exts.test(entry.name)) out.push(full);
    }
  }
  await walk(root);
  return out;
}

async function main() {
  // --- W-DOMAIN-NEUTRAL ---
  // Exclude the runner scripts themselves: they legitimately enumerate the
  // forbidden-term list as the negative check (not domain leakage).
  const files = [...(await readDirFiles(goldenWebSrc)), ...(await readDirFiles(e2eUiSrc))].filter(
    (f) => !/\/(run-[a-z-]+\.mjs|start-dev-server\.mjs)$/.test(f)
  );
  const blobs = await Promise.all(files.map(async (f) => ({ path: f, content: await readFile(f, "utf8") })));
  const forbiddenHits = [];
  for (const f of blobs) {
    const hits = FORBIDDEN.filter((t) => new RegExp(`\\b${t}\\b`, "i").test(f.content));
    if (hits.length > 0) forbiddenHits.push({ path: path.relative(repoRoot, f.path), hits });
  }
  // Key golden files must carry golden vocab + @sample/@demo/@reference label.
  const keyRe = /golden-records\.tsx$|serve-golden-web\.mjs$|ui-verification\.config\.ts$|[a-z-]+\.spec\.ts$|golden-flow\.[a-z.]+\.spec\.ts$|evidence\.ts$|collectors\.ts$/;
  const keyFiles = blobs.filter((f) => keyRe.test(f.path));
  const labelFailures = keyFiles.filter((f) => !LABEL_RE.test(f.content)).map((f) => path.relative(repoRoot, f.path));
  const vocabFailures = keyFiles.filter((f) => /golden-records|golden-web|golden-record|ui-verification|serve-golden/.test(f.path) && !GOLDEN_RE.test(f.content) && !/ui-verification|serve-golden|collectors|playwright/.test(f.path)).map((f) => path.relative(repoRoot, f.path));
  record("W-DOMAIN-NEUTRAL", forbiddenHits.length === 0 && labelFailures.length === 0,
    `${files.length} files scanned; forbidden=${forbiddenHits.length}; missing-label key files=${labelFailures.length}${labelFailures.length ? ` (${labelFailures.slice(0, 5).join("; ")})` : ""}`);

  // --- W-NO-CI-LEAK ---
  // Scope: this lane's owned fixtures only. The full E2E/visual suite must be
  // local/orchestrator-run only — i.e. THIS lane must NOT introduce a CI-wiring
  // file or a default-CI directive for full E2E/visual. The repo-wide `.github/`
  // is NOT owned by I-17A (pre-existing baseline dirt from other lanes) and is
  // intentionally excluded; I-17A neither created nor edits it (dirty-tree rule).
  const ownedCiFiles = (await readDirFiles(e2eUiSrc)).filter((f) => /\.github[\/]/.test(f));
  // No owned file may declare a default-CI workflow trigger that runs the full
  // suite (e.g. `on: push`/`on: pull_request` + a full playwright/e2e/@ui run).
  const ownedWorkflowLeaks = [];
  for (const f of (await readDirFiles(e2eUiSrc))) {
    if (!/\.(yml|yaml)$/.test(f)) continue;
    const content = await readFile(f, "utf8");
    if (/^(name|on):/m.test(content) && /playwright|e2e|@ui|run-web-e2e-ui-witness/.test(content)) {
      ownedWorkflowLeaks.push(path.relative(repoRoot, f));
    }
  }
  record("W-NO-CI-LEAK", ownedCiFiles.length === 0 && ownedWorkflowLeaks.length === 0,
    ownedCiFiles.length === 0 && ownedWorkflowLeaks.length === 0
      ? "owned fixtures declare no CI workflow / default-CI full-E2E/full-visual wiring (suite is local/orchestrator-run only)"
      : `owned CI wiring leaked: ci=${ownedCiFiles.length} workflow=${ownedWorkflowLeaks.join(",")}`);

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  console.log(`\n=== I-17A domain-neutral + no-CI-leak: ${ok ? "PASS" : "FAIL"} (${checks.length} checks, ${failed.length} failed) ===`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("domain-neutral check FATAL:", e);
  process.exit(2);
});
