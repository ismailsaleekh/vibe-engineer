import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  loadVibeConfigFile,
  loadVibeConfigFromProjectRoot,
  VIBE_CONFIG_SCHEMA,
} from "@vibe-engineer/config";
import {
  createEnvelope,
  configBlockedEnvelope,
  invalidInvocationEnvelope,
  partialEnvelope,
  payload,
} from "../../envelope/result-envelope.js";
import { CliClassification, CliErrorCode, cliError, diagnostic } from "../../errors/codes.js";
import { parseFlagToken, sanitizeFlagForDisplay } from "../../errors/sanitization.js";

const VALUE_FLAGS = new Set(["--project-root", "--config"]);
const BOOLEAN_FLAGS = new Set(["--include-adapter-scope"]);
const PRISMA_MIGRATION_DOCTOR_CODE = "VE_DOCTOR_PRISMA_MIGRATION_STALE_OR_EMPTY";

function commandResult(envelope) {
  return { envelope };
}

function invalid(invocation, { code = CliErrorCode.InvalidInvocation, message, details = {} }) {
  return commandResult(
    invalidInvocationEnvelope(invocation, {
      code,
      classification: CliClassification.InvalidInvocation,
      message,
      details,
    }),
  );
}

function missingFlagValue(invocation, flag) {
  const displayFlag = sanitizeFlagForDisplay(flag);
  return invalid(invocation, {
    code: CliErrorCode.MissingFlagValue,
    message: `Missing value for ${displayFlag}.`,
    details: { flag: displayFlag },
  });
}

function unknownFlag(invocation, token) {
  const displayFlag = sanitizeFlagForDisplay(token);
  return invalid(invocation, {
    code: CliErrorCode.InvalidFlag,
    message: `Unsupported doctor flag: ${displayFlag}.`,
    details: { flag: displayFlag },
  });
}

function parseDoctorOptions(invocation, args) {
  const options = { projectRoot: null, configPath: null, includeAdapterScope: false };
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    const parsed = parseFlagToken(token);
    if (parsed.isFlag) {
      if (BOOLEAN_FLAGS.has(parsed.flag)) {
        if (parsed.hasInlineValue)
          return { ok: false, result: unknownFlag(invocation, token).envelope };
        options.includeAdapterScope = true;
        continue;
      }
      if (!VALUE_FLAGS.has(parsed.flag))
        return { ok: false, result: unknownFlag(invocation, token).envelope };
      const value = parsed.hasInlineValue ? parsed.value : args[index + 1];
      if (
        typeof value !== "string" ||
        value.length === 0 ||
        (!parsed.hasInlineValue && value.startsWith("--"))
      ) {
        return { ok: false, result: missingFlagValue(invocation, parsed.flag).envelope };
      }
      if (parsed.flag === "--project-root") options.projectRoot = value;
      if (parsed.flag === "--config") options.configPath = value;
      if (!parsed.hasInlineValue) index += 1;
      continue;
    }
    positionals.push(token);
  }
  if (positionals.length > 0) {
    return {
      ok: false,
      result: invalid(invocation, {
        message: "Unexpected positional arguments for doctor.",
        details: { positionalCount: positionals.length },
      }).envelope,
    };
  }
  return { ok: true, options };
}

function sourceFromInvocation(invocation, options) {
  return {
    configPath: options.configPath ?? invocation.configPath ?? null,
    projectRoot: options.projectRoot ?? invocation.projectRoot ?? null,
  };
}

async function loadConfig(invocation, options, context) {
  const source = sourceFromInvocation(invocation, options);
  if (!source.configPath && !source.projectRoot && context.config?.ok === true) {
    return {
      ok: true,
      result: context.config,
      source: {
        configPath: context.config.configPath ?? null,
        projectRoot: context.config.projectRoot ?? null,
      },
    };
  }
  if (source.configPath) {
    const result = await loadVibeConfigFile(source.configPath);
    return {
      ok: result.ok,
      result,
      source: {
        configPath: result.configPath ?? source.configPath,
        projectRoot: source.projectRoot ?? (result.configPath ? dirname(result.configPath) : null),
      },
    };
  }
  const projectRoot = source.projectRoot ?? process.cwd();
  const result = await loadVibeConfigFromProjectRoot(projectRoot);
  return {
    ok: result.ok,
    result,
    source: {
      configPath: result.configPath ?? null,
      projectRoot: result.projectRoot ?? projectRoot,
    },
  };
}

function configScope(loaded) {
  return {
    id: "doctor.scope.config",
    kind: "config_health",
    required: true,
    status: "passed",
    schema: {
      id: loaded.result.schemaId ?? VIBE_CONFIG_SCHEMA.id,
      version: loaded.result.schemaVersion ?? VIBE_CONFIG_SCHEMA.version,
    },
    source: loaded.source,
    selectedHarness: loaded.result.config.agenticHarness,
    deterministicBlocks: loaded.result.config.verification.deterministicBlocks,
  };
}

function projectRootForDoctor(loaded) {
  return loaded.source.projectRoot ?? (loaded.source.configPath ? dirname(loaded.source.configPath) : null);
}

function prismaMigrationScope(loaded) {
  const projectRoot = projectRootForDoctor(loaded);
  if (!projectRoot) return null;
  const apiRoot = join(projectRoot, "apps", "api");
  const migrationsRoot = join(apiRoot, "prisma", "migrations");
  if (!existsSync(apiRoot)) {
    return {
      id: "doctor.scope.prisma-migrations",
      kind: "prisma_migration_health",
      required: false,
      status: "omitted",
      source: { projectRoot, migrationsRoot },
      reason: "apps/api is not generated for this starter scope; Prisma checks are omitted.",
    };
  }
  if (!existsSync(migrationsRoot)) {
    return {
      id: "doctor.scope.prisma-migrations",
      kind: "prisma_migration_health",
      required: true,
      status: "passed",
      source: { projectRoot, migrationsRoot },
      checkedMigrationFolders: 0,
      note: "No Prisma migration folders are present yet.",
    };
  }

  const findings = [];
  const entries = readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const entry of entries) {
    const migrationSql = join(migrationsRoot, entry, "migration.sql");
    if (!existsSync(migrationSql)) {
      findings.push({
        migration: entry,
        path: migrationSql,
        reason: "missing migration.sql",
      });
      continue;
    }
    const sqlStat = statSync(migrationSql);
    if (sqlStat.size === 0) {
      findings.push({
        migration: entry,
        path: migrationSql,
        reason: "empty migration.sql",
      });
    }
  }

  return {
    id: "doctor.scope.prisma-migrations",
    kind: "prisma_migration_health",
    required: true,
    status: findings.length === 0 ? "passed" : "failed",
    source: { projectRoot, migrationsRoot },
    checkedMigrationFolders: entries.length,
    findings,
    remediation:
      "If the stale/empty migration folder was never applied or shared, delete only that local folder and rerun pnpm run db:migrate; otherwise restore the migration from version control or create a corrective migration.",
  };
}

function successEnvelope(invocation, loaded) {
  const scopes = [configScope(loaded)];
  const prismaScope = prismaMigrationScope(loaded);
  if (prismaScope !== null) scopes.push(prismaScope);
  return createEnvelope({
    invocation,
    status: "success",
    payload: payload("doctor_result", {
      ok: true,
      overallStatus: "passed",
      completedScopes: scopes,
      incompleteScopes: [],
      source: loaded.source,
    }),
  });
}

function prismaMigrationBlockedEnvelope(invocation, loaded, prismaScope) {
  const message = "Doctor found missing or empty Prisma migration.sql files.";
  return createEnvelope({
    invocation,
    status: "blocked",
    payload: payload("doctor_result", {
      ok: false,
      overallStatus: "not_passed_blocking",
      completedScopes: [configScope(loaded)],
      incompleteScopes: [
        {
          ...prismaScope,
          blocking: true,
          reasonCode: PRISMA_MIGRATION_DOCTOR_CODE,
          nextAction: prismaScope.remediation,
        },
      ],
      source: loaded.source,
    }),
    diagnostics: [
      diagnostic({
        severity: "error",
        code: CliErrorCode.InvalidConfig,
        classification: CliClassification.InvalidConfig,
        message,
        path: prismaScope.source.migrationsRoot,
        hint: prismaScope.remediation,
      }),
    ],
    errors: [
      cliError({
        code: CliErrorCode.InvalidConfig,
        classification: CliClassification.InvalidConfig,
        retryable: false,
        blocking: true,
        message,
        details: {
          doctorCode: PRISMA_MIGRATION_DOCTOR_CODE,
          findings: prismaScope.findings,
          remediation: prismaScope.remediation,
        },
      }),
    ],
  });
}

function doctorPartialEnvelope(invocation, loaded) {
  const base = partialEnvelope(invocation);
  const completedScope = {
    id: "doctor.scope.config",
    kind: "config_health",
    required: true,
    artifacts: [loaded.source.configPath ?? "memory://config-provider-success"],
  };
  const incompleteScope = {
    id: "doctor.scope.adapter-runtime",
    kind: "adapter_runtime_health",
    required: true,
    blocking: true,
    reasonCode: CliErrorCode.PartialIncomplete,
    classification: CliClassification.PartialIncomplete,
    nextAction: "run adapter-runtime health after the adapter runtime lane is available",
  };
  const message =
    "Doctor completed config health and left requested adapter-runtime health incomplete.";
  return {
    ...base,
    payload: payload("doctor_result", {
      ok: false,
      overallStatus: "not_passed_blocking",
      completedScopes: [configScope(loaded)],
      incompleteScopes: [incompleteScope],
      source: loaded.source,
      partial: {
        overallDisposition: "not_passed_blocking",
        completedScopes: [completedScope],
        incompleteScopes: [incompleteScope],
        resume: {
          allowed: true,
          command: [
            "vibe-engineer",
            "doctor",
            "--project-root",
            loaded.source.projectRoot ?? ".",
            "--json",
            "--non-interactive",
          ],
        },
      },
    }),
    diagnostics: [
      diagnostic({
        severity: "error",
        code: CliErrorCode.PartialIncomplete,
        classification: CliClassification.PartialIncomplete,
        message,
      }),
    ],
    errors: [
      cliError({
        code: CliErrorCode.PartialIncomplete,
        classification: CliClassification.PartialIncomplete,
        retryable: true,
        blocking: true,
        message,
        details: { incompleteScopeIds: [incompleteScope.id] },
      }),
    ],
  };
}

async function run({ invocation, args, context }) {
  const parsed = parseDoctorOptions(invocation, args);
  if (!parsed.ok) return commandResult(parsed.result);
  const loaded = await loadConfig(invocation, parsed.options, context);
  if (!loaded.ok) return commandResult(configBlockedEnvelope(invocation, loaded.result));
  const prismaScope = prismaMigrationScope(loaded);
  if (prismaScope?.status === "failed")
    return commandResult(prismaMigrationBlockedEnvelope(invocation, loaded, prismaScope));
  if (parsed.options.includeAdapterScope)
    return commandResult(doctorPartialEnvelope(invocation, loaded));
  return commandResult(successEnvelope(invocation, loaded));
}

export const doctorCommand = Object.freeze({
  id: "doctor",
  visibility: "debug/diagnostic",
  description: "Inspect read-only vibe-engineer project health through config-backed checks.",
  run,
});

export default doctorCommand;
