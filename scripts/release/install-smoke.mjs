#!/usr/bin/env node
// WP-05 release:install-smoke — THE load-bearing real-boundary seam.
//
// Clean EXTERNAL temp dir (outside the monorepo, no workspace bleed) →
// `npm install <10 tarballs>` → run the INSTALLED `vibe-engineer` binary matrix
// subset → assert exit codes + typed envelopes + validate envelopes via the
// INSTALLED package's validator → no module-resolution leak witness → ESM
// exports-seam witness. Evidence + summary.json. Re-runnable.
//
// Usage:
//   node scripts/release/install-smoke.mjs [--pack-dir <dir>] [--evidence-dir <dir>] [--summary-out <json>] [--keep]
//
// Defaults read pack output from .vibe/work/WP-05-pack-install/release/pack.
// Exit 0 only when the seam is real-green (W-P3, W-P4, W-P5, W-N1..N3, residuals witnessed).

import {
  mkdir,
  writeFile,
  readFile,
  rm,
  mkdtemp,
  access,
  realpath as realpathCb,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import url from "node:url";
import { spawn } from "node:child_process";

import { run, writeJson, assertOk, AssertionFailure, cleanDir } from "./lib/release-helpers.mjs";

const REPO_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..", "..");
const PACK_DEFAULT = path.join(REPO_ROOT, ".vibe/release/pack");
const SMOKE_DEFAULT = path.join(REPO_ROOT, ".vibe/release/install-smoke");

const MONOREPO_REAL = await realpathCb(REPO_ROOT);

// ---------- args ----------
function parseArgs(argv) {
  const out = {
    packDir: PACK_DEFAULT,
    evidenceDir: null,
    summaryOut: null,
    keep: false,
    unknown: [],
  };
  const known = {
    "--pack-dir": "packDir",
    "--evidence-dir": "evidenceDir",
    "--summary-out": "summaryOut",
  };
  const tokens = argv.slice(2);
  let i = 0;
  while (i < tokens.length) {
    const arg = tokens[i];
    if (arg === "--") {
      i += 1;
      continue;
    }
    if (arg === "--keep") {
      out.keep = true;
      i += 1;
      continue;
    }
    const eq = arg.startsWith("--") ? arg.indexOf("=") : -1;
    if (eq > 2) {
      const name = arg.slice(0, eq);
      const value = arg.slice(eq + 1);
      if (known[name]) {
        out[known[name]] = value;
        i += 1;
        continue;
      }
      out.unknown.push(arg);
      i += 1;
      continue;
    }
    if (known[arg]) {
      const value = tokens[i + 1];
      if (value === undefined) {
        out.unknown.push(arg);
        i += 1;
        continue;
      }
      out[known[arg]] = value;
      i += 2;
      continue;
    }
    out.unknown.push(arg);
    i += 1;
  }
  return out;
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}
async function realpath(p) {
  try {
    return await realpathCb(p);
  } catch {
    return p;
  }
}

// ---------- run a matrix case against the INSTALLED binary ----------
async function runCase({ id, argv, expect, cwd, binPath, resultFile }) {
  const r = await run("node", [binPath, ...argv], { cwd });
  // stdout should be a single envelope JSON line (CLI writes envelope to stdout).
  let envelope = null;
  let parseError = null;
  const stdoutTrim = r.stdout.trim();
  if (stdoutTrim) {
    try {
      envelope = JSON.parse(
        stdoutTrim
          .split("\n")
          .filter((l) => l.startsWith("{"))
          .pop(),
      );
    } catch (e) {
      parseError = String(e);
    }
  }
  // if a result-file was requested and stdout empty, fall back to result file
  if (!envelope && resultFile && (await fileExists(resultFile))) {
    try {
      envelope = JSON.parse(await readFile(resultFile, "utf8"));
    } catch (e) {
      parseError = String(e);
    }
  }
  const caseRecord = {
    id,
    argv,
    exitCode: r.exitCode,
    expect,
    stdoutLen: r.stdout.length,
    stderrLen: r.stderr.length,
    envelopePresent: !!envelope,
    envelopeParseError: parseError,
    envelopeStatus: envelope?.status ?? null,
    envelopeExitCode: envelope?.exitCode ?? null,
    envelopePayloadKind: envelope?.payload?.kind ?? null,
    diagCodes: (envelope?.diagnostics ?? []).map((d) => d.code),
    diagClassifications: (envelope?.diagnostics ?? []).map((d) => d.classification),
    envelope,
  };
  return { caseRecord, raw: r };
}

// ---------- validator runner (imports from the INSTALLED package) ----------
// We author a tiny ESM helper INSIDE the temp dir so bare-specifier resolution
// hits the INSTALLED node_modules, not the monorepo. cwd=temp on spawn.
const VALIDATOR_HELPER = `
import { validateCliResultEnvelope } from "vibe-engineer/envelope";
import { readFile, writeFile } from "node:fs/promises";
const [,, envelopePath, outPath, mutation] = process.argv;
let env;
try { env = JSON.parse(await readFile(envelopePath, "utf8")); }
catch (e) { await writeFile(outPath, JSON.stringify({ ok: false, errors: ["parse: " + String(e)] })); process.exit(0); }
if (mutation === "drop-status") { delete env.status; }
if (mutation === "corrupt-exit") { env.exitCode = 99999; }
if (mutation === "drop-schema") { delete env.schemaVersion; }
const res = validateCliResultEnvelope(env);
await writeFile(outPath, JSON.stringify(res));
`;

async function validateViaInstalled({ tempDir, envelopePath, mutation = "none" }) {
  const helperPath = path.join(tempDir, ".wp05-validate-runner.mjs");
  await writeFile(helperPath, VALIDATOR_HELPER, "utf8");
  const outPath = path.join(tempDir, ".wp05-validate-out.json");
  const r = await run("node", [helperPath, envelopePath, outPath, mutation], { cwd: tempDir });
  if (!r.ok)
    throw new AssertionFailure("installed-validator-spawn", { stderr: r.stderr, exit: r.exitCode });
  try {
    return JSON.parse(await readFile(outPath, "utf8"));
  } catch (e) {
    throw new AssertionFailure("installed-validator-read", { err: String(e) });
  }
}

// ---------- ESM exports-seam witness (INSTALLED package) ----------
const ESM_IMPORT_HELPER = `
const results = {};
try {
  const mod = await import("@vibe-engineer/security");
  results.securityImport = { ok: true, exportNames: Object.keys(mod).slice(0, 20) };
} catch (e) {
  results.securityImport = { ok: false, code: e.code ?? null, message: String(e.message ?? e) };
}
try {
  const mod = await import("@vibe-engineer/skills/build");
  results.skillsBuildImport = { ok: true, exportNames: Object.keys(mod).slice(0, 20) };
} catch (e) {
  results.skillsBuildImport = { ok: false, code: e.code ?? null, message: String(e.message ?? e) };
}
console.log(JSON.stringify(results));
`;

// ---------- main ----------
async function main() {
  const args = parseArgs(process.argv);
  assertOk("smoke-args", args.unknown.length === 0, { unknown: args.unknown });

  const packDir = path.resolve(args.packDir);
  const packSummaryPath = path.join(packDir, "summary.json");
  assertOk("pack-summary-exists", await fileExists(packSummaryPath), { packSummaryPath });
  const packSummary = JSON.parse(await readFile(packSummaryPath, "utf8"));
  assertOk("pack-summary-ok", packSummary.ok === true, { packSummaryOk: packSummary.ok });

  const tarballDir = packSummary.tarballDir;
  const tarballs = packSummary.packages.map((p) => path.join(tarballDir, p.tarball));
  for (const t of tarballs) assertOk("tarball-exists", await fileExists(t), { tarball: t });

  const evidenceDir = path.resolve(args.evidenceDir || path.join(SMOKE_DEFAULT, "evidence"));
  const summaryOut = path.resolve(args.summaryOut || path.join(SMOKE_DEFAULT, "summary.json"));
  await cleanDir(SMOKE_DEFAULT);
  await mkdir(evidenceDir, { recursive: true });

  const summary = {
    schemaVersion: "wp05.release.install-smoke.summary/v1",
    generatedAt: new Date().toISOString(),
    repoRoot: REPO_ROOT,
    packDir,
    evidenceDir,
    nodeVersion: process.version,
    cases: [],
    noLeakWitness: null,
    esmExportsSeam: null,
    assertions: {
      "W-P3-clean-external-install": null,
      "W-P4-installed-binary-matrix": null,
      "W-P5-no-module-resolution-leak": null,
      "W-N1-unknown-and-invalid-flag": null,
      "W-N2-deferred-commands": null,
      "W-N3-build-ship": null,
      "residual-security-exports-seam": null,
      "residual-verify-installed-behavior": null,
      "installed-envelope-validator-live": null,
    },
    pendingLive: {
      "public-registry-single-tarball-install":
        "PENDING — HLO-gated on npm publish (token 401); not attempted, not faked",
    },
    errors: [],
    ok: false,
  };

  let tempDir = null;
  try {
    // 1. clean EXTERNAL temp dir (outside monorepo; same volume /var/folders via os.tmpdir)
    tempDir = await mkdtemp(path.join(tmpdir(), "wp05-install-smoke-"));
    const tempReal = await realpath(tempDir);
    assertOk(
      "temp-outside-monorepo",
      !tempReal.startsWith(MONOREPO_REAL + path.sep) && tempReal !== MONOREPO_REAL,
      { tempReal, monorepoReal: MONOREPO_REAL },
    );
    // no inherited workspace linkage
    const inherited = ["node_modules", "pnpm-lock.yaml", ".npmrc", "package.json"];
    const present = [];
    for (const f of inherited) {
      if (await fileExists(path.join(tempDir, f))) present.push(f);
    }
    assertOk("temp-no-inherited-workspace", present.length === 0, { present });
    summary.tempDir = tempReal;
    summary.tempOutsideMonorepo = true;

    // 2. npm install <10 tarballs> with NODE_PATH unset, no .npmrc
    const installEnv = { ...process.env };
    delete installEnv.NODE_PATH;
    delete installEnv.NODE_OPTIONS;
    const installArgv = [
      "install",
      "--no-save",
      "--no-audit",
      "--no-fund",
      "--loglevel=error",
      ...tarballs,
    ];
    const install = await run("npm", installArgv, { cwd: tempDir, env: installEnv });
    await writeFile(
      path.join(evidenceDir, "install.cmd.txt"),
      `npm ${installArgv.join(" ")}\n(cwd ${tempDir})\n`,
      "utf8",
    );
    await writeFile(path.join(evidenceDir, "install.stdout.txt"), install.stdout, "utf8");
    await writeFile(path.join(evidenceDir, "install.stderr.txt"), install.stderr, "utf8");
    await writeFile(path.join(evidenceDir, "install.exit.txt"), String(install.exitCode), "utf8");
    assertOk("W-P3-install-exit-0", install.exitCode === 0, {
      exit: install.exitCode,
      stderr: install.stderr.slice(-2000),
    });
    assertOk(
      "W-P3-vibe-engineer-installed",
      await fileExists(path.join(tempDir, "node_modules", "vibe-engineer", "package.json")),
      {},
    );
    summary.assertions["W-P3-clean-external-install"] = install.exitCode === 0;

    // 3. no-leak witness (W-P5): realpath of each installed @vibe-engineer/* + vibe-engineer + bin
    const nmRoot = path.join(tempDir, "node_modules");
    const installedPkgs = [
      "vibe-engineer",
      "@vibe-engineer/artifacts",
      "@vibe-engineer/config",
      "@vibe-engineer/context",
      "@vibe-engineer/orchestration",
      "@vibe-engineer/schematics",
      "@vibe-engineer/security",
      "@vibe-engineer/skills",
      "@vibe-engineer/verification",
      "@vibe-engineer/adapter-pi",
    ];
    const leakCheck = [];
    for (const p of installedPkgs) {
      const pkgRoot = path.join(nmRoot, p);
      const real = await realpath(pkgRoot);
      const underMonorepo = real === MONOREPO_REAL || real.startsWith(MONOREPO_REAL + path.sep);
      leakCheck.push({ pkg: p, real, underMonorepo });
    }
    // The INSTALLED binary path. The HONEST real-user invocation is the `.bin`
    // symlink (what `vibe-engineer` / `npx vibe-engineer` resolves to). We MUST
    // exercise that path — NOT `node <realpath>`, which sidesteps the symlink and
    // can mask a bin-execution defect (the shape-green trap). See binExecutionWitness.
    const binSymlink = path.join(nmRoot, ".bin", "vibe-engineer");
    assertOk("bin-symlink-exists", await fileExists(binSymlink), { binSymlink });
    const binReal = await realpath(binSymlink);
    const binUnderMonorepo =
      binReal === MONOREPO_REAL || binReal.startsWith(MONOREPO_REAL + path.sep);
    assertOk("bin-resolves-into-temp-install", binReal.startsWith(tempReal + path.sep), {
      binReal,
      tempReal,
    });
    summary.binExecutionWitness = {
      binSymlink,
      binRealTarget: binReal,
      binUnderMonorepo,
      note: "bin symlink target resolves into the temp install (no workspace leak)",
    };
    const binPath = binSymlink; // invoke via the symlink — the real user path

    summary.noLeakWitness = { installedPkgs: leakCheck, binUnderMonorepo };
    assertOk(
      "W-P5-no-leak-pkgs",
      leakCheck.every((c) => !c.underMonorepo),
      { leaking: leakCheck.filter((c) => c.underMonorepo) },
    );
    assertOk("W-P5-no-leak-bin", !binUnderMonorepo, { binReal: binReal });
    summary.assertions["W-P5-no-module-resolution-leak"] = true;

    // W-P4 BIN-EXECUTION WITNESS (load-bearing): contrast the real-user bin
    // invocation (`.bin` symlink via shebang) against explicit `node <realpath>`.
    // If the symlink invocation emits nothing while `node <realpath>` works, the
    // published bin is broken at the entry main-guard — a load-bearing seam RED,
    // root-caused in packages/cli/src/entry/vibe-engineer.js (UNTOUCHABLE for WP-05).
    const symlinkInv = await run(binSymlink, ["version"], { cwd: tempDir });
    const nodeRealInv = await run("node", [binReal, "version"], { cwd: tempDir });
    const binWitness = {
      symlinkInvocation: {
        argv: [binSymlink, "version"],
        exitCode: symlinkInv.exitCode,
        stdoutBytes: symlinkInv.stdout.length,
        stderrBytes: symlinkInv.stderr.length,
        stdoutHead: symlinkInv.stdout.slice(0, 80),
      },
      nodeRealpathInvocation: {
        argv: ["node", binReal, "version"],
        exitCode: nodeRealInv.exitCode,
        stdoutBytes: nodeRealInv.stdout.length,
        stdoutHead: nodeRealInv.stdout.slice(0, 80),
      },
    };
    summary.binExecutionWitness.detail = binWitness;
    await writeJson(path.join(evidenceDir, "bin-execution-witness.json"), binWitness);
    // Record the truthful disposition without throwing yet — let the matrix below
    // also run so the full evidence is captured. The summary verdict encodes it.
    const binBrokenViaSymlink =
      symlinkInv.stdout.length === 0 &&
      symlinkInv.stderr.length === 0 &&
      symlinkInv.exitCode === 0 &&
      nodeRealInv.stdout.length > 0;
    summary.binExecutionWitness.brokenViaSymlink = binBrokenViaSymlink;
    if (binBrokenViaSymlink) {
      summary.binExecutionWitness.rootCause =
        "packages/cli/src/entry/vibe-engineer.js main-guard compares `import.meta.url` (Node-resolved REAL path, follows the .bin symlink) against `file://${process.argv[1]}` (the UNRESOLVED .bin symlink path). They never match when invoked via the .bin symlink => runCli() is never called => silent exit 0 with no output. The published bin is non-functional under the canonical `vibe-engineer`/`npx vibe-engineer` invocation. Fix surface: packages/cli/src/entry/vibe-engineer.js (UNTOUCHABLE for WP-05 per brief §2). Correct fix: compare against realpathSync(process.argv[1]) via pathToFileURL, or drop the guard and call runCli() unconditionally when executed as main.";
    }

    const installedCliManifest = JSON.parse(
      await readFile(path.join(tempDir, "node_modules", "vibe-engineer", "package.json"), "utf8"),
    );

    // 4. matrix cases
    const createTarget = path.join(tempDir, "create-output");
    // Keep the result-file outside the create target. The CLI writes result files
    // atomically and intentionally does not create missing parent directories;
    // placing this witness under the already-created evidence directory proves
    // result-file behavior without manufacturing an ENOENT parent failure.
    const createResultFile = path.join(evidenceDir, "create-success-result.json");

    const caseSpecs = [
      {
        id: "help",
        argv: ["help"],
        expect: { exit: 0, status: "success", payloadKind: "help_result", nineCommands: true },
      },
      {
        id: "version",
        argv: ["version"],
        expect: {
          exit: 0,
          status: "success",
          payloadKind: "version_result",
          version: installedCliManifest.version,
        },
      },
      {
        id: "create-success",
        argv: [
          "create",
          "--target-root",
          createTarget,
          "--non-interactive",
          "--result-file",
          createResultFile,
        ],
        expect: { exit: 0, status: "success", payloadKind: "create_result", stage: "complete" },
        resultFile: createResultFile,
      },
      {
        id: "create-no-target",
        argv: ["create"],
        expect: {
          exit: 2,
          status: "blocked",
          code: "VE_MISSING_FLAG_VALUE",
          classification: "invalid_invocation",
        },
      },
      {
        id: "context-deferred",
        argv: ["context"],
        expect: {
          exit: 2,
          status: "blocked",
          code: "VE_UNSUPPORTED_OPERATION",
          classification: "unsupported_operation",
        },
      },
      {
        id: "registry-deferred",
        argv: ["registry"],
        expect: {
          exit: 2,
          status: "blocked",
          code: "VE_UNSUPPORTED_OPERATION",
          classification: "unsupported_operation",
        },
      },
      {
        id: "build-unknown",
        argv: ["build"],
        expect: {
          exit: 2,
          status: "blocked",
          code: "VE_INVALID_INVOCATION",
          classification: "invalid_invocation",
        },
      },
      {
        id: "ship-unknown",
        argv: ["ship"],
        expect: {
          exit: 2,
          status: "blocked",
          code: "VE_INVALID_INVOCATION",
          classification: "invalid_invocation",
        },
      },
      {
        id: "version-invalid-flag",
        argv: ["version", "--bogus"],
        expect: {
          exit: 2,
          status: "blocked",
          code: "VE_INVALID_FLAG",
          classification: "invalid_invocation",
        },
      },
      {
        id: "verify-unconfigured",
        argv: ["verify", "--project-root", tempDir],
        expect: {
          exit: 3,
          status: "blocked",
          code: "VE_MISSING_CONFIG",
          classification: "missing_prerequisite",
        },
      },
      {
        id: "security-unconfigured",
        argv: ["security", "--project-root", tempDir],
        expect: {
          exit: 3,
          status: "blocked",
          code: "VE_MISSING_CONFIG",
          classification: "missing_prerequisite",
        },
      },
    ];

    const matrixResults = [];
    for (const spec of caseSpecs) {
      const { caseRecord } = await runCase({ ...spec, cwd: tempDir, binPath });
      // per-case evidence
      const safeId = spec.id;
      await writeFile(
        path.join(evidenceDir, `${safeId}.cmd.txt`),
        `node ${binPath} ${spec.argv.join(" ")}\n(cwd ${tempDir})\n`,
        "utf8",
      );
      await writeFile(
        path.join(evidenceDir, `${safeId}.exit.txt`),
        String(caseRecord.exitCode),
        "utf8",
      );
      if (caseRecord.envelope)
        await writeJson(path.join(evidenceDir, `${safeId}.stdout.json`), caseRecord.envelope);

      // exit code
      assertOk(`case-${safeId}-exit`, caseRecord.exitCode === spec.expect.exit, {
        id: safeId,
        got: caseRecord.exitCode,
        want: spec.expect.exit,
      });
      // status
      assertOk(`case-${safeId}-status`, caseRecord.envelopeStatus === spec.expect.status, {
        id: safeId,
        got: caseRecord.envelopeStatus,
        want: spec.expect.status,
      });
      // payload kind
      if (spec.expect.payloadKind)
        assertOk(
          `case-${safeId}-payloadKind`,
          caseRecord.envelopePayloadKind === spec.expect.payloadKind,
          { id: safeId, got: caseRecord.envelopePayloadKind, want: spec.expect.payloadKind },
        );
      // diag code
      if (spec.expect.code)
        assertOk(`case-${safeId}-code`, caseRecord.diagCodes.includes(spec.expect.code), {
          id: safeId,
          got: caseRecord.diagCodes,
          want: spec.expect.code,
        });
      if (spec.expect.classification)
        assertOk(
          `case-${safeId}-classification`,
          caseRecord.diagClassifications.includes(spec.expect.classification),
          { id: safeId, got: caseRecord.diagClassifications, want: spec.expect.classification },
        );

      // help-specific: exactly 9 public commands, no foundation/skill command names
      if (spec.id === "help") {
        const cmds = caseRecord.envelope?.payload?.data?.commands ?? [];
        const ids = cmds.map((c) => c.id);
        const PUBLIC = [
          "help",
          "version",
          "create",
          "import",
          "doctor",
          "config",
          "verify",
          "security",
          "schematic",
        ];
        assertOk("help-nine-commands", ids.length === 9, { ids });
        assertOk(
          "help-exact-public-set",
          JSON.stringify([...ids].sort()) === JSON.stringify([...PUBLIC].sort()),
          { ids },
        );
        assertOk("help-no-foundation-command", !ids.includes("foundation"), { ids });
      }
      // version-specific: matches installed manifest
      if (spec.id === "version") {
        const v = caseRecord.envelope?.payload?.data?.version;
        assertOk("version-matches-installed", v === installedCliManifest.version, {
          got: v,
          want: installedCliManifest.version,
        });
      }
      // create-success-specific: stage complete + files materialized
      if (spec.id === "create-success") {
        const stage = caseRecord.envelope?.payload?.data?.stage;
        assertOk("create-stage-complete", stage === "complete", { stage });
        const wroteConfig = await fileExists(path.join(createTarget, "vibe-engineer.config.json"));
        const wroteAgents = await fileExists(path.join(createTarget, "AGENTS.md"));
        const wroteClaude = await fileExists(path.join(createTarget, "CLAUDE.md"));
        const wroteContext = await fileExists(
          path.join(createTarget, ".vibe", "context", "index", "context-index.json"),
        );
        assertOk(
          "create-materializes-baseline",
          wroteConfig && wroteAgents && wroteClaude && wroteContext,
          { wroteConfig, wroteAgents, wroteClaude, wroteContext },
        );
      }

      matrixResults.push(caseRecord);
      summary.cases.push({
        id: spec.id,
        argv: spec.argv,
        exitCode: caseRecord.exitCode,
        status: caseRecord.envelopeStatus,
        payloadKind: caseRecord.envelopePayloadKind,
        diagCodes: caseRecord.diagCodes,
        diagClassifications: caseRecord.diagClassifications,
        expect: spec.expect,
      });
    }

    // aggregate matrix assertion
    summary.assertions["W-P4-installed-binary-matrix"] = true; // reached only if all case asserts passed
    summary.assertions["W-N1-unknown-and-invalid-flag"] =
      matrixResults
        .find((c) => c.id === "build-unknown")
        ?.diagCodes?.includes("VE_INVALID_INVOCATION") &&
      matrixResults
        .find((c) => c.id === "version-invalid-flag")
        ?.diagCodes?.includes("VE_INVALID_FLAG");
    summary.assertions["W-N2-deferred-commands"] = ["context-deferred", "registry-deferred"].every(
      (id) =>
        matrixResults.find((c) => c.id === id)?.diagCodes?.includes("VE_UNSUPPORTED_OPERATION"),
    );
    summary.assertions["W-N3-build-ship"] = ["build-unknown", "ship-unknown"].every((id) =>
      matrixResults.find((c) => c.id === id)?.diagCodes?.includes("VE_INVALID_INVOCATION"),
    );
    summary.assertions["residual-verify-installed-behavior"] =
      "WITNESSED: verify against unconfigured root → blocked exit 3 VE_MISSING_CONFIG/missing_prerequisite (truthful; verify residual CLOSED by VERIFY-FIX lane — success path requires a configured project with an approved plan, not faked here)";

    // 5. envelope validity via INSTALLED validator (W-P4 envelope validity)
    const helpEnv = matrixResults.find((c) => c.id === "help").envelope;
    const helpEnvPath = path.join(tempDir, ".wp05-help-envelope.json");
    await writeFile(helpEnvPath, JSON.stringify(helpEnv), "utf8");
    const valid = await validateViaInstalled({
      tempDir,
      envelopePath: helpEnvPath,
      mutation: "none",
    });
    assertOk("installed-validator-positive", valid.ok === true, { valid });
    const mutDropStatus = await validateViaInstalled({
      tempDir,
      envelopePath: helpEnvPath,
      mutation: "drop-status",
    });
    const mutCorruptExit = await validateViaInstalled({
      tempDir,
      envelopePath: helpEnvPath,
      mutation: "corrupt-exit",
    });
    const mutDropSchema = await validateViaInstalled({
      tempDir,
      envelopePath: helpEnvPath,
      mutation: "drop-schema",
    });
    await writeJson(path.join(evidenceDir, "installed-validator-results.json"), {
      positive: valid,
      mutations: {
        dropStatus: mutDropStatus,
        corruptExit: mutCorruptExit,
        dropSchema: mutDropSchema,
      },
    });
    assertOk(
      "installed-validator-negative-mutation",
      mutDropStatus.ok === false || mutCorruptExit.ok === false || mutDropSchema.ok === false,
      { mutDropStatus, mutCorruptExit, mutDropSchema },
    );
    summary.assertions["installed-envelope-validator-live"] =
      valid.ok === true &&
      (mutDropStatus.ok === false || mutCorruptExit.ok === false || mutDropSchema.ok === false);

    // 6. ESM exports-seam witness against the INSTALLED package
    const esmHelper = path.join(tempDir, ".wp05-esm-import-helper.mjs");
    await writeFile(esmHelper, ESM_IMPORT_HELPER, "utf8");
    const esmRun = await run("node", [esmHelper], { cwd: tempDir });
    let esmResult;
    try {
      esmResult = JSON.parse(esmRun.stdout.trim());
    } catch (e) {
      throw new AssertionFailure("esm-import-parse", {
        stdout: esmRun.stdout,
        stderr: esmRun.stderr,
        err: String(e),
      });
    }
    summary.esmExportsSeam = esmResult;
    await writeJson(path.join(evidenceDir, "esm-exports-seam.json"), esmResult);
    // The security command itself config-gates before reaching exports; the seam is the
    // raw package-exports resolution. ESM import honors the `import` condition (green).
    // The tracked in-monorepo CJS-fixture red (ERR_PACKAGE_PATH_NOT_EXPORTED) is
    // root-caused at packages/security/package.json exports having no `require` condition
    // — a WP-01/WP-02 surface, NOT WP-05 owned. Recorded, not patched (no band-aid).
    assertOk("esm-security-import-green", esmResult.securityImport?.ok === true, {
      securityImport: esmResult.securityImport,
    });
    summary.assertions["residual-security-exports-seam"] =
      esmResult.securityImport?.ok === true
        ? "GREEN-VIA-ESM at the installed package (security `.` export has an `import` condition). The in-monorepo CJS-fixture red (ERR_PACKAGE_PATH_NOT_EXPORTED) is a separate CJS-resolution concern root-caused at packages/security/package.json (no `require` condition) — a WP-01/WP-02-owned manifest surface, NOT WP-05 owned; HALT-and-flag the CJS fix, NOT patched here (no band-aid)."
        : { red: esmResult.securityImport };

    summary.ok = Object.values(summary.assertions).every((v) =>
      typeof v === "string" ? true : v === true,
    );
  } catch (e) {
    summary.ok = false;
    if (e instanceof AssertionFailure) {
      summary.errors.push({ assertion: e.assertion, detail: e.detail });
    } else {
      summary.errors.push({
        assertion: "unexpected-throw",
        detail: { message: String(e), stack: e.stack },
      });
    }
  } finally {
    await writeJson(summaryOut, summary);
    if (!args.keep && tempDir) {
      await cleanDir(tempDir);
    } else if (tempDir) {
      summary.keptTempDir = tempDir;
    }
  }

  process.exit(summary.ok ? 0 : 1);
}

main().catch((e) => {
  console.error("install-smoke.mjs fatal:", e);
  process.exit(1);
});
