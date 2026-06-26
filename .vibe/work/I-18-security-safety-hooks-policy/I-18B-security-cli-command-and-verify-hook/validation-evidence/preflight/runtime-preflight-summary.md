# Runtime witness side-effect preflight summary

Direct implementation scripts are NOT license-safe for this validator:

- `node packages/cli/src/commands/security/run-cli-witnesses.mjs` hard-codes `repoRoot=/Users/lizavasilyeva/work/vibe-engineer`, `workRoot=.vibe/work/I-18...`, `evidenceRoot=<workRoot>/evidence`; it calls `fsp.rm(caseRoot,{recursive:true,force:true})`, `fsp.mkdir`, `fsp.writeFile`, and writes result files/captures under implementation-owned `evidence/**`, not validator-owned `validation-evidence/**`.
- `node packages/cli/src/commands/security/run-verify-security-hook-witness.mjs` hard-codes `evidenceRoot=<workRoot>/evidence/real-boundary/verify-security-hook`; it calls `fsp.rm(caseRoot,{recursive:true,force:true})`, `fsp.mkdir`, `fsp.writeFile`, and drives `verifyCommand` to write Evidence Packets, runner catalogs, request-with-policy files, summaries, and result files under implementation-owned `evidence/**`.
- `node examples/starter-reference/generated-fixtures/security/build-facing/build-security-api-consumer.mjs` has no file writes/deletes; stdout only. It is safe to run with stdout/stderr redirected to validator-owned files.
- `node packages/cli/src/entry/vibe-engineer.js security --api-key <validator-redaction-sentinel>` does not write unless global `--result-file` is supplied; this planned invocation supplies no result file and redirects stdout/stderr to validator-owned files.

Ruling: do not run the two implementation witness scripts directly. Use validator-owned stronger-equivalent harnesses under `validation-evidence/harness/**` that import actual product modules (`securityCommand`, `verifyCommand`, `@vibe-engineer/security`, `@vibe-engineer/verification`, existing envelope/result-file writers, and the fixture runner) and root all generated outputs under `validation-evidence/witnesses/**`.
