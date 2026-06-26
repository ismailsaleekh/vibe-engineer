#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, relative, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_PACKAGES = [
  ["packages/cli", "vibe-engineer", false],
  ["packages/artifacts", "@vibe-engineer/artifacts", true],
  ["packages/config", "@vibe-engineer/config", true],
  ["packages/orchestration", "@vibe-engineer/orchestration", true],
  ["packages/registry", "@vibe-engineer/registry", true],
  ["packages/skills", "@vibe-engineer/skills", true],
  ["packages/schematics", "@vibe-engineer/schematics", true],
  ["packages/context", "@vibe-engineer/context", true],
  ["packages/verification", "@vibe-engineer/verification", true],
  ["packages/mechanical-gates", "@vibe-engineer/mechanical-gates", true],
  ["packages/contracts", "@vibe-engineer/contracts", true],
  ["packages/security", "@vibe-engineer/security", true],
  ["packages/observability", "@vibe-engineer/observability", true],
  ["packages/standards", "@vibe-engineer/standards", true],
  ["packages/presets/typescript", "@vibe-engineer/preset-typescript", true],
  ["packages/presets/nest-react-rn", "@vibe-engineer/preset-nest-react-rn", true],
  ["packages/adapters/pi", "@vibe-engineer/adapter-pi", true],
  ["packages/testing", "@vibe-engineer/testing", true],
];

const STRICT_TS_FLAGS = {
  strict: true,
  noImplicitAny: true,
  strictNullChecks: true,
  strictFunctionTypes: true,
  strictBindCallApply: true,
  strictPropertyInitialization: true,
  noImplicitThis: true,
  alwaysStrict: true,
  exactOptionalPropertyTypes: true,
  noUncheckedIndexedAccess: true,
  noImplicitOverride: true,
  noImplicitReturns: true,
  noPropertyAccessFromIndexSignature: true,
  useUnknownInCatchVariables: true,
  noFallthroughCasesInSwitch: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  allowUnreachableCode: false,
  allowUnusedLabels: false,
  isolatedModules: true,
  verbatimModuleSyntax: true,
  forceConsistentCasingInFileNames: true,
};

const WITNESS_MODES = new Set(["current-surface", "skeleton-snapshot"]);

function parseArgs(argv) {
  const args = { root: process.cwd(), mode: "current-surface" };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--root") {
      i += 1;
      args.root = argv[i];
    } else if (argv[i] === "--mode") {
      i += 1;
      args.mode = argv[i];
    } else if (argv[i] === "--skeleton-snapshot") {
      args.mode = "skeleton-snapshot";
    } else {
      throw new Error(`Unknown argument: ${argv[i]}`);
    }
  }
  if (!WITNESS_MODES.has(args.mode)) {
    throw new Error(`Invalid --mode: ${args.mode}`);
  }
  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fail(code, message, details = {}) {
  return { ok: false, code, message, details };
}

function rel(root, path) {
  return relative(root, path).split("\\").join("/");
}

function runPnpmGraph(root) {
  const result = spawnSync("pnpm", ["-r", "list", "--depth", "-1", "--json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    return fail("PNPM_WORKSPACE_GRAPH_UNAVAILABLE", "pnpm workspace graph command failed", {
      status: result.status,
      stderr: result.stderr.trim(),
      stdout: result.stdout.trim(),
    });
  }
  try {
    const parsed = JSON.parse(result.stdout);
    if (!Array.isArray(parsed)) {
      return fail("PNPM_WORKSPACE_GRAPH_SHAPE", "pnpm graph output was not an array");
    }
    return { ok: true, graph: parsed };
  } catch (error) {
    return fail("PNPM_WORKSPACE_GRAPH_JSON", "pnpm graph output was not valid JSON", {
      error: String(error),
      stdout: result.stdout.slice(0, 2000),
    });
  }
}

function productionDependencySections(pkg) {
  return ["dependencies", "optionalDependencies", "peerDependencies"].flatMap((section) => {
    const value = pkg[section];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value).map((name) => [section, name]);
    }
    return [];
  });
}

function validate(root, options) {
  const failures = [];
  const enforceSkeletonOnlyPackageDirectories = options.mode === "skeleton-snapshot";
  const rootPackagePath = join(root, "package.json");
  if (!existsSync(rootPackagePath)) {
    failures.push(fail("ROOT_PACKAGE_MISSING", "Root package.json is missing"));
    return failures;
  }

  const rootPackage = readJson(rootPackagePath);
  if (rootPackage.name !== "@vibe-engineer/workspace") {
    failures.push(fail("ROOT_PACKAGE_NAME", "Root package name must be @vibe-engineer/workspace", { actual: rootPackage.name }));
  }
  if (rootPackage.private !== true) {
    failures.push(fail("ROOT_PACKAGE_PRIVATE", "Root package must be private"));
  }
  if (rootPackage.license !== "MIT") {
    failures.push(fail("ROOT_LICENSE", "Root package license must be MIT", { actual: rootPackage.license }));
  }
  if (typeof rootPackage.packageManager !== "string" || !rootPackage.packageManager.startsWith("pnpm@")) {
    failures.push(fail("PACKAGE_MANAGER", "Root packageManager must pin pnpm"));
  }

  const requiredFiles = [
    "pnpm-workspace.yaml",
    "turbo.json",
    "tsconfig.base.json",
    "eslint.config.mjs",
    "prettier.config.mjs",
    ".gitignore",
    ".npmrc",
  ];
  for (const file of requiredFiles) {
    if (!existsSync(join(root, file))) {
      failures.push(fail("ROOT_CONFIG_MISSING", `Required root config file is missing: ${file}`));
    }
  }

  if (existsSync(join(root, "packages/core"))) {
    failures.push(fail("FORBIDDEN_CORE_PACKAGE", "packages/core must not exist"));
  }
  for (const adapter of ["packages/adapters/claude-code", "packages/adapters/codex", "packages/adapters/opencode"]) {
    if (existsSync(join(root, adapter))) {
      failures.push(fail("FORBIDDEN_FUTURE_ADAPTER", `Future non-pi adapter must not exist in I-00A: ${adapter}`));
    }
  }

  if (existsSync(join(root, "tsconfig.base.json"))) {
    const tsconfig = readJson(join(root, "tsconfig.base.json"));
    const compilerOptions = tsconfig.compilerOptions ?? {};
    for (const [flag, expected] of Object.entries(STRICT_TS_FLAGS)) {
      if (compilerOptions[flag] !== expected) {
        failures.push(fail("STRICT_TS_FLAG", `tsconfig.base.json must preserve ${flag}=${expected}`, { actual: compilerOptions[flag] }));
      }
    }
  }

  const graphResult = runPnpmGraph(root);
  if (!graphResult.ok) {
    failures.push(graphResult);
    return failures;
  }
  const graphByNameAndPath = new Map();
  for (const item of graphResult.graph) {
    if (typeof item?.name === "string" && typeof item?.path === "string") {
      graphByNameAndPath.set(`${item.name}\u0000${rel(root, item.path)}`, item);
    }
  }

  for (const [dir, name, shouldBePrivate] of REQUIRED_PACKAGES) {
    const pkgPath = join(root, dir, "package.json");
    if (!existsSync(pkgPath)) {
      failures.push(fail("PACKAGE_MANIFEST_MISSING", `Required package manifest is missing: ${dir}/package.json`));
      continue;
    }
    const pkg = readJson(pkgPath);
    if (pkg.name !== name) {
      failures.push(fail("PACKAGE_NAME", `Package ${dir} has wrong name`, { expected: name, actual: pkg.name }));
    }
    if (shouldBePrivate && pkg.private !== true) {
      failures.push(fail("INTERNAL_PACKAGE_PRIVATE", `Internal package must be private: ${dir}`));
    }
    if (dir === "packages/cli" && pkg.name !== "vibe-engineer") {
      failures.push(fail("CLI_IDENTITY", "CLI/public package identity must remain vibe-engineer"));
    }
    if (dir === "packages/testing") {
      if (pkg.private !== true || pkg.vibeEngineer?.testOnly !== true || pkg.vibeEngineer?.productionDependencyAllowed !== false) {
        failures.push(fail("TESTING_PACKAGE_POSTURE", "packages/testing must be private and marked test-only"));
      }
    }
    if (!graphByNameAndPath.has(`${name}\u0000${dir}`)) {
      failures.push(fail("PNPM_GRAPH_PACKAGE_MISSING", `pnpm workspace graph does not include ${name} at ${dir}`));
    }
    const prodDeps = productionDependencySections(pkg).filter(([, dep]) => dep === "@vibe-engineer/testing");
    if (prodDeps.length > 0) {
      failures.push(fail("TESTING_PRODUCTION_DEPENDENCY", `${dir} has a production dependency on @vibe-engineer/testing`, { prodDeps }));
    }
    if (pkg.bin !== undefined) {
      const entries = typeof pkg.bin === "string" ? [[pkg.name, pkg.bin]] : Object.entries(pkg.bin);
      for (const [binName, target] of entries) {
        if (typeof target !== "string" || !existsSync(resolve(root, dir, target))) {
          failures.push(fail("FAKE_CLI_BIN", `${dir} declares bin ${binName} pointing at a nonexistent file`, { target }));
        }
      }
    }
    if (enforceSkeletonOnlyPackageDirectories) {
      const packageFiles = readdirSync(join(root, dir)).filter((entry) => entry !== "package.json");
      if (packageFiles.length > 0) {
        failures.push(fail("PACKAGE_SOURCE_CREATED", `I-00A skeleton snapshot must contain only package.json: ${dir}`, { entries: packageFiles }));
      }
    }
  }

  return failures;
}

const args = parseArgs(process.argv);
const root = resolve(args.root);
const failures = validate(root, { mode: args.mode });
const result = {
  ok: failures.length === 0,
  root,
  mode: args.mode,
  checkedAt: new Date().toISOString(),
  requiredPackageCount: REQUIRED_PACKAGES.length,
  failures,
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
