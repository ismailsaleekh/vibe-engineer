import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

/**
 * I-15B-1 nest-react-rn preset witness.
 *
 * REAL-BOUNDARY POSTURE (quality bar: shape-green is not truth-green).
 *
 * The nest-react-rn preset CONSUMES @vibe-engineer/preset-typescript through
 * its public export (top-level import in src/index.ts). Under strict pnpm
 * (shamefully-hoist=false, link-workspace-packages=true), that bare specifier
 * resolves from the nest-react-rn preset-package resolution context ONLY via
 * the node_modules link materialized by the (now DONE, Step-0) serialized
 * `pnpm install`.
 *
 * RUNTIME GAUNTLET EXECUTES IN-CONTEXT (Step-2 fix for the B3 advisory).
 * The previous design compiled preset source to a WORK-ROOT
 * (.vibe/work/.../compiled/) and runtime-imported it there — but from that
 * work-root location the bare specifier @vibe-engineer/preset-typescript does
 * NOT resolve via the node_modules upward walk (the link lives under
 * packages/presets/nest-react-rn/node_modules, the preset-package context).
 * I-07D's work-root compile+load works only because I-07D src/index.ts has NO
 * module-level bare-specifier imports; I-15B-1 consumes the TS preset at module
 * top level, so the work-root load is the wrong context.
 *
 * Fix (faithful to the I-07D packageSelfImportCommand precedent + the Node-24
 * native type-stripping precedent): load the preset public API IN-CONTEXT via
 * package self-reference — import("@vibe-engineer/preset-nest-react-rn"). This
 * witness runner .mjs is physically located under packages/presets/nest-react-rn/,
 * so Node self-reference resolves (exports["."].import -> ./src/index.ts, loaded
 * via Node-24 type-stripping); the consumed @vibe-engineer/preset-typescript then
 * resolves through the package's node_modules link. This uses the PUBLIC bare
 * specifier (the package's own declared name+exports — the public contract), NOT
 * a forbidden private/internal scoped import into harness internals. No new
 * node_modules link, no lockfile touch, no out-of-context compile.
 *
 * Phases:
 *   PHASE A — structural/syntax checks needing NO node_modules link: node --check
 *             on every produced .ts/.mjs, template JSON parse, package manifest
 *             invariants, source hygiene scan, public-bare-specifier consumption.
 *   PHASE B — keystone real-boundary probes:
 *     B1 W-RESOLVE-TS-PRESET — real resolve of @vibe-engineer/preset-typescript
 *        from the preset-package resolution context.
 *     B2 W-PRESET-CONTRACT (compile) — tsc --noEmit type-check (type-clean proof).
 *     B3 W-PRESET-CONTRACT (runtime) — in-context self-reference load of the
 *        preset public API + render + validate(rendered) + layout/manifest +
 *        preset-side W-NEG-* negative gauntlet + structural negatives +
 *        renderer-options negatives + defensive-copy.
 */

const repositoryRoot = resolve(fileURLToPath(new URL("../../../../..", import.meta.url)));
const presetRoot = join(repositoryRoot, "packages/presets/nest-react-rn");
const workRoot = join(repositoryRoot, ".vibe/work/I-15B-1-preset-package");
const evidenceRoot = join(workRoot, "evidence");
const step2EvidenceRoot = join(workRoot, "step2-evidence");
const tscBin = join(repositoryRoot, "node_modules/.bin/tsc");

const PRESET_PUBLIC_NAME = "@vibe-engineer/preset-nest-react-rn";

const SOURCE_FILES = [
  "src/index.ts",
  "fixtures/consumer/public-api-consumer.ts",
  "fixtures/witnesses/run-nest-react-rn-preset-witness.mjs",
];

const TEMPLATE_FILES = [
  "starter-layout.json",
  "starter-tsconfig-base.json",
  "starter-app-tsconfig.json",
  "starter-pnpm-workspace.json",
  "starter-turbo-tasks.json",
  "starter-package-manifest.json",
  "starter-harness-config.json",
  "starter-context-placeholder.json",
];

function runCommand(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10,
  });
  return {
    command: [command, ...args].join(" "),
    cwd,
    status: result.status,
    signal: result.signal,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function cloneGeneratedFiles(files) {
  return files.map((file) => ({
    ...file,
    manifest: {
      ...file.manifest,
      requiredStandardIds: [...file.manifest.requiredStandardIds],
    },
  }));
}

function mutateContent(files, path, mutator) {
  return cloneGeneratedFiles(files).map((file) =>
    file.path === path ? { ...file, content: mutator(file.content) } : file,
  );
}

function expectRejected(name, files, validator, expectedCode) {
  const result = validator(files);
  assertCondition(!result.ok, `${name} unexpectedly passed validation.`);
  assertCondition(
    result.findings.some((finding) => finding.code === expectedCode),
    `${name} did not emit ${expectedCode}; saw ${result.findings.map((finding) => finding.code).join(",")}`,
  );
  return { name, ok: true, expectedCode, observedCodes: result.findings.map((finding) => finding.code) };
}

async function main() {
  await mkdir(evidenceRoot, { recursive: true });
  await mkdir(step2EvidenceRoot, { recursive: true });

  // =====================================================================
  // PHASE A — structural / syntax evidence (NO node_modules link required)
  // =====================================================================

  // A1. node --check on every produced source file (syntax only; no module
  // resolution, so unaffected by the missing workspace link).
  const nodeCheckResults = [];
  for (const rel of SOURCE_FILES) {
    const abs = join(presetRoot, rel);
    const probe = runCommand("node", ["--check", abs], repositoryRoot);
    nodeCheckResults.push({ path: rel, status: probe.status, stderr: probe.stderr.slice(0, 1000) });
    assertCondition(probe.status === 0, `node --check failed for ${rel}: ${probe.stderr}`);
  }

  // A2. Template JSON parse + key-shape evidence.
  const templateEvidence = [];
  for (const rel of TEMPLATE_FILES) {
    const data = JSON.parse(await readFile(join(presetRoot, "templates", rel), "utf8"));
    templateEvidence.push({ file: rel, keys: Object.keys(data).sort() });
  }

  // A3. Package manifest invariants (in-license declarations).
  const packageManifest = JSON.parse(await readFile(join(presetRoot, "package.json"), "utf8"));
  assertCondition(packageManifest.name === PRESET_PUBLIC_NAME, "Preset package name is wrong.");
  assertCondition(packageManifest.private === true, "Preset package must remain private.");
  assertCondition(
    packageManifest.dependencies?.["@vibe-engineer/preset-typescript"] === "workspace:*",
    "Preset package must declare workspace:* dep on the consumed TypeScript preset (in-license manifest edit; link materialized by serialized pnpm install).",
  );
  assertCondition(
    packageManifest.vibeEngineer?.implementationStatus === "implemented",
    "Preset package must mark implementationStatus: implemented.",
  );
  assertCondition(
    packageManifest.exports?.["."]?.import === "./src/index.ts",
    "Preset package must export its public contract at . → src/index.ts.",
  );

  // A4. Source hygiene: no stray JS/MJS/CJS in preset src (TS-only, like I-07D).
  const sourceProductionJsScan = runCommand(
    "find",
    ["packages/presets/nest-react-rn/src", "-type", "f", "(", "-name", "*.js", "-o", "-name", "*.mjs", "-o", "-name", "*.cjs", ")", "-print"],
    repositoryRoot,
  );
  assertCondition(
    sourceProductionJsScan.status === 0 && sourceProductionJsScan.stdout.trim() === "",
    "Preset production source must not contain JS/MJS/CJS files.",
  );

  // A5. Source consumes the TS preset via the PUBLIC bare specifier only — no
  // relative/`:../` import into packages/presets/typescript (W-NEG-PRIVATE-SCOPED-IMPORT).
  const sourceContent = await readFile(join(presetRoot, "src/index.ts"), "utf8");
  assertCondition(
    sourceContent.includes('from "@vibe-engineer/preset-typescript"'),
    "Preset source must consume the TypeScript preset via its public bare specifier.",
  );
  assertCondition(
    !/\.\.\/.*(typescript|presets)/.test(sourceContent),
    "Preset source must NOT use a relative/`:../` import into the TypeScript preset package (private scoped import forbidden).",
  );

  // =====================================================================
  // PHASE B — keystone real-boundary probes.
  // =====================================================================

  // B1. W-RESOLVE-TS-PRESET: real resolve of the consumed TypeScript preset
  // from the nest-react-rn preset-package resolution context.
  const resolveTsPresetCommand = runCommand(
    "node",
    [
      "--input-type=module",
      "-e",
      "const m = await import('@vibe-engineer/preset-typescript'); console.log('TS_PRESET_OK', typeof m.renderTypeScriptPresetFiles, m.TYPESCRIPT_COMPILER_STRICT_OPTIONS.strict);",
    ],
    presetRoot,
  );

  // B2. W-PRESET-CONTRACT (compile): tsc --noEmit type-check of the preset
  // package (the type-clean proof). No emit — B3 loads the source in-context
  // via self-reference, so compiled output is unnecessary.
  const compileCommand = runCommand(
    tscBin,
    ["--noEmit", "-p", "packages/presets/nest-react-rn/tsconfig.json"],
    repositoryRoot,
  );

  // B3. W-PRESET-CONTRACT (runtime): load the preset public API IN-CONTEXT via
  // package self-reference (the Step-2 fix for the B3 out-of-context advisory).
  // This witness runner .mjs is physically under packages/presets/nest-react-rn/,
  // so Node resolves the self-reference to exports["."].import -> ./src/index.ts
  // (Node-24 native type-stripping), and the consumed @vibe-engineer/preset-typescript
  // resolves through the package's node_modules link.
  let b3LoadEvidence = { status: "pending", importMechanism: "in-context-self-reference", specifier: PRESET_PUBLIC_NAME };
  let api = null;
  try {
    api = await import(PRESET_PUBLIC_NAME);
    b3LoadEvidence = {
      status: "green",
      importMechanism: "in-context-self-reference",
      specifier: PRESET_PUBLIC_NAME,
      exportedKeys: Object.keys(api),
      hasRender: typeof api.renderNestReactRnPresetFiles === "function",
      hasValidate: typeof api.validateNestReactRnPresetFiles === "function",
      hasLayout: typeof api.getStarterLayoutDeclaration === "function",
      hasManifest: typeof api.getNestReactRnPresetFileManifest === "function",
      hasMetadata: typeof api.getNestReactRnPresetMetadata === "function",
      hasOptionsError: typeof api.NestReactRnPresetOptionsError === "function",
    };
  } catch (error) {
    b3LoadEvidence = {
      status: "failed",
      importMechanism: "in-context-self-reference",
      specifier: PRESET_PUBLIC_NAME,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
  }
  // Checkpoint the B3-load evidence immediately (sessions can die mid-gauntlet).
  await writeFile(
    join(step2EvidenceRoot, "b3-load.json"),
    `${JSON.stringify(b3LoadEvidence, null, 2)}\n`,
    "utf8",
  );

  // B3-render + B3-validate (positive W-PRESET-CONTRACT runtime).
  let runtimeEvidence = { status: "skipped", reason: "B3 in-context load did not succeed." };
  let positiveValidationOk = false;
  let positiveValidationFindings = [];
  let renderedFiles = null;
  if (api !== null) {
    renderedFiles = api.renderNestReactRnPresetFiles();
    const validation = api.validateNestReactRnPresetFiles(renderedFiles);
    positiveValidationOk = validation.ok === true;
    positiveValidationFindings = validation.ok ? [] : validation.findings;
    runtimeEvidence = {
      status: validation.ok ? "green" : "blocked-source-defect",
      renderFileCount: renderedFiles.length,
      validationOk: validation.ok,
      validationFindings: positiveValidationFindings,
    };
  }
  await writeFile(
    join(step2EvidenceRoot, "b3-runtime.json"),
    `${JSON.stringify(runtimeEvidence, null, 2)}\n`,
    "utf8",
  );

  // B3-layout + B3-manifest invariants (run when the API loaded, regardless of
  // the positive validation outcome — these are independent API-shape checks).
  let layoutEvidence = { status: "skipped", reason: "B3 in-context load did not succeed." };
  let manifestEvidence = { status: "skipped", reason: "B3 in-context load did not succeed." };
  if (api !== null) {
    const layout = api.getStarterLayoutDeclaration();
    const manifestLength = api.getNestReactRnPresetFileManifest().length;
    const metadata = api.getNestReactRnPresetMetadata();
    layoutEvidence = {
      status: "green",
      appCount: layout.apps.length,
      packageCount: layout.packages.length,
      scope: layout.scope,
      goldenModule: layout.goldenModule,
      authStance: layout.authStance,
      persistence: layout.persistence,
      contractMechanism: layout.contractMechanism,
      agenticHarness: layout.agenticHarness,
      appsMatchDl16:
        layout.apps.length === 3 &&
        layout.apps.every((app, index) => ["api", "web", "mobile"][index] === app.id),
      packagesMatchDl16:
        layout.packages.length === 6 &&
        layout.packages.every((pkg, index) =>
          ["domain", "contracts", "api-client", "config", "testing", "ui"][index] === pkg.name,
        ),
    };
    manifestEvidence = {
      status: "green",
      manifestLength,
      renderedEqualsManifest: renderedFiles !== null && renderedFiles.length === manifestLength,
      presetId: metadata.presetId,
      consumedTypescriptPresetId: metadata.consumedTypescriptPresetId,
    };
    assertCondition(layout.apps.length === 3, "DL-16 requires exactly 3 apps.");
    assertCondition(layout.packages.length === 6, "DL-16 requires exactly 6 packages.");
    assertCondition(layout.scope === "@vibe-engineer-starter", "DL-16 scope must be @vibe-engineer-starter.");
    assertCondition(layout.agenticHarness === "pi", "DL-06 requires agenticHarness=pi.");
    assertCondition(
      manifestEvidence.renderedEqualsManifest,
      "Rendered file count must equal manifest length.",
    );
  }

  // B3 negative gauntlet (preset-side W-NEG-* + structural negatives). Run when
  // the API loaded. expectRejected uses .some over findings, so it correctly
  // asserts the injected defect is caught even if a baseline finding is present.
  const negativeResults = [];
  let defensiveCopyEvidence = { status: "skipped", reason: "B3 in-context load did not succeed." };
  let rendererOptionsEvidence = [];
  if (api !== null && renderedFiles !== null) {
    const validate = api.validateNestReactRnPresetFiles;

    // Preset-side W-NEG-* (fail closed).
    negativeResults.push(
      expectRejected(
        "W-NEG-OVER-INFERENCE: injected business-domain term in core file",
        mutateContent(renderedFiles, "tsconfig.base.json", (content) => `${content}\n// checkout\n`),
        validate,
        "PRESET_DOMAIN_SPECIFIC_CORE_TEXT",
      ),
    );
    negativeResults.push(
      expectRejected(
        "W-NEG-NON-PI-HARNESS: agenticHarness != pi",
        mutateContent(renderedFiles, "vibe-engineer.config.json", (content) =>
          content.replace('"agenticHarness": "pi"', '"agenticHarness": "octocode"'),
        ),
        validate,
        "PRESET_NON_PI_HARNESS",
      ),
    );
    negativeResults.push(
      expectRejected(
        "W-NEG-COPIED-HARNESS-LOGIC: copied-logic marker in starter code",
        mutateContent(renderedFiles, "eslint.config.mjs", (content) =>
          `${content}\n// getPiGeneratedFileManifest copied\n`,
        ),
        validate,
        "PRESET_COPIED_HARNESS_LOGIC",
      ),
    );
    negativeResults.push(
      expectRejected(
        "W-NEG-PRIVATE-SCOPED-IMPORT: private @vibe-engineer/* harness import",
        mutateContent(renderedFiles, "apps/api/src/golden-records/sample.ts", (content) =>
          `${content}\nimport { x } from "@vibe-engineer/adapter-pi";\n`,
        ),
        validate,
        "PRESET_PRIVATE_SCOPED_IMPORT",
      ),
    );

    // Structural negatives.
    negativeResults.push(
      expectRejected(
        "strict flag weakened in root tsconfig",
        mutateContent(renderedFiles, "tsconfig.base.json", (content) =>
          content.replace('"strict": true', '"strict": false'),
        ),
        validate,
        "PRESET_TS_DEFAULTS_DRIFT",
      ),
    );
    negativeResults.push(
      expectRejected(
        "package tsconfig weakened (no extends base)",
        mutateContent(renderedFiles, "packages/domain/tsconfig.json", (content) =>
          content.replace('"extends": "../../tsconfig.base.json"', '"extends": "./tsconfig.loose.json"'),
        ),
        validate,
        "PRESET_PACKAGE_TSCONFIG_WEAKENED",
      ),
    );
    negativeResults.push(
      expectRejected(
        "missing required file",
        renderedFiles.filter((file) => file.path !== "turbo.json"),
        validate,
        "PRESET_MISSING_REQUIRED_FILE",
      ),
    );
    negativeResults.push(
      expectRejected(
        "malformed json",
        mutateContent(renderedFiles, "tsconfig.base.json", () => "{"),
        validate,
        "PRESET_MALFORMED_JSON",
      ),
    );
    negativeResults.push(
      expectRejected(
        "unsafe path traversal",
        [{ ...renderedFiles[0], path: "../escape.json", manifest: { ...renderedFiles[0].manifest, outputPath: "../escape.json" } }, ...renderedFiles.slice(1)],
        validate,
        "PRESET_UNSAFE_GENERATED_PATH",
      ),
    );
    negativeResults.push(
      expectRejected(
        "duplicate generated path",
        [renderedFiles[0], { ...renderedFiles[1], path: renderedFiles[0].path, manifest: { ...renderedFiles[1].manifest, outputPath: renderedFiles[0].path } }, ...renderedFiles.slice(2)],
        validate,
        "PRESET_DUPLICATE_GENERATED_PATH",
      ),
    );
    negativeResults.push(
      expectRejected(
        "manifest content mismatch (wrong kind)",
        [{ ...renderedFiles[0], kind: "eslint-config" }, ...renderedFiles.slice(1)],
        validate,
        "PRESET_MANIFEST_CONTENT_MISMATCH",
      ),
    );

    // Renderer-options negatives (must throw NestReactRnPresetOptionsError).
    const rendererOptionsNegatives = [
      ["unknown renderer option", { unexpectedOption: true }],
      ["wrong includeSampleSource type", { includeSampleSource: "false" }],
      ["null renderer options", null],
    ];
    for (const [name, options] of rendererOptionsNegatives) {
      try {
        api.renderNestReactRnPresetFiles(options);
        throw new Error(`${name} unexpectedly rendered.`);
      } catch (error) {
        assertCondition(
          error instanceof api.NestReactRnPresetOptionsError,
          `${name} did not throw NestReactRnPresetOptionsError.`,
        );
        assertCondition(
          error.code === "PRESET_MALFORMED_RENDER_OPTIONS",
          `${name} did not expose stable malformed options code.`,
        );
        rendererOptionsEvidence.push({ name, ok: true, code: error.code, message: error.message });
      }
    }

    // Defensive-copy: the manifest returned by the accessor must not be mutable
    // by the caller (mirrors the I-07D defensive-copy witness).
    const defensiveManifest = api.getNestReactRnPresetFileManifest();
    const originalLength = defensiveManifest[0].requiredStandardIds.length;
    let defensiveCopyBlockedMutation = false;
    try {
      defensiveManifest[0].requiredStandardIds.push("mutated");
    } catch {
      defensiveCopyBlockedMutation = true;
    }
    const defensiveManifestAfterMutation = api.getNestReactRnPresetFileManifest();
    assertCondition(
      defensiveCopyBlockedMutation || defensiveManifestAfterMutation[0].requiredStandardIds.length === originalLength,
      "Manifest defensive copy behavior failed.",
    );
    defensiveCopyEvidence = { status: "green", blockedMutation: defensiveCopyBlockedMutation, stableLength: defensiveManifestAfterMutation[0].requiredStandardIds.length === originalLength };
  }

  // =====================================================================
  // Verdict.
  // =====================================================================

  const resolveBlocked = resolveTsPresetCommand.status !== 0;
  const compileBlocked = compileCommand.status !== 0;
  const b3LoadBlocked = b3LoadEvidence.status !== "green";
  const positiveBlocked = !positiveValidationOk;

  // The keystone (B1 resolve + B2 compile + B3 load) must all be green for the
  // resolution/type/runtime-load seam to be truth-green. A RED positive
  // validation (B3) is reported as a SOURCE DEFECT (root cause in src, not in
  // the witness runner) — never faked green, never weakened.
  const keystoneBlocked = resolveBlocked || compileBlocked || b3LoadBlocked;
  const gauntletBlocked = keystoneBlocked || positiveBlocked;

  let blockReason = null;
  if (keystoneBlocked) {
    blockReason =
      "W-RESOLVE-TS-PRESET / W-PRESET-CONTRACT (compile) / B3 in-context load: a keystone real-boundary probe is not green. See phaseB evidence.";
  } else if (positiveBlocked) {
    blockReason = `W-PRESET-CONTRACT (runtime positive): validate(renderNestReactRnPresetFiles(rendered)) is NOT ok. This is a SOURCE DEFECT in packages/presets/nest-react-rn/src/index.ts (UNTOUCHABLE by Step-2 — owned by the preset product source, not the witness runner). Findings: ${JSON.stringify(positiveValidationFindings)}. The B3 in-context load itself is GREEN (self-reference resolves, render + layout + manifest + the full negative gauntlet all run); the RED is the preset's OWN validator false-positiving on its OWN rendered output. Root cause: the domain-neutral vocabulary matcher (validateDomainNeutralText) uses a coarse case-insensitive substring check against FORBIDDEN_DOMAIN_TERMS; the term "product" (an e-commerce business-domain term) matches the legitimate technical word "production" embedded in the STARTER_PACKAGES.testing.boundaryRule text ("Test-only; no production package may depend on it."), which is serialized into the generated manifest. Ruling needed: authorize an in-license edit to packages/presets/nest-react-rn/src/** to make the domain-term matcher word-boundary aware (so "production" no longer matches "product") OR reword the boundaryRule to avoid the substring. Step-2 makes ZERO out-of-license edits and does NOT weaken the validator assertion.`;
  }

  const result = {
    ok: !gauntletBlocked,
    blocked: gauntletBlocked,
    blockReason,
    phaseA: {
      nodeCheckResults,
      templateEvidence,
      packageManifest: {
        name: packageManifest.name,
        private: packageManifest.private,
        declaredTypescriptPresetDep: packageManifest.dependencies?.["@vibe-engineer/preset-typescript"],
        implementationStatus: packageManifest.vibeEngineer?.implementationStatus,
        exportsImport: packageManifest.exports?.["."]?.import,
      },
      sourceHygieneClean: sourceProductionJsScan.stdout.trim() === "",
      consumesPublicBareSpecifier: true,
      noRelativeImportIntoTypescriptPreset: true,
    },
    phaseB: {
      resolveTsPresetCommand: {
        command: resolveTsPresetCommand.command,
        cwd: resolveTsPresetCommand.cwd,
        status: resolveTsPresetCommand.status,
        stdout: resolveTsPresetCommand.stdout.slice(0, 2000),
        stderr: resolveTsPresetCommand.stderr.slice(0, 2000),
      },
      compileCommand: {
        command: compileCommand.command,
        cwd: compileCommand.cwd,
        status: compileCommand.status,
        stdout: compileCommand.stdout.slice(0, 4000),
        stderr: compileCommand.stderr.slice(0, 4000),
      },
      b3LoadEvidence,
      runtimeEvidence,
      layoutEvidence,
      manifestEvidence,
      negativeResults,
      rendererOptionsEvidence,
      defensiveCopyEvidence,
    },
    repositoryRoot,
    evidenceRoot,
    step2EvidenceRoot,
  };

  const resultPath = join(evidenceRoot, "nest-react-rn-preset-witness-result.json");
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  if (gauntletBlocked) {
    console.error(
      JSON.stringify({
        ok: false,
        blocked: true,
        resultPath,
        phaseA: "green",
        resolve: resolveTsPresetCommand.status === 0 ? "green" : "blocked",
        compile: compileCommand.status === 0 ? "green" : "blocked",
        b3Load: b3LoadEvidence.status,
        positiveValidation: positiveValidationOk ? "green" : "blocked-source-defect",
        negativeGauntletCount: negativeResults.length,
        reason: blockReason,
      }),
    );
    process.exitCode = 2;
    return;
  }

  console.log(
    JSON.stringify({
      ok: true,
      blocked: false,
      resultPath,
      phaseA: "green",
      phaseB: "green",
      contract: runtimeEvidence,
      negativeCount: negativeResults.length,
    }),
  );
}

main().catch(async (error) => {
  await mkdir(evidenceRoot, { recursive: true });
  await mkdir(step2EvidenceRoot, { recursive: true });
  const failurePath = join(evidenceRoot, "nest-react-rn-preset-witness-failure.json");
  await writeFile(
    failurePath,
    `${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, null, 2)}\n`,
    "utf8",
  );
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
