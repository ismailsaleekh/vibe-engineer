import fs from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import {
  DEFAULT_SECURITY_POLICY,
  SecurityDecision,
  SecurityGateStatus,
  isSecretLikeValue,
  parseSecurityPolicy,
  redactSecurityText,
  redactSecurityValue,
  runSecurityGate
} from "@vibe-engineer/security";
import {
  artifactDescriptor,
  createEnvelope,
  invalidInvocationEnvelope,
  payload,
  validateCliResultEnvelope,
  writeResultFileAtomic
} from "../../envelope/result-envelope.js";
import { CliClassification, CliErrorCode, cliError, diagnostic } from "../../errors/codes.js";
import { isSecretFlag, parseFlagToken, sanitizeFlagForDisplay } from "../../errors/sanitization.js";

const VALUE_FLAGS = new Set(["--request-file", "--policy-file", "--project-root", "--result-file"]);
const REQUIRED_FLAGS = new Set(["--request-file"]);
const REDACTED = "<redacted>";
const PROTECTED_PROJECT_PREFIXES = Object.freeze([
  ".git",
  ".github",
  "scripts",
  "infra",
  "docs",
  "packages/cli/src/entry",
  "packages/cli/src/command-loader",
  "packages/cli/src/envelope",
  "packages/cli/src/errors",
  "packages/cli/src/testing",
  "packages/cli/src/commands/verify",
  "packages/security",
  "packages/verification",
  "packages/artifacts",
  "packages/mechanical-gates",
  "packages/testing"
]);
const PROTECTED_PROJECT_FILES = new Set(["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", ".npmrc", "turbo.json", "packages/cli/package.json", "packages/security/package.json"]);

function commandResult(envelope) {
  return { envelope };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function securityRedacted(value) {
  return redactSecurityValue(value);
}

function invalid(invocation, { code = CliErrorCode.InvalidInvocation, classification = CliClassification.InvalidInvocation, message, details = {} }) {
  return commandResult(invalidInvocationEnvelope(invocation, {
    code,
    classification,
    message: redactSecurityText(message),
    details: securityRedacted(details)
  }));
}

function invalidInput(invocation, message, details = {}) {
  return invalid(invocation, {
    code: CliErrorCode.InvalidInvocation,
    classification: CliClassification.InvalidInput,
    message,
    details
  });
}

function secretInput(invocation, flag) {
  return invalidInput(invocation, "Secret-like security command input is not accepted.", { flag: flag === null ? REDACTED : sanitizeFlagForDisplay(flag), value: REDACTED });
}

function missingFlagValue(invocation, flag) {
  const displayFlag = sanitizeFlagForDisplay(flag);
  return invalid(invocation, {
    code: CliErrorCode.MissingFlagValue,
    message: `Missing value for ${displayFlag}.`,
    details: { flag: displayFlag }
  });
}

function unknownFlag(invocation, token) {
  const displayFlag = sanitizeFlagForDisplay(token);
  return invalid(invocation, {
    code: CliErrorCode.InvalidFlag,
    message: `Unsupported security flag: ${displayFlag}.`,
    details: { flag: displayFlag }
  });
}

function projectRelative(projectRoot, absPath) {
  return relative(projectRoot, absPath).replaceAll("\\", "/");
}

function contained(parent, child) {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function realRoot(pathValue) {
  const abs = resolve(pathValue);
  return fs.existsSync(abs) ? fs.realpathSync(abs) : abs;
}

function isProtectedProjectPath(projectRoot, absPath) {
  const rel = projectRelative(projectRoot, absPath);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return false;
  if (PROTECTED_PROJECT_FILES.has(rel)) return true;
  return PROTECTED_PROJECT_PREFIXES.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`));
}

function resolveWithinProject(projectRoot, pathValue, label, { mustExist, allowProtected }) {
  if (typeof pathValue !== "string" || pathValue.trim().length === 0) return { error: `${label} must be a non-empty path.` };
  if (isSecretLikeValue(pathValue)) return { error: `${label} contains a secret-like value.` };
  const rootReal = realRoot(projectRoot);
  const resolved = isAbsolute(pathValue) ? resolve(pathValue) : resolve(rootReal, pathValue);
  if (mustExist && !fs.existsSync(resolved)) return { error: `${label} does not exist.` };
  const existing = fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
  const parent = fs.existsSync(resolved) ? dirname(existing) : dirname(resolved);
  const parentReal = fs.existsSync(parent) ? fs.realpathSync(parent) : parent;
  if (!contained(rootReal, existing) || !contained(rootReal, parentReal)) return { error: `${label} escapes project root.` };
  if (!allowProtected && isProtectedProjectPath(rootReal, existing)) return { error: `${label} targets a protected project path.` };
  return resolved;
}

function propertyForFlag(flag) {
  if (flag === "--request-file") return "requestFile";
  if (flag === "--policy-file") return "policyFile";
  if (flag === "--project-root") return "projectRoot";
  if (flag === "--result-file") return "resultFile";
  return null;
}

function tokenLooksSecretLike(token, parsed) {
  if (parsed.isFlag && isSecretFlag(parsed.flag)) return true;
  if (typeof token === "string" && isSecretLikeValue(token)) return true;
  return false;
}

function parseSecurityOptions(invocation, args) {
  const values = new Map();
  const seenFlags = new Set();
  const positionals = [];

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index] ?? "";
    const parsed = parseFlagToken(token);
    if (!parsed.isFlag) {
      if (isSecretLikeValue(token)) return { ok: false, envelope: secretInput(invocation, null).envelope };
      positionals.push(token);
      continue;
    }
    const flag = typeof parsed.flag === "string" ? parsed.flag : "";
    if (tokenLooksSecretLike(token, parsed)) return { ok: false, envelope: secretInput(invocation, flag).envelope };
    if (!VALUE_FLAGS.has(flag)) return { ok: false, envelope: unknownFlag(invocation, token).envelope };
    if (seenFlags.has(flag)) {
      return { ok: false, envelope: invalid(invocation, {
        message: "Duplicate security flag is not allowed.",
        details: { flag: sanitizeFlagForDisplay(flag) }
      }).envelope };
    }
    seenFlags.add(flag);
    const value = parsed.hasInlineValue ? parsed.value : args[index + 1];
    if (typeof value !== "string" || value.length === 0 || (!parsed.hasInlineValue && value.startsWith("--"))) return { ok: false, envelope: missingFlagValue(invocation, flag).envelope };
    if (isSecretLikeValue(value)) return { ok: false, envelope: secretInput(invocation, flag).envelope };
    const property = propertyForFlag(flag);
    if (property === null) return { ok: false, envelope: unknownFlag(invocation, token).envelope };
    values.set(property, value);
    if (!parsed.hasInlineValue) index += 1;
  }

  if (positionals.length > 0) {
    return { ok: false, envelope: invalid(invocation, {
      message: "Unexpected positional arguments for security.",
      details: { positionalCount: positionals.length }
    }).envelope };
  }

  for (const flag of REQUIRED_FLAGS) {
    const property = propertyForFlag(flag);
    if (property !== null && !values.has(property)) {
      return { ok: false, envelope: invalid(invocation, {
        code: CliErrorCode.MissingFlagValue,
        message: "Missing required security flag.",
        details: { flag }
      }).envelope };
    }
  }

  const projectRoot = resolve(values.get("projectRoot") ?? invocation.projectRoot ?? process.cwd());
  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) return { ok: false, envelope: invalidInput(invocation, "project-root must be an existing directory.", { flag: "--project-root" }).envelope };
  const projectRootReal = realRoot(projectRoot);
  const requestFile = resolveWithinProject(projectRootReal, values.get("requestFile"), "request file", { mustExist: true, allowProtected: false });
  if (typeof requestFile !== "string") return { ok: false, envelope: invalidInput(invocation, requestFile.error, { flag: "--request-file" }).envelope };
  const policyFileRaw = values.get("policyFile");
  const policyFile = policyFileRaw === undefined ? undefined : resolveWithinProject(projectRootReal, policyFileRaw, "policy file", { mustExist: true, allowProtected: false });
  if (policyFile !== undefined && typeof policyFile !== "string") return { ok: false, envelope: invalidInput(invocation, policyFile.error, { flag: "--policy-file" }).envelope };
  const resultFileRaw = values.get("resultFile");
  const resultFile = resultFileRaw === undefined ? undefined : resolveWithinProject(projectRootReal, resultFileRaw, "result file", { mustExist: false, allowProtected: false });
  if (resultFile !== undefined && typeof resultFile !== "string") return { ok: false, envelope: invalidInput(invocation, resultFile.error, { flag: "--result-file" }).envelope };

  return { ok: true, options: { projectRoot: projectRootReal, requestFile, ...(policyFile === undefined ? {} : { policyFile }), ...(resultFile === undefined ? {} : { resultFile }) } };
}

async function readJsonFile(filePath, label) {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    return { ok: true, value: parsed };
  } catch (error) {
    return { ok: false, message: `${label} must be readable JSON.`, details: { path: filePath, errorName: error && typeof error === "object" && "name" in error ? error.name : null } };
  }
}

function securityEnvelope(invocation, options, gateResult) {
  const status = gateResult.status === SecurityGateStatus.Passed || gateResult.status === SecurityGateStatus.Advisory ? "success" : "blocked";
  const data = securityRedacted({
    ok: status === "success",
    securityStatus: gateResult.status,
    decision: gateResult.decision,
    blocking: gateResult.blocking,
    findings: gateResult.findings,
    redactions: gateResult.redactions,
    auditEvents: gateResult.auditEvents,
    source: {
      requestFile: options.requestFile,
      policyFile: options.policyFile ?? null,
      projectRoot: options.projectRoot
    }
  });
  if (status === "success") return createEnvelope({ invocation, status, payload: payload("security_gate_result", data) });
  const firstFinding = gateResult.findings[0];
  const message = firstFinding?.message ?? "Security gate blocked the request.";
  return createEnvelope({
    invocation,
    status,
    payload: payload("security_gate_result", data),
    diagnostics: [diagnostic({ code: CliErrorCode.InvalidInvocation, classification: CliClassification.SafetyPolicyBlock, message })],
    errors: [cliError({
      code: CliErrorCode.InvalidInvocation,
      classification: CliClassification.SafetyPolicyBlock,
      retryable: false,
      blocking: true,
      message,
      details: securityRedacted({ classification: firstFinding?.classification ?? null, category: firstFinding?.category ?? null, source: data.source })
    })]
  });
}

function invalidEnvelopeFailure(invocation, validation) {
  return createEnvelope({
    invocation,
    status: "failure",
    payload: payload("internal_error", { accepted: false }),
    diagnostics: [diagnostic({ code: CliErrorCode.InvalidEnvelope, classification: CliClassification.InternalError, message: "Security command generated an invalid result envelope." })],
    errors: [cliError({ code: CliErrorCode.InvalidEnvelope, classification: CliClassification.InternalError, message: "Security command generated an invalid result envelope.", details: { validationErrors: validation.errors } })]
  });
}

function resultFileFailure(invocation, resultFile, error) {
  const message = "Result file could not be written atomically.";
  return createEnvelope({
    invocation,
    status: "blocked",
    payload: payload("result_file_error", { resultFile: redactSecurityText(resultFile) }),
    diagnostics: [diagnostic({ code: CliErrorCode.ResultFileWriteFailed, classification: CliClassification.WriteConflict, message, path: redactSecurityText(resultFile) })],
    errors: [cliError({ code: CliErrorCode.ResultFileWriteFailed, classification: CliClassification.WriteConflict, message, details: securityRedacted({ resultFile, errorCode: error && typeof error === "object" && "code" in error ? error.code : null }) })]
  });
}

async function finalizeEnvelope(envelope, resultFile) {
  let finalEnvelope = envelope;
  if (resultFile !== undefined) {
    await mkdir(dirname(resultFile), { recursive: true });
    finalEnvelope = {
      ...finalEnvelope,
      artifacts: [
        ...finalEnvelope.artifacts,
        artifactDescriptor({ kind: "cli_result", path: resultFile, schemaVersion: finalEnvelope.schemaVersion, role: "report" })
      ]
    };
  }
  const validation = validateCliResultEnvelope(finalEnvelope);
  if (!validation.ok) finalEnvelope = invalidEnvelopeFailure(finalEnvelope.invocation, validation);
  if (resultFile !== undefined) {
    try {
      await writeResultFileAtomic(resultFile, finalEnvelope);
    } catch (error) {
      finalEnvelope = resultFileFailure(finalEnvelope.invocation, resultFile, error);
    }
  }
  return finalEnvelope;
}

async function run({ invocation, args }) {
  const parsed = parseSecurityOptions(invocation, args);
  if (!parsed.ok) return commandResult(parsed.envelope);

  const requestRead = await readJsonFile(parsed.options.requestFile, "Security request file");
  if (!requestRead.ok) return invalidInput(invocation, requestRead.message, requestRead.details);
  if (!isRecord(requestRead.value)) return invalidInput(invocation, "Security request file must contain a JSON object.", { path: parsed.options.requestFile });

  let request = requestRead.value;
  if (parsed.options.policyFile !== undefined) {
    const policyRead = await readJsonFile(parsed.options.policyFile, "Security policy file");
    if (!policyRead.ok) return invalidInput(invocation, policyRead.message, policyRead.details);
    const policyParse = parseSecurityPolicy(policyRead.value);
    if (!policyParse.ok) {
      const envelope = securityEnvelope(invocation, parsed.options, policyParse.result);
      return commandResult(await finalizeEnvelope(envelope, parsed.options.resultFile));
    }
    request = { ...request, policy: policyParse.policy };
  } else if (request.policy === undefined) {
    request = { ...request, policy: DEFAULT_SECURITY_POLICY };
  }

  const gateResult = runSecurityGate(request);
  const envelope = securityEnvelope(invocation, parsed.options, gateResult);
  return commandResult(await finalizeEnvelope(envelope, parsed.options.resultFile));
}

export const securityCommand = Object.freeze({
  id: "security",
  visibility: "implementation",
  description: "Run fail-closed security and safety policy gates through @vibe-engineer/security.",
  run
});

export { SecurityDecision, SecurityGateStatus };
export default securityCommand;
