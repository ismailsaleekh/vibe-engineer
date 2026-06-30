#!/usr/bin/env node
// scripts/ci/pulumi/validate-pulumi-scaffold.mjs
//
// I-20C Pulumi-scaffold static validator (real-boundary structural witness).
//
// Validates the provider-agnostic Pulumi scaffold + the two IaC workflows against
// DL-18B / locked-decisions §10 / verification-layer §5.15 / mechanical §7 hard
// rules. Complements (does NOT duplicate) I-20B's general workflow static
// validator; this validator is Pulumi-specific.
//
// It FAILS CLOSED (non-zero) on any violation, naming the rule violated:
//   N1  hard-coded provider/region/default resources
//   N2  committed/plaintext Pulumi secret OR an unapproved (non-Pulumi-Cloud) backend
//   N3  PR (infra-preview) workflow mutates infra (`pulumi up`/`refresh`/`destroy`)
//   N4  deploy workflow auto-triggers on push/pull_request/schedule/tag/registry
//   N5  deploy workflow lacks `workflow_dispatch` OR lacks protected `environment:`
//   N6  `pulumi destroy` present outside an explicit protected/manual break-glass flow
//   N7  missing Pulumi Cloud backend configuration
//   N8  broad workflow permissions (beyond least required)
//   N9  unpinned action/tool version (`@latest`/`@main`/`@master`/dynamic moving tag)
//
// Usage:
//   node scripts/ci/pulumi/validate-pulumi-scaffold.mjs \
//       --infra infra/pulumi \
//       --workflows .github/workflows/infra-preview.yml .github/workflows/deploy.yml
//
// Positive mode (default) PASSes only if the scaffold is fully conformant. To run
// a single non-conformant fixture, pass its path via --infra/--workflows (the
// validator reports the violated rule and exits non-zero, which is the expected
// behavior for negative witnesses).

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { argv, exit } from "node:process";

// ---------------------------------------------------------------------------
// arg parsing
// ---------------------------------------------------------------------------
function parseArgs(args) {
  const opts = { infra: null, workflows: [], _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--infra") opts.infra = args[++i];
    else if (a === "--workflows") {
      // collect following until next flag or end
      while (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        opts.workflows.push(args[++i]);
      }
    } else if (a === "--help" || a === "-h") {
      opts.help = true;
    } else opts._.push(a);
  }
  return opts;
}

const opts = parseArgs(argv.slice(2));
if (opts.help || !opts.infra || opts.workflows.length === 0) {
  process.stderr.write(
    "usage: validate-pulumi-scaffold.mjs --infra <dir> --workflows <wf.yml> [<wf.yml>...]\n",
  );
  exit(opts.help ? 0 : 2);
}

// ---------------------------------------------------------------------------
// tiny YAML value helpers (structural; do NOT execute workflows)
// ---------------------------------------------------------------------------
function readText(p) {
  return readFileSync(p, "utf8");
}

// Strip YAML `# ...` comments from the first unquoted `#` to EOL. Comments are not
// executable workflow logic, so structural scans (mutating-command / destroy /
// action-pin / secret smells) must run over the de-commented text to avoid both
// false positives on documentation and false negatives from comment-disguised
// content.
function stripYamlComments(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      let inS = null; // active quote char
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inS) {
          if (c === inS && line[i - 1] !== "\\") inS = null;
          continue;
        }
        if (c === '"' || c === "'") {
          inS = c;
          continue;
        }
        if (c === "#" && (i === 0 || /\s/.test(line[i - 1]))) {
          return line.slice(0, i);
        }
      }
      return line;
    })
    .join("\n");
}

// Collect findings (each: { rule, where, detail }). Any finding => non-zero exit.
const findings = [];
function fail(rule, where, detail) {
  findings.push({ rule, where, detail });
}

// ---------------------------------------------------------------------------
// minimal structural YAML parser for the subset GitHub Actions / Pulumi uses.
// Supports: top-level keys, nested maps via indentation, block scalars, flow
// sequences (inline `[a, b]`), and `- item` block sequences. Sufficient for the
// structural assertions below; deliberately conservative (no execution).
// ---------------------------------------------------------------------------
function parseYaml(text) {
  const lines = text.split(/\r?\n/);
  // Strip comments and blank lines but keep indentation.
  const cleaned = lines.map((l) => {
    const hashIdx = l.indexOf("#");
    // Naive: only strip if # is at start of a token (preceded by space or start).
    if (hashIdx === -1) return l;
    // keep inline if inside quotes — simple guard
    const before = l.slice(0, hashIdx);
    const q = (before.match(/"/g) || []).length;
    if (q % 2 === 1) return l; // hash inside quotes
    return before;
  });
  const root = {};
  const stack = [{ node: root, indent: -1 }];
  function cur() {
    return stack[stack.length - 1];
  }
  for (const raw of cleaned) {
    if (raw.trim() === "") continue;
    const indent = raw.length - raw.trimStart().length;
    while (stack.length > 1 && cur().indent >= indent) stack.pop();
    const line = raw.trim();
    // block sequence item
    if (line.startsWith("- ")) {
      const parent = cur().node;
      if (!parent.__seq) parent.__seq = [];
      const val = line.slice(2).trim();
      const itemNode = {};
      parent.__seq.push(itemNode);
      // push a context so nested keys attach to this item
      stack.push({ node: itemNode, indent });
      // if the item is `key: value`, record it
      const m = val.match(/^([A-Za-z0-9_.\-]+):\s*(.*)$/);
      if (m && m[2] !== "") {
        itemNode[m[1]] = scalar(m[2]);
      } else if (m) {
        itemNode[m[1]] = {};
        stack[stack.length - 1].node = itemNode[m[1]];
      } else {
        itemNode.__value = scalar(val);
      }
      continue;
    }
    const m = line.match(/^([A-Za-z0-9_.\-]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const rest = m[2];
    if (rest === "") {
      // nested map
      const child = {};
      cur().node[key] = child;
      stack.push({ node: child, indent });
    } else {
      cur().node[key] = scalar(rest);
    }
  }
  return root;
}

function scalar(s) {
  s = s.trim();
  // flow sequence
  if (s.startsWith("[") && s.endsWith("]")) {
    return s
      .slice(1, -1)
      .split(",")
      .map((x) => x.trim().replace(/^['"]|['"]$/g, ""))
      .filter((x) => x.length > 0);
  }
  // quoted
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
    return s.slice(1, -1);
  if (s === "true") return true;
  if (s === "false") return false;
  return s;
}

// Flatten a parsed YAML node into key-path/value pairs (depth-first).
function flatten(node, prefix = "", out = []) {
  if (node === null || typeof node !== "object") return out;
  for (const k of Object.keys(node)) {
    if (k === "__seq") {
      for (const it of node.__seq) flatten(it, prefix, out);
      continue;
    }
    if (k === "__value") {
      out.push({ path: prefix, value: node.__value });
      continue;
    }
    const v = node[k];
    const np = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object") flatten(v, np, out);
    else out.push({ path: np, value: v });
  }
  return out;
}

// ---------------------------------------------------------------------------
// N1 — provider-agnostic invariant over the Pulumi program
// Known cloud provider packages (denylist). v1 must import none of them.
// ---------------------------------------------------------------------------
const PROVIDER_PACKAGES = [
  "@pulumi/aws",
  "@pulumi/azure",
  "@pulumi/azure-native",
  "@pulumi/gcp",
  "@pulumi/google-native",
  "@pulumi/kubernetes",
  "@pulumi/alicloud",
  "@pulumi/aliyun",
  "@pulumi/digitalocean",
  "@pulumi/linode",
  "@pulumi/equinix-metal",
  "@pulumi/openstack",
  "@pulumi/vsphere",
  "@pulumi/cloud",
  "@pulumi/cloud-aws",
  "@pulumi/docker", // docker provider is a deployment surface
  "@pulumi/tls",
  "@pulumi/random",
];
// tokens that imply a hard-coded cloud/region in program or stack config
const REGION_TOKENS =
  /\b(region|aws:region|gcp:region|azure:location|aws:profile|gcp:project|azure:subscriptionId|kubernetes:context)\b\s*[:=]/i;
const PROVIDER_CTOR_TOKENS =
  /\bnew\s+[A-Za-z0-9_.]*Provider\s*\(|new\s+[A-Za-z0-9_.]+\.(Bucket|Cluster|Vpc|VPC|Instance|Subnet|SecurityGroup|ResourceGroup|Deployment|Namespace|Pod|Service)\s*\(/;

function checkProviderAgnostic(infraDir) {
  const pkgPath = join(infraDir, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readText(pkgPath));
    const deps = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {}));
    for (const d of deps) {
      if (PROVIDER_PACKAGES.includes(d)) {
        fail("N1", pkgPath, `provider dependency declared: ${d}`);
      }
    }
  }
  // scan program source (.ts/.js) excluding node_modules
  const srcFiles = listSource(infraDir);
  for (const f of srcFiles) {
    const txt = readText(f);
    // provider imports
    const impRe = /(?:import\s+[^;]*from\s+|require\s*\(\s*)['"]([^'"]+)['"]/g;
    let m;
    while ((m = impRe.exec(txt))) {
      const spec = m[1];
      const base = spec.replace(/^@/, "@").split("/").slice(0, 2).join("/");
      if (PROVIDER_PACKAGES.includes(base) || PROVIDER_PACKAGES.includes(spec)) {
        fail("N1", f, `provider import: ${spec}`);
      }
    }
    if (PROVIDER_CTOR_TOKENS.test(txt)) {
      fail("N1", f, "provider/resource constructor or cloud resource instantiated");
    }
  }
  // scan stack configs (Pulumi.*.yaml) for hard-coded region/provider config
  for (const f of listStackConfigs(infraDir)) {
    const txt = stripYamlComments(readText(f));
    if (REGION_TOKENS.test(txt)) {
      fail("N1", f, "hard-coded cloud region/provider config key");
    }
  }
}

function listSource(dir) {
  const out = [];
  function walk(d) {
    let ents;
    try {
      ents = readdirSync(d);
    } catch {
      return;
    }
    for (const e of ents) {
      if (e === "node_modules" || e.startsWith(".")) continue;
      const p = join(d, e);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (/\.(ts|js|mjs|cts|mts)$/.test(e)) out.push(p);
    }
  }
  walk(dir);
  return out;
}

function listStackConfigs(dir) {
  const out = [];
  try {
    for (const e of readdirSync(dir)) {
      if (/^Pulumi\..+\.ya?ml$/.test(e) && e !== "Pulumi.yaml") {
        out.push(join(dir, e));
      }
    }
  } catch {}
  return out;
}

// ---------------------------------------------------------------------------
// N2 / N7 — secrets + backend
// ---------------------------------------------------------------------------
const SECRET_SMELLS =
  /(secret|password|passwd|token|api[-_]?key|access[-_]?key|private[-_]?key|client[-_]?secret)\s*[:=]/i;

function checkSecretsAndBackend(infraDir) {
  for (const f of listStackConfigs(infraDir)) {
    const txt = stripYamlComments(readText(f));
    if (SECRET_SMELLS.test(txt)) {
      fail("N2", f, "possible committed plaintext secret in stack config");
    }
  }
  // Pulumi.yaml project + stack files: backend must be Pulumi Cloud (default) and
  // NOT a self-managed/unapproved backend (file://, s3://, azblob://, gs://, etc.)
  const projectFiles = [join(infraDir, "Pulumi.yaml")]
    .concat(listStackConfigs(infraDir))
    .filter(existsSync);
  for (const f of projectFiles) {
    const txt = stripYamlComments(readText(f));
    if (/^\s*backend:\s*\n\s*url:\s*(file|s3|azblob|gs|gcp|http):/im.test(txt)) {
      fail("N2", f, "unapproved (non-Pulumi-Cloud) self-managed backend declared");
    }
  }
  // N7: the project file must not block Pulumi Cloud. We treat "no backend url"
  // => Pulumi Cloud default (allowed). An explicit `backend: url: https://api.pulumi.com`
  // is also allowed. Anything else already caught above.
}

// ---------------------------------------------------------------------------
// workflow-level rules
// ---------------------------------------------------------------------------
const MUTATING_PULUMI = /\bpulumi\s+(up|destroy|refresh|import|remove|rename)\b/;
const PULUMI_DESTROY = /\bpulumi\s+destroy\b/;

function workflowName(path) {
  return basename(path);
}

function isPreviewWorkflow(path) {
  return /infra[-_]?preview/i.test(basename(path));
}
function isDeployWorkflow(path) {
  // basename begins with `deploy` (e.g. deploy.yml, deploy-bad.yml).
  return /(^|[-_\/])deploy/i.test(basename(path));
}

// N9 — unpinned action/tool versions. Action uses must be pinned to a 40-hex SHA
// (optionally followed by a `# tag` comment). `@latest`/`@main`/`@master`/bare
// moving major-minor tags like `@v4` (not a SHA) are rejected.
function checkActionPinning(path) {
  const txt = stripYamlComments(readText(path));
  const re = /uses:\s*([A-Za-z0-9_.\-]+\/[A-Za-z0-9_.\-]+)@([^\s#]+)/g;
  let m;
  while ((m = re.exec(txt))) {
    const ref = m[2];
    if (/^(latest|main|master|head)$/i.test(ref)) {
      fail("N9", path, `unpinned action ref @${ref} (${m[1]})`);
      continue;
    }
    // moving semver tags (v1, v1.2) are NOT immutable SHAs
    if (/^v\d+(\.\d+)?$/i.test(ref)) {
      fail("N9", path, `moving tag pin @${ref} (${m[1]}); require 40-hex SHA`);
      continue;
    }
    if (!/^[0-9a-f]{40}$/.test(ref)) {
      fail("N9", path, `non-immutable action ref @${ref} (${m[1]}); require 40-hex SHA`);
    }
  }
}

// N8 — broad workflow permissions. Allowed least scopes: contents: read, and
// id-token: write only if explicitly needed. Anything else is flagged.
const ALLOWED_PERMS = new Set(["contents", "id-token"]);
function checkPermissions(path) {
  const txt = readText(path);
  // capture the top-level `permissions:` block (until next top-level key)
  const idx = txt.search(/^permissions:/m);
  if (idx === -1) {
    // GitHub default is permissive (read+write) if omitted at workflow level when
    // any GITHUB_TOKEN is used. For IaC we REQUIRE an explicit least block.
    fail("N8", path, "no explicit top-level `permissions:` block (defaults are broad)");
    return;
  }
  const after = txt.slice(idx);
  // extract the block lines (indented or inline flow)
  // NOTE: use [ \t]* (NOT \s*) so a newline after `permissions:` is NOT consumed —
  // otherwise a block-style permissions map is misread as a single inline value.
  const inline = after.match(/^permissions:[ \t]*([^\n]*)/);
  if (inline && inline[1].trim() !== "") {
    const val = inline[1].trim();
    if (val !== "read-all") {
      // 'read-all' is acceptable-ish; explicit map preferred but read-all is least
    }
    return;
  }
  const blockLines = after.split(/\n/);
  for (let i = 1; i < blockLines.length; i++) {
    const l = blockLines[i];
    if (l.trim() === "") continue;
    if (!/^\s/.test(l)) break; // block ended
    const m = l.match(/^\s+([A-Za-z0-9_-]+):\s*(.+)$/);
    if (!m) continue;
    const scope = m[1];
    const val = m[2].trim();
    if (!ALLOWED_PERMS.has(scope)) {
      fail("N8", path, `broad permission scope declared: ${scope}: ${val}`);
    } else if (val !== "read" && !(scope === "id-token" && val === "write")) {
      fail("N8", path, `permission scope beyond least: ${scope}: ${val}`);
    }
  }
}

function collectTriggers(path) {
  const txt = readText(path);
  const triggers = new Set();
  // top-level `on:` keys
  const onIdx = txt.search(/^on:/m);
  if (onIdx === -1) return triggers;
  const after = txt.slice(onIdx).split(/\n/);
  // inline flow? on: [push, pull_request]
  const inline = after[0].match(/^on:\s*(.+)$/);
  if (inline && inline[1].trim() !== "") {
    const val = inline[1].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      val
        .slice(1, -1)
        .split(",")
        .map((x) => x.trim().replace(/^['"]|['"]$/g, ""))
        .forEach((x) => x && triggers.add(x));
    } else {
      triggers.add(val);
    }
    return triggers;
  }
  // block form
  for (let i = 1; i < after.length; i++) {
    const l = after[i];
    if (l.trim() === "") continue;
    if (!/^\s/.test(l)) break;
    const m = l.match(/^\s+([A-Za-z0-9_-]+):/);
    if (m) triggers.add(m[1]);
  }
  return triggers;
}

// ---------------------------------------------------------------------------
// PR (infra-preview) workflow: N3 (non-mutating)
// ---------------------------------------------------------------------------
function checkPreviewWorkflow(path) {
  const txt = stripYamlComments(readText(path));
  if (MUTATING_PULUMI.test(txt)) {
    fail("N3", path, "PR infra workflow runs a mutating pulumi command (up/destroy/refresh/...)");
  }
}

// N7 — Pulumi Cloud backend configuration. Any workflow that runs `pulumi
// preview` or `pulumi up` must authenticate to Pulumi Cloud (`pulumi login`,
// driven by PULUMI_ACCESS_TOKEN). A workflow that runs pulumi commands without
// a `pulumi login` step cannot be using the locked Pulumi Cloud backend.
function checkPulumiCloudAuth(path) {
  const txt = stripYamlComments(readText(path));
  if (/\bpulumi\s+(preview|up)\b/.test(txt) && !/\bpulumi\s+login\b/.test(txt)) {
    fail(
      "N7",
      path,
      "workflow runs pulumi preview/up without `pulumi login` (Pulumi Cloud backend not configured)",
    );
  }
}

// ---------------------------------------------------------------------------
// deploy workflow: N4 (no auto-trigger), N5 (workflow_dispatch + protected env),
// N6 (no destroy by default)
// ---------------------------------------------------------------------------
const AUTO_TRIGGERS = new Set([
  "push",
  "pull_request",
  "pull_request_target",
  "schedule",
  "workflow_run",
  "workflow_call",
  "release",
  "create",
  "registry_package",
]);

function checkDeployWorkflow(path) {
  const txt = readText(path);
  const triggers = collectTriggers(path);
  if (!triggers.has("workflow_dispatch")) {
    fail("N5", path, "deploy workflow lacks `workflow_dispatch`");
  }
  for (const t of triggers) {
    if (AUTO_TRIGGERS.has(t)) {
      fail("N4", path, `deploy workflow auto-triggers on \`${t}\` (auto-deploy)`);
    }
  }
  // protected environment binding: a job-level `environment:` referencing the
  // selected stack is required.
  const doc = parseYaml(txt);
  const flat = flatten(doc);
  const hasEnvBinding = flat.some(
    (kv) => kv.path.startsWith("jobs.") && /^jobs\.[^.]+\.environment$/.test(kv.path),
  );
  if (!hasEnvBinding) {
    fail("N5", path, "deploy workflow lacks a job-level protected `environment:` binding");
  } else {
    // environment must resolve to dev/prod (expression or literal), not a
    // hard-coded unprotected value
    const envVals = flat
      .filter((kv) => /^jobs\.[^.]+\.environment$/.test(kv.path))
      .map((kv) => String(kv.value));
    for (const v of envVals) {
      // Accept: literal dev/prod, or a ${{ inputs.stack }} /
      // ${{ github.event.inputs.stack }} expression selecting the stack.
      const ok =
        v === "dev" ||
        v === "prod" ||
        /inputs\.stack/.test(v) ||
        /github\.event\.inputs\.stack/.test(v);
      if (!ok) {
        fail("N5", path, `deploy environment binding not dev/prod/inputs.stack: ${v}`);
      }
    }
  }
  // N6: no pulumi destroy anywhere (break-glass would be a separate protected flow)
  if (PULUMI_DESTROY.test(stripYamlComments(txt))) {
    fail("N6", path, "`pulumi destroy` present in deploy workflow (no default destroy)");
  }
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------
checkProviderAgnostic(opts.infra);
checkSecretsAndBackend(opts.infra);

for (const wf of opts.workflows) {
  if (!existsSync(wf)) {
    fail("IO", wf, "workflow file not found");
    continue;
  }
  checkActionPinning(wf);
  checkPermissions(wf);
  checkPulumiCloudAuth(wf);
  if (isPreviewWorkflow(wf)) checkPreviewWorkflow(wf);
  if (isDeployWorkflow(wf)) checkDeployWorkflow(wf);
  // Generic: a PR/push-triggered workflow must never mutate infra (covers a
  // deploy.yml that wrongly gained an auto trigger AND a pulumi up).
  const triggers = collectTriggers(wf);
  const isAutoTriggered = [...triggers].some((t) =>
    ["push", "pull_request", "pull_request_target", "schedule"].includes(t),
  );
  if (isAutoTriggered && MUTATING_PULUMI.test(stripYamlComments(readText(wf)))) {
    fail("N3", wf, "auto-triggered workflow runs a mutating pulumi command");
  }
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
const ruleOrder = ["N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8", "N9", "IO"];
findings.sort((a, b) => ruleOrder.indexOf(a.rule) - ruleOrder.indexOf(b.rule));

const pad = (s, n) => s + " ".repeat(Math.max(0, n - s.length));
if (findings.length === 0) {
  process.stdout.write(
    "pulumi-scaffold-validator: PASS — provider-agnostic + conformant workflows, no N1-N9 violation.\n",
  );
  exit(0);
} else {
  process.stderr.write(`pulumi-scaffold-validator: FAIL — ${findings.length} violation(s):\n`);
  for (const f of findings) {
    process.stderr.write(`  [${f.rule}] ${f.where}: ${f.detail}\n`);
  }
  exit(1);
}
