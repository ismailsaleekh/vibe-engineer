// I-20B static workflow validator — positive contract + negative-suite rules.
//
// Each rule is a pure function (doc, ctx) => Finding[] that inspects the parsed
// workflow mapping and returns zero or more findings. A finding carries a stable
// rule CODE (so the negative-suite runner can assert which rule fired) and a
// human-readable diagnostic. The positive contract holds iff there are ZERO
// findings across all rules. The 11 negative fixtures each map to exactly one
// rule code (single-rule negatives for crisp adjudication).
//
// Grounding: amendment §5 I-20B (10 required negatives) + §5.10 hard-failure set
// + mechanical-verification-gates §7 (wiring-integrity: "CI invokes the
// aggregate quality command"; partial-gate; budget; mislabeled smoke; path
// filter; PR deploy/mutation) + locked-decisions §10 (local/CI equivalence).
//
// Rule codes (stable):
//   AGG-MISSING        #1  no aggregate `pnpm quality` invocation
//   AGG-PARTIAL        #2  partial command used as the blocking truth
//   PERMS-BROAD        #3  broad / non-least-privilege permissions
//   PATHS-UNSAFE       #4  path filter that can skip governed paths
//   UPLOAD-MISSING     #5  no evidence/summary artifact upload
//   FULL-SUITE         #6  full default E2E / mobile / visual step
//   SMOKE-UNBARRED     #7  unlabeled/mislabeled smoke or smoke-as-sole-proof
//   ACTION-UNPINNED    #8  floating action ref or dynamic tool install
//   DEPLOY-MUTATION    #9  PR deploy / infra-mutation step
//   SECRET-EXPOSURE    #10 secret printed/inlined or via pull_request_target
//   BUDGET-VIOLATION   #11 structurally cannot meet the <10min budget

// ---- Contract constants -----------------------------------------------------

// The I-20A aggregate invocation contract. The blocking step's `run` MUST match
// this shape (parityBlockingCommand in scripts/quality/quality-wiring.config.json,
// enforced by scripts/quality/run-quality.mjs parseArgs). The `<dir>`/`<json>`
// placeholders are filled with concrete paths by the workflow.
export const AGGREGATE_COMMAND_RE =
  /pnpm quality -- --profile=ci --evidence-dir\s+\S+\s+--summary-out\s+\S+/;

// Commands that constitute a PARTIAL gate (mechanical §7 "CI invokes partial
// gate instead of aggregate gate") when used as the blocking truth in place of
// the aggregate. Bare-program forms (no aggregate present) trip AGG-PARTIAL.
export const PARTIAL_COMMAND_RES = [
  /(^|\s|;|&&|\|\|)(pnpm|npm|yarn)\s+(test|run\s+test)(\s|$)/,
  /(^|\s|;|&&|\|\|)(pnpm|npm|yarn)\s+(type-?check|run\s+type-?check|run\s+typecheck)(\s|$)/,
  /(^|\s|;|&&|\|\|)(pnpm|npm|yarn)\s+(lint|run\s+lint)(\s|$)/,
  /(^|\s|;|&&|\|\|)(pnpm|npm|yarn)\s+(build|run\s+build)(\s|$)/,
  /(^|\s|;|&&|\|\|)turbo\s+(run\s+)?(test|lint|build|type-?check)(\s|$)/
];

// Permission scopes that grant WRITE. Any of these (or the literal `write-all`)
// violates least-privilege (§5.10 #6; mechanical §7). `id-token: write` is
// included — it is sensitive and unwarranted for a read-only quality gate.
export const WRITE_PERM_KEYS = new Set([
  "actions",
  "checks",
  "contents",
  "deployments",
  "discussions",
  "id-token",
  "issues",
  "packages",
  "pages",
  "pull-requests",
  "repository-projects",
  "security-events",
  "statuses"
]);

// Canonical source/config path globs whose changes MUST trigger the quality gate
// (mechanical §7 "workflow path filter skips governed paths"). Conservative set
// grounded in the repo surface consumed by the aggregate. A `paths:` include
// filter MUST cover every governed glob; a `paths-ignore` MUST ignore none.
export const GOVERNED_PATH_GLOBS = [
  "packages/**",
  "infra/**",
  "scripts/**",
  ".github/workflows/**",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
  "tsconfig.json",
  "eslint.config.js"
];

// Full-suite (non-smoke) E2E / mobile / visual command patterns. A `--grep
// @smoke` (or `--grep smoke`) scope makes the command smoke-scoped instead
// (then SMOKE labeling rules apply, not FULL-SUITE).
export const FULL_SUITE_PATTERNS = [
  { re: /(^|\s|;|&&|\|\|)(pnpm\s+exec\s+|npx\s+)?playwright\s+test(?!\s+--grep)/, family: "full-E2E (playwright)" },
  { re: /(^|\s|;|&&|\|\|)cypress\s+run(\s|$)/, family: "full-E2E (cypress)" },
  { re: /(^|\s|;|&&|\|\|)nx\s+(run\s+)?\S*?e2e(\s|$)/, family: "full-E2E (nx e2e)" },
  { re: /(^|\s|;|&&|\|\|)nx\s+run-many\b.*--target=e2e/, family: "full-E2E (nx run-many e2e)" },
  { re: /(^|\s|;|&&|\|\|)detox\s+test(\s|$)/, family: "full-mobile-E2E (detox)" },
  { re: /(^|\s|;|&&|\|\|)maestro\s+(test|flow)(\s|$)/, family: "full-mobile-E2E (maestro)" },
  { re: /(^|\s|;|&&|\|\|)(chromatic|percy|loki|reg-suit|backstop\s+test)(\s|$|;)/, family: "full-visual-UI" }
];

// Infra-mutation / deploy commands barred from a PR/push quality workflow
// (§5.6; mechanical §7 "PR/push/merge workflow can deploy or mutate
// infrastructure by default").
export const DEPLOY_MUTATION_PATTERNS = [
  { re: /(^|\s|;|&&|\|\|)pulumi\s+(up|destroy|preview|refresh|import|config\s+set)(\s|$)/, family: "pulumi" },
  { re: /(^|\s|;|&&|\|\|)terraform\s+(apply|destroy|plan)(\s|$)/, family: "terraform" },
  { re: /(^|\s|;|&&|\|\|)kubectl\s+(apply|create|delete|replace|patch|rollout)(\s|$)/, family: "kubectl" },
  { re: /(^|\s|;|&&|\|\|)helm\s+(install|upgrade|uninstall)(\s|$)/, family: "helm" },
  { re: /(^|\s|;|&&|\|\|)gcloud\s+\S+\s+deploy(\s|$)/, family: "gcloud-deploy" },
  { re: /(^|\s|;|&&|\|\|)aws\s+deploy\s+create-deployment(\s|$)/, family: "codedeploy" },
  { re: /(^|\s|;|&&|\|\|)sls\s+deploy(\s|$)/, family: "serverless-deploy" }
];

// A floating (non-immutable) action ref. SHA = 40 hex chars. Anything else
// (@vN, @vN.M, @vN.M.P, @latest, @main, @master, bare) is mutable → reject.
const SHA_REF_RE = /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/;
const FLOATING_TAG_RE = /@(?:latest|main|master|v\d+(?:\.\d+)*(?:\.\d+)*)$/;

// Dynamic tool installs (forbidden — unpinned/dynamic tool, mechanical §7).
export const DYNAMIC_INSTALL_RES = [
  /(^|\s|;|&&|\|\|)npm\s+(i|install)\s+-g\b/,
  /(^|\s|;|&&|\|\|)yarn\s+global\s+add\b/,
  /(^|\s|;|&&|\|\|)pnpm\s+add\s+-g\b/,
  /(^|\s|;|&&|\|\|)npx\s+(?!--package=)/ // bare npx (dynamic fetch); pinned `npx --package=x` is still dynamic but explicit — we reject bare npx outright
];

// ---- Helpers ----------------------------------------------------------------

function isObj(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function stepsOf(job) {
  if (!isObj(job)) return [];
  const steps = job.steps;
  return Array.isArray(steps) ? steps.filter(isObj) : [];
}

export function jobsOf(doc) {
  const jobs = doc.jobs;
  if (!isObj(jobs)) return [];
  return Object.entries(jobs)
    .filter(([, v]) => isObj(v))
    .map(([key, job]) => ({ key, job }));
}

function runScript(step) {
  return typeof step.run === "string" ? step.run : "";
}

function jobIsLabeledSmoke(jobKey, job) {
  if (/smoke/i.test(String(jobKey))) return true;
  if (typeof job.name === "string" && /smoke/i.test(job.name)) return true;
  if (job.smoke === true) return true; // custom marker recognized by this validator
  const env = job.env;
  if (isObj(env) && (env.SMOKE === true || env.SMOKE === "true" || env.SMOKE_PROOF_BARRED)) return true;
  return false;
}

/**
 * Collect every `run:` script in the workflow, annotated with its job key and
 * whether the owning job is labeled smoke.
 */
export function collectRunScripts(doc) {
  const out = [];
  for (const { key, job } of jobsOf(doc)) {
    const smoke = jobIsLabeledSmoke(key, job);
    for (const step of stepsOf(job)) {
      const script = runScript(step);
      if (script) out.push({ jobKey: key, smoke, script });
    }
  }
  return out;
}

// ---- Rules ------------------------------------------------------------------

function ruleAggregate(doc) {
  const findings = [];
  const scripts = collectRunScripts(doc);
  const hasAggregate = scripts.some((s) => AGGREGATE_COMMAND_RE.test(s.script));
  if (hasAggregate) return findings;
  // No aggregate. Distinguish partial-command-as-truth from plain-missing.
  const partial = scripts.find((s) => PARTIAL_COMMAND_RES.some((re) => re.test(s.script)));
  if (partial) {
    findings.push({
      code: "AGG-PARTIAL",
      severity: "critical",
      message: `blocking truth is a PARTIAL command (job '${partial.jobKey}'): "${partial.script.trim()}". CI must invoke the aggregate \`pnpm quality -- --profile=ci ...\` (mechanical §7 "CI invokes partial gate instead of aggregate gate").`
    });
  } else {
    findings.push({
      code: "AGG-MISSING",
      severity: "critical",
      message: "no aggregate `pnpm quality -- --profile=ci --evidence-dir <dir> --summary-out <json>` invocation found in any `run:` step. The quick-gate must invoke the SAME aggregate as local/CI parity (mechanical §7)."
    });
  }
  return findings;
}

function rulePermissions(doc) {
  const findings = [];
  const assertPerms = (perms, scope) => {
    if (perms === undefined || perms === null) {
      findings.push({
        code: "PERMS-BROAD",
        severity: "critical",
        message: `${scope} has no explicit \`permissions:\` block — the GITHUB_TOKEN defaults to repo-default (potentially broad). Declare least-privilege \`permissions: { contents: read }\` (§5.10 #6; mechanical §7).`
      });
      return;
    }
    if (perms === "write-all" || perms === "read-all") {
      findings.push({
        code: "PERMS-BROAD",
        severity: "critical",
        message: `${scope} permissions = \`${perms}\` is not least-privilege. Use \`permissions: { contents: read }\` (§5.10 #6).`
      });
      return;
    }
    if (!isObj(perms)) return;
    for (const [k, v] of Object.entries(perms)) {
      if (v === "write" && WRITE_PERM_KEYS.has(k)) {
        findings.push({
          code: "PERMS-BROAD",
          severity: "critical",
          message: `${scope} grants \`${k}: write\` — not least-privilege for a read-only quality gate. Use \`permissions: { contents: read }\` (§5.10 #6; mechanical §7).`
        });
      }
    }
  };
  assertPerms(doc.permissions, "workflow (top-level)");
  for (const { key, job } of jobsOf(doc)) {
    if (Object.prototype.hasOwnProperty.call(job, "permissions")) {
      assertPerms(job.permissions, `job '${key}'`);
    }
  }
  return findings;
}

function rulePaths(doc) {
  const findings = [];
  const on = doc.on || doc.true; // `on` is a YAML boolean-keyword quirk in some parsers; js-yaml keeps `on` as string key here
  const triggers = isObj(on) ? on : {};
  const checkFilter = (filter, label) => {
    if (!isObj(filter)) return;
    const includes = Array.isArray(filter.paths) ? filter.paths.map(String) : null;
    const ignores = Array.isArray(filter["paths-ignore"]) ? filter["paths-ignore"].map(String) : null;
    if (Array.isArray(ignores)) {
      for (const g of GOVERNED_PATH_GLOBS) {
        const govPrefix = g.replace(/\/\*.*$/, "");
        const ignored = ignores.some((p) => p === g || p === `${govPrefix}/**` || p === govPrefix || p === "**");
        if (ignored) {
          findings.push({
            code: "PATHS-UNSAFE",
            severity: "critical",
            message: `${label} \`paths-ignore\` can skip governed path '${g}' — changes to it would NOT trigger the quality gate (mechanical §7 "workflow path filter skips governed paths").`
          });
        }
      }
    }
    if (Array.isArray(includes)) {
      const coversAll = GOVERNED_PATH_GLOBS.every((g) => {
        if (includes.includes("**") || includes.includes(".github/**")) {
          // '**' / '.github/**' broad include — accept as covering (still must not be paired with a skipping ignore, checked above)
          return g.startsWith(".github/") ? true : includes.includes("**");
        }
        return includes.includes(g);
      });
      if (!coversAll) {
        findings.push({
          code: "PATHS-UNSAFE",
          severity: "critical",
          message: `${label} \`paths\` include filter does not cover all governed paths (required: ${GOVERNED_PATH_GLOBS.join(", ")}). Omit \`paths\` to run on every PR/push, or cover the full governed set (mechanical §7).`
        });
      }
    }
  };
  if (isObj(triggers.push)) checkFilter(triggers.push, "push");
  if (isObj(triggers.pull_request)) checkFilter(triggers.pull_request, "pull_request");
  return findings;
}

function ruleUpload(doc) {
  const findings = [];
  let hasUpload = false;
  for (const { key, job } of jobsOf(doc)) {
    for (const step of stepsOf(job)) {
      if (typeof step.uses === "string" && step.uses.startsWith("actions/upload-artifact@")) {
        hasUpload = true;
      }
    }
  }
  if (!hasUpload) {
    findings.push({
      code: "UPLOAD-MISSING",
      severity: "major-local",
      message: "no `actions/upload-artifact@<sha>` step found — evidence dir + summary JSON must be uploaded (amendment §5 I-20B; mechanical §7 \"missing artifact/summary upload\")."
    });
  }
  return findings;
}

function ruleFullSuite(doc) {
  const findings = [];
  for (const s of collectRunScripts(doc)) {
    for (const { re, family } of FULL_SUITE_PATTERNS) {
      if (re.test(s.script)) {
        findings.push({
          code: "FULL-SUITE",
          severity: "critical",
          message: `job '${s.jobKey}' runs a ${family} step as default CI — full E2E/mobile/visual is barred from the <10min quick-gate (§5.1; mechanical §7). Step: "${s.script.trim()}"`
        });
      }
    }
  }
  return findings;
}

function ruleSmoke(doc) {
  const findings = [];
  // (a) smoke-scoped command in an UNLABELED job = mislabeled smoke.
  for (const s of collectRunScripts(doc)) {
    const isSmokeScoped = /--grep\s+@?smoke/i.test(s.script);
    if (isSmokeScoped && !s.smoke) {
      findings.push({
        code: "SMOKE-UNBARRED",
        severity: "major-local",
        message: `job '${s.jobKey}' runs a smoke-scoped command ("${s.script.trim()}") but is not labeled smoke (job name/key must contain 'smoke' or carry a recognized smoke marker). Unlabeled/mislabeled smoke is barred (§5.1; mechanical §7 "CI smoke test is mislabeled").`
      });
    }
  }
  // (b) a labeled smoke job must be structurally barred from being the blocking
  //     truth: continue-on-error: true (so it can never fail the workflow) AND
  //     must NOT carry the aggregate (smoke is additive, never the sole gate).
  // (c) smoke must never be the SOLE quality/E2E proof: the aggregate must
  //     exist in a non-smoke job.
  const scripts = collectRunScripts(doc);
  const hasAggregate = scripts.some((s) => AGGREGATE_COMMAND_RE.test(s.script));
  for (const { key, job } of jobsOf(doc)) {
    if (!jobIsLabeledSmoke(key, job)) continue;
    if (job["continue-on-error"] !== true) {
      findings.push({
        code: "SMOKE-UNBARRED",
        severity: "major-local",
        message: `smoke job '${key}' must set \`continue-on-error: true\` so it can never be the blocking E2E proof (§5.1; mechanical §7 "smoke used as full E2E proof").`
      });
    }
    for (const step of stepsOf(job)) {
      if (AGGREGATE_COMMAND_RE.test(runScript(step))) {
        findings.push({
          code: "SMOKE-UNBARRED",
          severity: "major-local",
          message: `smoke job '${key}' must NOT carry the aggregate quality command — smoke is additive only (§5.1).`
        });
      }
    }
  }
  const hasNonSmokeAggregate = scripts.some((s) => !s.smoke && AGGREGATE_COMMAND_RE.test(s.script));
  const hasSmokeJob = jobsOf(doc).some(({ key, job }) => jobIsLabeledSmoke(key, job));
  if (hasSmokeJob && !hasNonSmokeAggregate && !hasAggregate) {
    findings.push({
      code: "SMOKE-UNBARRED",
      severity: "critical",
      message: "a smoke job is present but no non-smoke aggregate quality job exists — smoke cannot be the sole quality/E2E proof (§5.1; mechanical §7)."
    });
  }
  return findings;
}

function ruleActionPinning(doc) {
  const findings = [];
  for (const { key, job } of jobsOf(doc)) {
    for (const step of stepsOf(job)) {
      const uses = typeof step.uses === "string" ? step.uses : null;
      if (uses && uses.includes("/") && uses.includes("@")) {
        if (!SHA_REF_RE.test(uses)) {
          findings.push({
            code: "ACTION-UNPINNED",
            severity: "critical",
            message: `job '${key}' uses floating/mutable action ref \`${uses}\`. Pin every action by immutable 40-char commit SHA (greenfield policy; §5.1; mechanical §7 "unpinned/dynamic action or tool").`
          });
        }
      }
      const script = runScript(step);
      for (const re of DYNAMIC_INSTALL_RES) {
        const m = re.exec(script);
        if (m) {
          findings.push({
            code: "ACTION-UNPINNED",
            severity: "critical",
            message: `job '${key}' installs a tool dynamically ("${m[0].trim()}"). Use pinned/packaged tooling only (mechanical §7 "unpinned/dynamic action or tool").`
          });
        }
      }
    }
  }
  return findings;
}

function ruleDeployMutation(doc) {
  const findings = [];
  const on = doc.on || doc.true;
  const triggers = isObj(on) ? on : {};
  const hasPrTrigger = Boolean(triggers.pull_request) || Boolean(triggers["pull_request_target"]);
  for (const s of collectRunScripts(doc)) {
    for (const { re, family } of DEPLOY_MUTATION_PATTERNS) {
      if (re.test(s.script)) {
        findings.push({
          code: "DEPLOY-MUTATION",
          severity: "critical",
          message: `job '${s.jobKey}' runs an infra-mutation/deploy command (${family}) in a PR/push quality workflow${hasPrTrigger ? " (PR trigger active)" : ""}. No deploy/infra-mutation in the quality gate (§5.6; mechanical §7 "PR/push/merge workflow can deploy or mutate infrastructure by default"). Step: "${s.script.trim()}"`
        });
      }
    }
  }
  return findings;
}

function ruleSecretExposure(doc) {
  const findings = [];
  const on = doc.on || doc.true;
  const triggers = isObj(on) ? on : {};
  const usesPrTarget = Boolean(triggers["pull_request_target"]);
  for (const s of collectRunScripts(doc)) {
    // A secret interpolated into a `run:` shell script is printed to the runner
    // shell / logs → exposure. (Legitimate secret use binds via `env:`/`with:`
    // to an action, never interpolated into `run:`.)
    if (/\$\{\{\s*secrets\.[\w.-]+\s*\}\}/.test(s.script)) {
      findings.push({
        code: "SECRET-EXPOSURE",
        severity: "critical",
        message: `job '${s.jobKey}' interpolates a \${{ secrets.* }} into a \`run:\` shell script — this prints the secret to logs/shell. Bind secrets via \`env:\`/\`with:\` to a trusted action only (§5.10; mechanical §7).`
      });
    }
  }
  if (usesPrTarget) {
    // pull_request_target grants the PR write token + secret access to untrusted
    // PR context. Any step that also references the PR body/head is an injection
    // vector; the conservative rule: secrets referenced under pull_request_target
    // is exposure.
    for (const s of collectRunScripts(doc)) {
      if (/\$\{\{\s*secrets\.[\w.-]+\s*\}\}/.test(s.script)) {
        findings.push({
          code: "SECRET-EXPOSURE",
          severity: "critical",
          message: `secret referenced under a \`pull_request_target\` trigger in job '${s.jobKey}' — untrusted PR context gains secret access. Use \`pull_request\` (no target) for quality gates (§5.10; mechanical §7).`
        });
      }
    }
  }
  // Inlined plaintext secret literal (heuristic but typed: looks like token=VALUE
  // with a long high-entropy RHS in a run/env). Conservative signal only.
  return findings;
}

function ruleBudget(doc) {
  const findings = [];
  const assertBudget = (minutes, scope) => {
    if (minutes === undefined || minutes === null) return; // unset is allowed (uncapped by config) — not a structural violation by itself
    const n = Number(minutes);
    if (Number.isFinite(n) && n > 10) {
      findings.push({
        code: "BUDGET-VIOLATION",
        severity: "critical",
        message: `${scope} \`timeout-minutes: ${n}\` structurally cannot meet the <10min quick-gate budget. If <10min is infeasible with deterministic fast checks, request reclassification — never silently split slow work into an unlabeled workflow (§5.1/§5.10 #1; mechanical §7).`
      });
    }
  };
  if (Number.isFinite(Number(doc["timeout-minutes"]))) {
    assertBudget(doc["timeout-minutes"], "workflow (top-level)");
  }
  for (const { key, job } of jobsOf(doc)) {
    assertBudget(job["timeout-minutes"], `job '${key}'`);
  }
  return findings;
}

function rulePullRequestTarget(doc) {
  // pull_request_target is separately banned for untrusted quality execution
  // (amendment §5 I-20B). Reported under its own diagnostic (no dedicated
  // negative fixture — SECRET-EXPOSURE #10 covers the untrusted-context vector;
  // this rule guarantees the positive contract forbids it).
  const findings = [];
  const on = doc.on || doc.true;
  const triggers = isObj(on) ? on : {};
  if (triggers["pull_request_target"] !== undefined) {
    findings.push({
      code: "PULL_REQUEST_TARGET",
      severity: "critical",
      message: "`pull_request_target` trigger is forbidden for the quality gate — it runs with write secrets in untrusted PR context. Use `pull_request` (amendment §5 I-20B)."
    });
  }
  return findings;
}

// Ordered rule set. Negative-suite codes (#1..#11) map to AGG-MISSING,
// AGG-PARTIAL, PERMS-BROAD, PATHS-UNSAFE, UPLOAD-MISSING, FULL-SUITE,
// SMOKE-UNBARRED, ACTION-UNPINNED, DEPLOY-MUTATION, SECRET-EXPOSURE,
// BUDGET-VIOLATION. PULL_REQUEST_TARGET is an additional positive-contract rule.
export const RULES = [
  ruleAggregate,
  rulePermissions,
  rulePaths,
  ruleUpload,
  ruleFullSuite,
  ruleSmoke,
  ruleActionPinning,
  ruleDeployMutation,
  ruleSecretExposure,
  ruleBudget,
  rulePullRequestTarget
];

export function runAllRules(doc) {
  const findings = [];
  for (const rule of RULES) {
    try {
      findings.push(...rule(doc));
    } catch (error) {
      findings.push({
        code: "VALIDATOR-INTERNAL",
        severity: "critical",
        message: `rule ${rule.name} raised: ${error && error.message ? error.message : String(error)}`
      });
    }
  }
  return findings;
}
