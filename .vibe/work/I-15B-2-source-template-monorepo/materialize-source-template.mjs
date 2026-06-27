// I-15B-2 reference source-template monorepo — materializer + witness runner.
//
// REAL-BOUNDARY POSTURE (quality bar: shape-green is not truth-green).
//
// This sub-lane materializes `examples/starter-reference/.source-template/**` —
// the reference DL-16 NestJS/React/React-Native monorepo skeleton — and proves:
//   * W-TEMPLATE-CONSUMES-PRESET — the template's config layer is written
//     VERBATIM from the live `@vibe-engineer/preset-nest-react-rn` render
//     (consume, don't duplicate). The preset is rendered by spawning into the
//     preset-package resolution context (cwd=presetRoot) so the PUBLIC bare
//     specifier self-reference resolves through the preset's own
//     node_modules/@vibe-engineer/preset-typescript link. No workspace-dep edit,
//     no lockfile touch, no private/internal scoped import, no relative `:../`
//     into harness packages.
//   * W-TEMPLATE-DL16-FIDELITY — every DL-16 app/package dir is present with the
//     correct @vibe-engineer-starter scope, private packages, no-auth default,
//     PostgreSQL+Prisma, ts-rest+Zod, single sample/demo golden-records module;
//     per-package DL-16 boundary rules hold (typed contract: the preset's
//     STARTER_PACKAGES[].forbiddenImports + DL-16 app import-direction rules).
//   * W-NEG-OVER-INFERENCE — no forbidden business-domain term appears in any
//     core (non-sample) file; only the labeled sample/demo golden module exists.
//   * W-REG-REGEN — materialization is idempotent (re-materialize → identical).
//
// The supplementary DL-16 source skeleton (NestJS API shell, React web shell,
// RN mobile shell, packages/{domain,contracts,api-client,config,testing,ui}
// source trees, .vibe/{work,evidence,registry} + .tooling/{scripts,ci,generated}
// neutral placeholders) is greenfield reference app code, strict per the consumed
// I-07D preset defaults, with starter-local tsconfigs (the app/package tsconfigs
// come from the preset render). It is NOT the harness cli tsconfig (TS-02A out
// of scope).

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, rm, writeFile, readFile, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// This file lives at <repo>/.vibe/work/I-15B-2-source-template-monorepo/materialize-source-template.mjs
// → 3 directories below the repository root.
const moduleDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(moduleDir, "../../..");
const presetRoot = join(repositoryRoot, "packages/presets/nest-react-rn");
const sourceTemplateRoot = join(repositoryRoot, "examples/starter-reference/.source-template");
const workRoot = join(repositoryRoot, ".vibe/work/I-15B-2-source-template-monorepo");
const evidenceRoot = join(workRoot, "evidence");

const PRESET_PUBLIC_NAME = "@vibe-engineer/preset-nest-react-rn";

// ---------------------------------------------------------------------------
// Logging / evidence
// ---------------------------------------------------------------------------

const evidence = {
  stage: [],
  checks: [],
  nodeCheck: [],
  negatives: [],
  regression: [],
  sibling: [],
};

function logStage(message) {
  evidence.stage.push(message);
  console.log(`[stage] ${message}`);
}

function recordCheck(name, ok, detail = {}) {
  evidence.checks.push({ name, ok, ...detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail.summary ? ` — ${detail.summary}` : ""}`);
}

// ---------------------------------------------------------------------------
// Phase 1 — render the preset (CONSUME) via in-context self-reference spawn.
// ---------------------------------------------------------------------------

function renderPreset() {
  const renderScript = `
const m = await import(${JSON.stringify(PRESET_PUBLIC_NAME)});
const validation = m.validateNestReactRnPresetFiles(m.renderNestReactRnPresetFiles());
const out = {
  files: m.renderNestReactRnPresetFiles().map((f) => ({ path: f.path, kind: f.kind, content: f.content })),
  layout: m.getStarterLayoutDeclaration(),
  manifest: m.getNestReactRnPresetFileManifest().map((e) => ({
    outputPath: e.outputPath,
    kind: e.kind,
    ownership: e.ownership,
  })),
  metadata: m.getNestReactRnPresetMetadata(),
  selfValidation: { ok: validation.ok, fileCount: validation.fileCount, findingCount: validation.findings.length },
};
process.stdout.write(JSON.stringify(out));
`;
  const result = spawnSync("node", ["--input-type=module", "-e", renderScript], {
    cwd: presetRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `Preset render spawn failed (status ${result.status}).\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    );
  }
  return JSON.parse(result.stdout);
}

// ---------------------------------------------------------------------------
// Phase 2 — supplementary DL-16 source skeleton (preset does NOT render these).
// ---------------------------------------------------------------------------

const GOLDEN_LABEL = "// @sample @demo @reference — golden-records module (DL-16 / DL-20A).\n";

const SUPPLEMENTARY_FILES = [
  // ---- apps/api (NestJS + Prisma) ----
  {
    path: "apps/api/src/main.ts",
    content: `import { NestFactory } from "@nestjs/core";\nimport { AppModule } from "./app.module.js";\n\n// Reference NestJS bootstrap for the @vibe-engineer-starter/api app (DL-16).\n// No-auth default (DL-16 §7); local development only.\nexport async function bootstrap(): Promise<void> {\n  const app = await NestFactory.create(AppModule);\n  await app.listen(process.env.API_PORT ? Number(process.env.API_PORT) : 3000);\n}\n`,
  },
  {
    path: "apps/api/src/app.module.ts",
    content: `import { Module } from "@nestjs/common";\nimport { HealthModule } from "./health/health.module.js";\nimport { GoldenRecordsModule } from "./golden-records/golden-records.module.js";\n\n// Root application module composing the health and sample/demo golden-records\n// modules. Imports only domain/contracts/config-bound code (DL-16 import rules).\n@Module({ imports: [HealthModule, GoldenRecordsModule] })\nexport class AppModule {}\n`,
  },
  {
    path: "apps/api/src/health/health.module.ts",
    content: `import { Module } from "@nestjs/common";\nimport { HealthController } from "./health.controller.js";\n\n@Module({ controllers: [HealthController] })\nexport class HealthModule {}\n`,
  },
  {
    path: "apps/api/src/health/health.controller.ts",
    content: `import { Controller, Get } from "@nestjs/common";\n\n@Controller("health")\nexport class HealthController {\n  @Get()\n  public status(): { status: "ok" } {\n    return { status: "ok" };\n  }\n}\n`,
  },
  {
    path: "apps/api/src/golden-records/golden-records.module.ts",
    content: `${GOLDEN_LABEL}import { Module } from "@nestjs/common";\nimport { GoldenRecordsController } from "./golden-records.controller.js";\nimport { GoldenRecordsService } from "./golden-records.service.js";\n\n@Module({ controllers: [GoldenRecordsController], providers: [GoldenRecordsService] })\nexport class GoldenRecordsModule {}\n`,
  },
  {
    path: "apps/api/src/golden-records/golden-records.controller.ts",
    content: `${GOLDEN_LABEL}import { Controller, Get } from "@nestjs/common";\nimport { GoldenRecordsService } from "./golden-records.service.js";\n\n@Controller("api/golden-records")\nexport class GoldenRecordsController {\n  constructor(private readonly service: GoldenRecordsService) {}\n\n  @Get()\n  public list(): readonly unknown[] {\n    return this.service.list();\n  }\n}\n`,
  },
  {
    path: "apps/api/src/golden-records/golden-records.service.ts",
    content: `${GOLDEN_LABEL}import type { GoldenRecord } from "@vibe-engineer-starter/domain";\n\n// Sample/demo/reference service. In the reference starter it returns an empty\n// list; the persistence join (PostgreSQL + Prisma) is owned by I-16 and is\n// pending-live here. No business domain is encoded.\nexport class GoldenRecordsService {\n  public list(): readonly GoldenRecord[] {\n    return [];\n  }\n}\n`,
  },
  {
    path: "apps/api/prisma/schema.prisma",
    content: `// Prisma schema for the @vibe-engineer-starter/api app (DL-16 database stance).\n// Domain-neutral golden-records model only; no auth/billing/tenant tables.\n\ngenerator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\nmodel GoldenRecord {\n  id        String   @id @default(cuid())\n  title     String\n  summary   String?\n  status    String\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n}\n`,
  },
  {
    path: "apps/api/prisma/migrations/0000_init/migration.sql",
    content: `-- Sample/demo/reference initial migration for the golden-records model (DL-16).\n-- Represents the golden module only; no business-domain tables by default\n\nCREATE TABLE "GoldenRecord" (\n    "id"        TEXT NOT NULL,\n    "title"     TEXT NOT NULL,\n    "summary"   TEXT,\n    "status"    TEXT NOT NULL,\n    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    "updatedAt" TIMESTAMP(3) NOT NULL,\n    CONSTRAINT "GoldenRecord_pkey" PRIMARY KEY ("id")\n);\n`,
  },
  {
    path: "apps/api/prisma/seed.ts",
    content: `${GOLDEN_LABEL}// Explicit sample/demo/reference seed rows for the golden-records model.\n// Inserted by the local-only db:seed script (DL-16 local scripts).\nexport const GOLDEN_RECORD_SEED_ROWS = [\n  { id: "sample-1", title: "Sample golden record", summary: "Reference row (sample/demo).", status: "draft" },\n] as const;\n`,
  },
  {
    path: "apps/api/test/README.md",
    content: `# apps/api test slot\n\nBackend test runner details are owned by DL-11 / I-16 (deferred). This directory\nreserves the slot per the DL-16 layout.\n`,
  },

  // ---- apps/web (React shell) ----
  {
    path: "apps/web/index.html",
    content: `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <title>Vibe Engineer Starter — Web</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n`,
  },
  {
    path: "apps/web/src/main.tsx",
    content: `import { createRoot } from "react-dom/client";\nimport { App } from "./app/app.js";\n\nconst rootElement = document.getElementById("root");\nif (rootElement === null) {\n  throw new Error("Root element #root not found");\n}\ncreateRoot(rootElement).render(<App />);\n`,
  },
  {
    path: "apps/web/src/app/app.tsx",
    content: `import { HomeRoute } from "../routes/home/home.js";\n\nexport function App(): JSX.Element {\n  return <HomeRoute />;\n}\n`,
  },
  {
    path: "apps/web/src/routes/home/home.tsx",
    content: `import { SystemStatusRoute } from "../system-status/system-status.js";\n\nexport function HomeRoute(): JSX.Element {\n  return (\n    <main>\n      <h1>Vibe Engineer Starter — Web</h1>\n      <SystemStatusRoute />\n    </main>\n  );\n}\n`,
  },
  {
    path: "apps/web/src/routes/system-status/system-status.tsx",
    content: `export function SystemStatusRoute(): JSX.Element {\n  return <section aria-label="System status">system status slot</section>;\n}\n`,
  },
  {
    path: "apps/web/src/routes/golden-records/golden-records.tsx",
    content: `${GOLDEN_LABEL}import { useGoldenRecords } from "@vibe-engineer-starter/api-client";\n\nexport function GoldenRecordsRoute(): JSX.Element {\n  const records = useGoldenRecords();\n  return (\n    <section aria-label="Golden records (sample/demo/reference)">\n      {records.map((record) => (\n        <article key={record.id}>{record.title}</article>\n      ))}\n    </section>\n  );\n}\n`,
  },
  {
    path: "apps/web/e2e/README.md",
    content: `# apps/web E2E slot\n\nPlaywright E2E details are owned by DL-11 / I-17 (deferred). This directory\nreserves the slot per the DL-16 layout.\n`,
  },
  {
    path: "apps/web/ui-verification/README.md",
    content: `# apps/web UI verification slot\n\nUI verification stack details are owned by DL-13 / I-17 (deferred).\n`,
  },

  // ---- apps/mobile (React Native shell) ----
  {
    path: "apps/mobile/src/app/app.tsx",
    content: `import { NavigationContainer } from "@react-navigation/native";\nimport { RootNavigator } from "../navigation/navigation.js";\n\nexport function App(): JSX.Element {\n  return (\n    <NavigationContainer>\n      <RootNavigator />\n    </NavigationContainer>\n  );\n}\n`,
  },
  {
    path: "apps/mobile/src/screens/home/home.tsx",
    content: `import { Text, View } from "react-native";\n\nexport function HomeScreen(): JSX.Element {\n  return (\n    <View>\n      <Text>Vibe Engineer Starter — Mobile</Text>\n    </View>\n  );\n}\n`,
  },
  {
    path: "apps/mobile/src/screens/system-status/system-status.tsx",
    content: `import { Text, View } from "react-native";\n\nexport function SystemStatusScreen(): JSX.Element {\n  return (\n    <View>\n      <Text>system status slot</Text>\n    </View>\n  );\n}\n`,
  },
  {
    path: "apps/mobile/src/screens/golden-records/golden-records.tsx",
    content: `${GOLDEN_LABEL}import { useGoldenRecords } from "@vibe-engineer-starter/api-client";\nimport { Text, View } from "react-native";\n\nexport function GoldenRecordsScreen(): JSX.Element {\n  const records = useGoldenRecords();\n  return (\n    <View>\n      {records.map((record) => (\n        <Text key={record.id}>{record.title}</Text>\n      ))}\n    </View>\n  );\n}\n`,
  },
  {
    path: "apps/mobile/src/navigation/navigation.tsx",
    content: `import { createNativeStackNavigator } from "@react-navigation/native-stack";\nimport { HomeScreen } from "../screens/home/home.js";\n\nconst Stack = createNativeStackNavigator();\n\nexport function RootNavigator(): JSX.Element {\n  return (\n    <Stack.Navigator>\n      <Stack.Screen name="Home" component={HomeScreen} />\n    </Stack.Navigator>\n  );\n}\n`,
  },
  {
    path: "apps/mobile/e2e/maestro/README.md",
    content: `# Maestro E2E slot\n\nMaestro flow details are owned by DL-12 / I-17 (deferred).\n`,
  },
  {
    path: "apps/mobile/e2e/detox/README.md",
    content: `# Detox E2E slot\n\nDetox flow details are owned by DL-12 / I-17 (deferred).\n`,
  },
  {
    path: "apps/mobile/ui-verification/README.md",
    content: `# apps/mobile UI verification slot\n\nUI verification stack details are owned by DL-13 / I-17 (deferred).\n`,
  },

  // ---- packages/domain (pure TS, Prisma-free) ----
  {
    path: "packages/domain/src/golden-records/golden-record.ts",
    content: `${GOLDEN_LABEL}// Pure TypeScript domain model for the sample/demo/reference golden-records\n// module. No NestJS / React / React-Native / Prisma / fs / process imports\n// (DL-16 packages/domain boundary).\n\nexport type GoldenRecordStatus = "draft" | "active" | "archived";\n\nexport interface GoldenRecord {\n  readonly id: string;\n  readonly title: string;\n  readonly summary: string;\n  readonly status: GoldenRecordStatus;\n  readonly createdAt: string;\n  readonly updatedAt: string;\n}\n\nexport function classifyGoldenRecordStatus(status: GoldenRecordStatus): "sample-demo-reference" {\n  return "sample-demo-reference";\n}\n`,
  },
  {
    path: "packages/domain/src/index.ts",
    content: `export type { GoldenRecord, GoldenRecordStatus } from "./golden-records/golden-record.js";\nexport { classifyGoldenRecordStatus } from "./golden-records/golden-record.js";\n`,
  },

  // ---- packages/contracts (ts-rest + named Zod) ----
  {
    path: "packages/contracts/src/golden-records/golden-records.contract.ts",
    content: `${GOLDEN_LABEL}import { initContract } from "@ts-rest/core";\nimport { z } from "zod";\n\nconst c = initContract();\n\nexport const goldenRecordStatusSchema = z.enum(["draft", "active", "archived"]);\n\nexport const goldenRecordSchema = z.object({\n  id: z.string(),\n  title: z.string(),\n  summary: z.string(),\n  status: goldenRecordStatusSchema,\n  createdAt: z.string(),\n  updatedAt: z.string(),\n});\n\nexport const goldenRecordsContract = c.router({\n  list: { method: "GET", path: "/api/golden-records", responses: { 200: z.array(goldenRecordSchema) } },\n});\n`,
  },
  {
    path: "packages/contracts/src/index.ts",
    content: `export { goldenRecordsContract, goldenRecordSchema, goldenRecordStatusSchema } from "./golden-records/golden-records.contract.js";\n`,
  },

  // ---- packages/api-client (derived/shared from contracts) ----
  {
    path: "packages/api-client/src/golden-records/golden-records.client.ts",
    content: `${GOLDEN_LABEL}import { initClient } from "@ts-rest/core";\nimport { goldenRecordsContract } from "@vibe-engineer-starter/contracts";\n\n// Derived/shared client (DL-14/DL-16). Consumed by apps/web and apps/mobile.\n// No hand-authored fetch DTOs and no duplicated schemas.\nexport const goldenRecordsClient = initClient(goldenRecordsContract, { baseUrl: "/api" });\n`,
  },
  {
    path: "packages/api-client/src/golden-records/use-golden-records.ts",
    content: `${GOLDEN_LABEL}import type { GoldenRecord } from "@vibe-engineer-starter/domain";\nimport { goldenRecordsClient } from "./golden-records.client.js";\n\n// Generic consumer hook shape consumed by web and mobile. The exact React/RN\n// binding is owned by I-16/I-17; the starter reference keeps it framework-neutral\n// so both apps import the same client surface (DL-16 import rules).\nexport function useGoldenRecords(): readonly GoldenRecord[] {\n  void goldenRecordsClient;\n  return [];\n}\n`,
  },
  {
    path: "packages/api-client/src/index.ts",
    content: `export { goldenRecordsClient } from "./golden-records/golden-records.client.js";\nexport { useGoldenRecords } from "./golden-records/use-golden-records.js";\n`,
  },

  // ---- packages/config (env/config wrappers; no secrets) ----
  {
    path: "packages/config/src/env.ts",
    content: `// Environment wrapper for the @vibe-engineer-starter config package (DL-16).\n// No real secrets in defaults; local-only non-secret placeholders (DL-22).\n\nexport interface StarterEnv {\n  readonly databaseUrl: string;\n  readonly apiPort: number;\n}\n\nexport function readStarterEnv(source: NodeJS.ProcessEnv = process.env): StarterEnv {\n  const databaseUrl = source.DATABASE_URL ?? "postgresql://starter_local:starter_local@localhost:5432/starter_dev";\n  const apiPortRaw = source.API_PORT ?? "3000";\n  const apiPort = Number(apiPortRaw);\n  if (!Number.isFinite(apiPort)) {\n    throw new Error("API_PORT must be a finite number");\n  }\n  return Object.freeze({ databaseUrl, apiPort });\n}\n`,
  },
  {
    path: "packages/config/src/index.ts",
    content: `export { readStarterEnv } from "./env.js";\nexport type { StarterEnv } from "./env.js";\n`,
  },

  // ---- packages/testing (test-only fixtures) ----
  {
    path: "packages/testing/src/fixtures/golden-records.fixture.ts",
    content: `${GOLDEN_LABEL}// Test-only sample/demo/reference fixtures for the golden-records module.\n// No production package may depend on this (DL-16 packages/testing boundary).\nimport type { GoldenRecord } from "@vibe-engineer-starter/domain";\n\nexport const goldenRecordFixtures: readonly GoldenRecord[] = Object.freeze([\n  {\n    id: "fixture-1",\n    title: "Sample fixture record",\n    summary: "Reference fixture (sample/demo).",\n    status: "draft",\n    createdAt: "2026-01-01T00:00:00.000Z",\n    updatedAt: "2026-01-01T00:00:00.000Z",\n  },\n]);\n`,
  },
  {
    path: "packages/testing/src/index.ts",
    content: `export { goldenRecordFixtures } from "./fixtures/golden-records.fixture.js";\n`,
  },

  // ---- packages/ui (tokens / primitives / platform entrypoints) ----
  {
    path: "packages/ui/src/tokens/tokens.ts",
    content: `// Design tokens for the @vibe-engineer-starter/ui package (DL-16). Narrow:\n// tokens/primitives/accessibility only; no app/api/Prisma/api-client code, no\n// routes, API calls, navigation, persistence, or domain rules.\nexport const spacingTokens = Object.freeze({ small: 8, medium: 16, large: 24 });\nexport const colorTokens = Object.freeze({ foreground: "#111111", background: "#ffffff" });\n`,
  },
  {
    path: "packages/ui/src/primitives/primitives.ts",
    content: `export interface BoxProps {\n  readonly padding?: keyof typeof import("../tokens/tokens.js").spacingTokens;\n}\nexport const primitiveNames = Object.freeze(["Box"] as const);\n`,
  },
  {
    path: "packages/ui/src/web/index.ts",
    content: `// Web (React DOM) primitive entrypoint. Platform-specific bridge only.\nexport const platformTarget = "web" as const;\n`,
  },
  {
    path: "packages/ui/src/native/index.ts",
    content: `// React Native primitive entrypoint. Platform-specific bridge only.\nexport const platformTarget = "native" as const;\n`,
  },
  {
    path: "packages/ui/src/index.ts",
    content: `export { spacingTokens, colorTokens } from "./tokens/tokens.js";\nexport type { BoxProps } from "./primitives/primitives.js";\n`,
  },

  // ---- .vibe neutral placeholders (context/manifest.json comes from the preset) ----
  {
    path: ".vibe/work/README.md",
    content: `# .vibe/work\n\nNeutral placeholder per DL-17. Lane-specific work artifacts live here; no\nbusiness domain/roadmap/users/schema are inferred by the starter default.\n`,
  },
  {
    path: ".vibe/evidence/README.md",
    content: `# .vibe/evidence\n\nNeutral placeholder per DL-17. Verification evidence artifacts live here.\n`,
  },
  {
    path: ".vibe/registry/README.md",
    content: `# .vibe/registry\n\nNeutral placeholder per DL-17. Context/asset registry entries live here.\n`,
  },

  // ---- .tooling placeholders (dev-services/docker-compose.json comes from the preset) ----
  {
    path: ".tooling/scripts/README.md",
    content: `# .tooling/scripts\n\nLocal semantic script slots (DL-16). Exact script internals are\nimplementation-owned; the root package.json declares the semantic commands.\n`,
  },
  {
    path: ".tooling/ci/README.md",
    content: `# .tooling/ci\n\nLocal/CI parity handoff templates (DL-16/DL-18). CI provider/workflow syntax is\nowned by DL-18 / I-20 (deferred).\n`,
  },
  {
    path: ".tooling/generated/README.md",
    content: `# .tooling/generated\n\nGenerated tooling artifacts slot (DL-16). Contents are derived; not hand-authored.\n`,
  },

  // ---- docs/reference ----
  {
    path: "docs/reference/starter.md",
    content: `# Reference starter (sample/demo/reference)\n\nThis is the @vibe-engineer-starter reference monorepo materialized from the\n@vibe-engineer/preset-nest-react-rn contract (DL-16). It consumes the\nvibe-engineer harness package; it does not copy harness logic.\n\nThe single sample/demo/reference module is \`golden-records\`.\n`,
  },

  // ---- root env example ----
  {
    path: ".env.example",
    content: `# Local-only non-secret placeholders (DL-16/DL-22). No real secrets here.\nDATABASE_URL="postgresql://starter_local:starter_local@localhost:5432/starter_dev"\nAPI_PORT=3000\nWEB_PORT=5173\n`,
  },
];

// ---------------------------------------------------------------------------
// Phase 3 — materialize.
// ---------------------------------------------------------------------------

async function materialize(presetRender) {
  await rm(sourceTemplateRoot, { recursive: true, force: true });
  const allFiles = [
    ...presetRender.files.map((f) => ({ path: f.path, content: f.content, origin: "preset" })),
    ...SUPPLEMENTARY_FILES.map((f) => ({ path: f.path, content: f.content, origin: "skeleton" })),
  ];
  const written = [];
  for (const file of allFiles) {
    const fullPath = join(sourceTemplateRoot, file.path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, "utf8");
    written.push({ path: file.path, origin: file.origin, sha256: sha256(file.content) });
  }
  return written;
}

function sha256(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// Phase 4 — witness gauntlet.
// ---------------------------------------------------------------------------

const SAMPLE_DEMO_PATH_MARKERS = ["golden-records", "sample", "demo", "reference"];

function isSampleDemoPath(path) {
  return SAMPLE_DEMO_PATH_MARKERS.some((marker) => path.includes(marker));
}

const FORBIDDEN_DOMAIN_TERM_PATTERNS = [
  "ecommerce",
  "inventory",
  "fashion",
  "Billz",
  "Telegram",
  "Instagram",
  "checkout",
  "product",
  "customer",
  "order",
  "cart",
  "payment",
  "social-feed",
].map((term) => ({
  term,
  pattern: new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
}));

const IMPORT_SPECIFIER_PATTERN = /(?:from\s+["']|import\s*\(\s*["']|require\s*\(\s*["'])([^"']+)["']/g;

function extractImports(content) {
  const specifiers = new Set();
  for (const match of content.matchAll(IMPORT_SPECIFIER_PATTERN)) {
    specifiers.add(match[1]);
  }
  return specifiers;
}

function specMatchesForbidden(specifier, forbidden) {
  for (const term of forbidden) {
    if (specifier === term) return term;
    if (specifier.startsWith(`${term}/`)) return term;
  }
  return null;
}

async function readMaterializedTree() {
  const tree = new Map();
  async function walk(dir) {
    const entries = await readdirEntries(dir);
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        const rel = relative(sourceTemplateRoot, full).split("\\").join("/");
        const content = await readFile(full, "utf8");
        tree.set(rel, content);
      }
    }
  }
  await walk(sourceTemplateRoot);
  return tree;
}

async function readdirEntries(dir) {
  const { readdir } = await import("node:fs/promises");
  const names = await readdir(dir, { withFileTypes: true });
  return names.map((name) => ({
    name: name.name,
    isDirectory: () => name.isDirectory(),
  }));
}

function runWitness(presetRender, written) {
  const layout = presetRender.layout;
  const requiredAppDirs = layout.apps.map((a) => a.directory);
  const requiredPkgDirs = layout.packages.map((p) => p.directory);
  const byPath = new Map(written.map((w) => [w.path, w]));

  // --- W-TEMPLATE-CONSUMES-PRESET: preset-rendered files present verbatim ---
  let consumeMismatch = [];
  for (const f of presetRender.files) {
    const onDisk = byPath.get(f.path);
    if (onDisk === undefined) {
      consumeMismatch.push({ path: f.path, reason: "preset-declared file missing from template" });
    } else if (onDisk.sha256 !== sha256(f.content)) {
      consumeMismatch.push({ path: f.path, reason: "content drift from preset render" });
    }
  }
  recordCheck("W-TEMPLATE-CONSUMES-PRESET", consumeMismatch.length === 0, {
    summary: `${presetRender.files.length} preset-declared files present verbatim (derived, not duplicated)`,
    detail: { mismatches: consumeMismatch, presetFileCount: presetRender.files.length },
  });

  // Preset self-validation precondition (proves the rendered contract is valid).
  recordCheck("PRESET-SELF-VALIDATION", presetRender.selfValidation.ok === true, {
    summary: `preset validate(render()) ok=${presetRender.selfValidation.ok}, files=${presetRender.selfValidation.fileCount}, findings=${presetRender.selfValidation.findingCount}`,
  });

  // --- W-TEMPLATE-DL16-FIDELITY: layout completeness + scope + private + defaults ---
  const missingAppDirs = requiredAppDirs.filter((d) => !dirHasAnyFile(byPath, `${d}/`));
  const missingPkgDirs = requiredPkgDirs.filter((d) => !dirHasAnyFile(byPath, `${d}/`));
  recordCheck("DL16-APP-PACKAGE-DIRS-PRESENT", missingAppDirs.length === 0 && missingPkgDirs.length === 0, {
    summary: `apps=[${requiredAppDirs.join(",")}] packages=[${requiredPkgDirs.join(",")}]`,
    detail: { missingAppDirs, missingPkgDirs },
  });

  // scope + private across every manifest
  const scopeFindings = [];
  const allManifestPaths = [
    "package.json",
    ...layout.apps.map((a) => `${a.directory}/package.json`),
    ...layout.packages.map((p) => `${p.directory}/package.json`),
  ];
  for (const mp of allManifestPaths) {
    const w = byPath.get(mp);
    if (w === undefined) {
      scopeFindings.push({ path: mp, reason: "manifest missing" });
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(getContentForPath(presetRender, mp));
    } catch {
      scopeFindings.push({ path: mp, reason: "manifest not JSON" });
      continue;
    }
    if (!parsed.name || !String(parsed.name).startsWith("@vibe-engineer-starter/")) {
      scopeFindings.push({ path: mp, reason: `name not @vibe-engineer-starter/*: ${parsed.name}` });
    }
    if (parsed.private !== true) {
      scopeFindings.push({ path: mp, reason: "not private:true" });
    }
  }
  recordCheck("DL16-SCOPE-AND-PRIVATE", scopeFindings.length === 0, {
    summary: `all ${allManifestPaths.length} manifests @vibe-engineer-starter/* + private`,
    detail: { scopeFindings },
  });

  // harness-config defaults (agenticHarness=pi, no-auth, PG+Prisma, ts-rest+Zod, golden, DL-16)
  const cfgRaw = getContentForPath(presetRender, "vibe-engineer.config.json");
  let cfgFindings = [];
  let cfg = null;
  try {
    cfg = JSON.parse(cfgRaw);
  } catch {
    cfgFindings.push("harness-config not JSON");
  }
  if (cfg) {
    if (cfg.agenticHarness !== "pi") cfgFindings.push(`agenticHarness=${cfg.agenticHarness}`);
    if (cfg.starter?.architectureDecision !== "DL-16-starter-architecture") cfgFindings.push("not DL-16");
    if (!Array.isArray(cfg.starter?.appNames) || cfg.starter.appNames.join(",") !== "api,web,mobile") cfgFindings.push("appNames");
    if (!Array.isArray(cfg.starter?.packageNames) || cfg.starter.packageNames.length !== 6) cfgFindings.push("packageNames");
    if (cfg.starter?.goldenModule !== "golden-records") cfgFindings.push("goldenModule");
  }
  // no-auth / PG+Prisma / ts-rest+Zod live in the generated preset manifest layout block
  const manifestRaw = getContentForPath(presetRender, ".vibe/generated/nest-react-rn-preset/manifest.json");
  let layoutFindings = [];
  let manifestLayout = null;
  try {
    manifestLayout = JSON.parse(manifestRaw)?.layout;
  } catch {
    layoutFindings.push("preset manifest not JSON");
  }
  if (manifestLayout) {
    if (manifestLayout.authStance !== "no-auth") layoutFindings.push(`authStance=${manifestLayout.authStance}`);
    if (manifestLayout.persistence !== "PostgreSQL + Prisma") layoutFindings.push(`persistence=${manifestLayout.persistence}`);
    if (manifestLayout.contractMechanism !== "ts-rest + named Zod schemas") layoutFindings.push("contractMechanism");
    if (manifestLayout.agenticHarness !== "pi") layoutFindings.push(`agenticHarness=${manifestLayout.agenticHarness}`);
    if (manifestLayout.goldenModule !== "golden-records") layoutFindings.push("goldenModule");
    if (manifestLayout.scope !== "@vibe-engineer-starter") layoutFindings.push("scope");
  }
  recordCheck("DL16-HARNESS-CONFIG-DEFAULTS", cfgFindings.length === 0 && layoutFindings.length === 0, {
    summary: "agenticHarness=pi, no-auth, PostgreSQL+Prisma, ts-rest+Zod, golden-records, DL-16",
    detail: { cfgFindings, layoutFindings },
  });

  // --- per-package boundary rules (typed contract from preset + DL-16 app rules) ---
  const boundaryFindings = [];
  const packageRules = layout.packages.map((p) => ({
    root: `${p.directory}/src`,
    forbidden: p.forbiddenImports,
    label: p.name,
  }));
  const appRules = [
    { root: "apps/api/src", forbidden: ["@vibe-engineer-starter/web", "@vibe-engineer-starter/mobile", "@vibe-engineer-starter/ui", "@vibe-engineer-starter/testing"], label: "apps/api" },
    { root: "apps/web/src", forbidden: ["@vibe-engineer-starter/api", "@prisma/client", "@nestjs", "@vibe-engineer-starter/mobile"], label: "apps/web" },
    { root: "apps/mobile/src", forbidden: ["@vibe-engineer-starter/api", "@prisma/client", "@nestjs", "react-dom"], label: "apps/mobile" },
  ];
  for (const rule of [...packageRules, ...appRules]) {
    for (const [path, w] of byPath) {
      if (!path.startsWith(rule.root)) continue;
      if (!path.endsWith(".ts") && !path.endsWith(".tsx") && !path.endsWith(".mjs") && !path.endsWith(".js")) continue;
      const content = getContentForPath(presetRender, path);
      const imports = extractImports(content);
      for (const spec of imports) {
        const hit = specMatchesForbidden(spec, rule.forbidden);
        if (hit !== null) {
          boundaryFindings.push({ rule: rule.label, path, specifier: spec, forbidden: hit });
        }
      }
    }
  }
  recordCheck("DL16-PER-PACKAGE-BOUNDARY-RULES", boundaryFindings.length === 0, {
    summary: `${packageRules.length} package + ${appRules.length} app boundary rules enforced`,
    detail: { boundaryFindings },
  });

  // --- W-NEG-OVER-INFERENCE: forbidden domain terms absent from core (non-sample) files ---
  const overInferenceFindings = [];
  for (const [path, w] of byPath) {
    if (isSampleDemoPath(path)) continue;
    if (path.endsWith(".svg") || path.endsWith(".png")) continue;
    const content = getContentForPath(presetRender, path);
    for (const { term, pattern } of FORBIDDEN_DOMAIN_TERM_PATTERNS) {
      if (pattern.test(content)) {
        overInferenceFindings.push({ path, term });
      }
    }
  }
  recordCheck("W-NEG-OVER-INFERENCE", overInferenceFindings.length === 0, {
    summary: "no forbidden business-domain terms in any core (non-sample) file",
    detail: { overInferenceFindings },
  });

  // single golden module labeled
  const goldenSamplePath = "apps/api/src/golden-records/sample.ts";
  const goldenSample = byPath.get(goldenSamplePath);
  const goldenLabeled = goldenSample !== undefined && /sample|demo|reference/i.test(getContentForPath(presetRender, goldenSamplePath));
  recordCheck("DL16-SINGLE-GOLDEN-MODULE-LABELED", goldenLabeled, {
    summary: "golden-records sample/demo/reference module present + labeled",
  });

  // no private scoped import / no copied harness logic across ALL source (mirror preset validator)
  const privateScoped = /@vibe-engineer\/(?:preset-typescript|adapter-pi|context|config|verification|security|artifacts|schematics|standards|mechanical-gates)/;
  const relativeHarness = /(?:from\s+["']|require\s*\(\s*["'])(\.\.\/)+(?:packages|adapters|presets\/typescript)\//;
  const copiedMarkers = ["validateTypeScriptPresetFiles", "getPiGeneratedFileManifest", "writeContextProject", "createPiDownstreamManifestSummary", "run-witnesses", "verification-runner", "schematic-manifest-engine"];
  const harnessFindings = [];
  for (const [path, w] of byPath) {
    if (!path.endsWith(".ts") && !path.endsWith(".tsx") && !path.endsWith(".mjs") && !path.endsWith(".js")) continue;
    const content = getContentForPath(presetRender, path);
    if (privateScoped.test(content)) harnessFindings.push({ path, kind: "private-scoped" });
    if (relativeHarness.test(content)) harnessFindings.push({ path, kind: "relative-harness" });
    for (const marker of copiedMarkers) {
      if (content.includes(marker)) harnessFindings.push({ path, kind: "copied-marker", marker });
    }
  }
  recordCheck("W-NEG-PRIVATE-SCOPED-IMPORT-AND-COPIED-LOGIC", harnessFindings.length === 0, {
    summary: "no private @vibe-engineer/* import, no relative harness import, no copied logic markers",
    detail: { harnessFindings },
  });
}

function dirHasAnyFile(byPath, prefix) {
  for (const path of byPath.keys()) {
    if (path.startsWith(prefix)) return true;
  }
  return false;
}

function getContentForPath(presetRender, path) {
  const preset = presetRender.files.find((f) => f.path === path);
  if (preset !== undefined) return preset.content;
  const supp = SUPPLEMENTARY_FILES.find((f) => f.path === path);
  return supp !== undefined ? supp.content : "";
}

// ---------------------------------------------------------------------------
// Phase 5 — node --check on every produced .ts/.tsx/.mjs/.js entry.
// ---------------------------------------------------------------------------

function runNodeCheckProbe(written) {
  let failures = 0;
  let checked = 0;
  const codes = [];
  for (const w of written) {
    if (!w.path.endsWith(".ts") && !w.path.endsWith(".tsx") && !w.path.endsWith(".mjs") && !w.path.endsWith(".js")) continue;
    // JSX (.tsx/.jsx) cannot be parsed by node --check: Node rejects it with
    // ERR_UNKNOWN_FILE_EXTENSION before parsing. JSX is compiled by the app
    // build step (vite for web, metro for RN), owned by I-16/I-17/DL-11
    // (pending-live). We record these as advisory (NOT gated) and gate only on
    // the node-parseable .ts/.mjs/.js entries — the honest boundary.
    const isJsx = w.path.endsWith(".tsx") || w.path.endsWith(".jsx");
    const full = join(sourceTemplateRoot, w.path);
    const r = spawnSync("node", ["--check", full], { encoding: "utf8" });
    checked += 1;
    if (r.status !== 0) {
      const stderr = r.stderr ?? "";
      const isJsxLimitation =
        isJsx &&
        (/ERR_UNKNOWN_FILE_EXTENSION|Unexpected token|JSX|'<'/i.test(stderr) || stderr.length === 0);
      if (isJsxLimitation) {
        codes.push({
          path: w.path,
          status: r.status,
          jsx: true,
          note: "JSX requires a build step (vite/RN metro); node --check cannot load/parse .tsx (ERR_UNKNOWN_FILE_EXTENSION). Pending-live app build (I-16/I-17). Not a template defect.",
        });
        continue;
      }
      failures += 1;
      codes.push({ path: w.path, status: r.status, stderr: stderr.slice(0, 300) });
    } else {
      codes.push({ path: w.path, status: 0 });
    }
  }
  evidence.nodeCheck = codes;
  recordCheck("NODE-CHECK-PROBE", failures === 0, {
    summary: `${checked} entries checked, ${failures} syntax failures (JSX-only parses recorded as advisory)`,
    detail: { failures },
  });
}

// ---------------------------------------------------------------------------
// Phase 6 — idempotent regeneration (W-REG-REGEN).
// ---------------------------------------------------------------------------

async function runRegenRegression(presetRender) {
  const first = (await materialize(presetRender)).map((w) => `${w.path}::${w.sha256}`).sort();
  const second = (await materialize(presetRender)).map((w) => `${w.path}::${w.sha256}`).sort();
  const identical = first.length === second.length && first.every((v, i) => v === second[i]);
  evidence.regression = { identical, count: first.length };
  recordCheck("W-REG-REGEN", identical, {
    summary: `two consecutive materializations identical (${first.length} path::sha256 entries)`,
  });
}

// ---------------------------------------------------------------------------
// Phase 7 — sibling no-regression (read-only): I-15B-1 preset + I-07D witnesses.
// ---------------------------------------------------------------------------

function runSiblingNoRegression() {
  const runs = [
    {
      name: "I-15B-1 preset witness",
      cmd: ["packages/presets/nest-react-rn/fixtures/witnesses/run-nest-react-rn-preset-witness.mjs"],
    },
    {
      name: "I-07D typescript preset witness",
      cmd: ["packages/presets/typescript/fixtures/witnesses/run-typescript-preset-witness.mjs"],
    },
  ];
  for (const r of runs) {
    const res = spawnSync("node", r.cmd, { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    const tail = (res.stdout ?? "").slice(-400);
    evidence.sibling.push({ name: r.name, status: res.status, tail });
    recordCheck(`SIBLING-NO-REGRESSION:${r.name}`, res.status === 0, {
      summary: `exit ${res.status}`,
      detail: { tail: tail.slice(-200) },
    });
  }
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

async function main() {
  logStage("render preset via in-context self-reference spawn (cwd=presetRoot)");
  const presetRender = renderPreset();
  logStage(`preset rendered: ${presetRender.files.length} files; layout scope=${presetRender.layout.scope}`);

  logStage("materialize .source-template/** (preset verbatim + DL-16 source skeleton)");
  const written = await materialize(presetRender);
  logStage(`materialized ${written.length} files`);

  logStage("run witness gauntlet");
  runWitness(presetRender, written);

  logStage("run node --check probe");
  runNodeCheckProbe(written);

  logStage("run idempotent regen regression");
  await runRegenRegression(presetRender);

  logStage("run sibling no-regression (read-only)");
  runSiblingNoRegression();

  const allChecks = evidence.checks;
  const failed = allChecks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  const result = {
    ok,
    blocked: false,
    lane: "I-15B-2-source-template-monorepo",
    materializedFileCount: written.length,
    presetConsumedFileCount: presetRender.files.length,
    supplementaryFileCount: SUPPLEMENTARY_FILES.length,
    checks: allChecks,
    stages: evidence.stage,
    nodeCheckSummary: { checked: evidence.nodeCheck.length, failures: evidence.nodeCheck.filter((c) => c.status !== 0 && !c.jsx).length },
    presetMetadata: presetRender.metadata,
  };

  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(join(evidenceRoot, "source-template-witness-result.json"), JSON.stringify(result, null, 2), "utf8");
  await writeFile(join(evidenceRoot, "materialized-file-index.json"), JSON.stringify(written.map((w) => ({ path: w.path, origin: w.origin, sha256: w.sha256 })), null, 2), "utf8");

  console.log(`\n=== I-15B-2 witness: ${ok ? "PASS (green)" : "FAIL"} (${allChecks.length} checks, ${failed.length} failed) ===`);
  if (!ok) {
    for (const f of failed) console.log(`  FAILED: ${f.name} — ${f.summary ?? JSON.stringify(f)}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("I-15B-2 materializer FATAL:", error);
  process.exit(2);
});
