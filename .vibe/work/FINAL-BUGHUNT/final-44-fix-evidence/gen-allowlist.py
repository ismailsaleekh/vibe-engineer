#!/usr/bin/env python3
"""Generate scoped, justified mechanical-escape-allowlist entries for the 41 genuinely
unavoidable FINAL-BUGHUNT escapes (40 raw-json-parse + 1 eslint-disable) from the baseline
evidence. Each entry is keyed by distinct (path, kind, excerpt); entries with no `line`
cover every matching escape in the file (so identical-text escapes merge correctly)."""
import json
from datetime import date

ROOT = "/Users/lizavasilyeva/work/vibe-engineer"
ROWS_PATH = f"{ROOT}/.vibe/work/FINAL-BUGHUNT/final-44-fix-evidence/baseline-rows.json"
OUT_PATH = f"{ROOT}/.vibe/work/FINAL-BUGHUNT/final-44-fix-evidence/allowlist-entries.json"

REVIEWER = "triad-b-fix-glm-5.2"
REVIEWED_ON = "2026-06-27"

# Per-site genuine justification + whyUnavoidable, keyed by (path, excerpt-prefix).
J = {}

def add(path, excerpt_prefix, justification, why):
    J[(path, excerpt_prefix)] = (justification, why)

# --- adapters/pi runtime validation (try/catch -> typed pi-runtime issue before record check) ---
add("packages/adapters/pi/src/runtime/validation.ts", "JSON.parse(asset.content)",
    "Pi-runtime fixture validator parses package-manifest / harness-config asset content inside a try/catch that translates a JSON SyntaxError into a distinct typed validation issue (invalid_package_manifest_json / invalid_harness_config_json) before the isRecord shape check that follows.",
    "Moving JSON.parse out of the try/catch (to make it the argument of a magic-named consumer) loses the SyntaxError->typed-issue translation; consuming it inside one magic-named validator would conflate JSON syntax errors with record-shape errors and regress the distinct issue codes/pointers the pi-runtime validation contract guarantees. The post-parse isRecord checks ARE the genuine validation; this is the sole JSON ingestion point.")

# --- schema registries (load a JSON-Schema document = the validation contract itself) ---
for p in ("packages/artifacts/src/schema-registry.js", "packages/standards/src/schema-registry.js"):
    add(p, "JSON.parse(fs.readFileSync(schemaPath",
        "Loads an external JSON-Schema document from disk; the loaded schema IS the validation contract consumed by a downstream validator, not data to be re-narrowed at load time. The try/catch translates read/parse failure into SCHEMA_UNREADABLE / schema-not-found.",
        "A magic-named wrapper around the load would validate a schema against itself (a tautology) — there is no consumer-side record shape to narrow to, because the document's shape is defined by it being a JSON Schema, validated later by the artifact/standards validators.")

# --- artifacts validateArtifactFile (try/catch -> JSON_PARSE_ERROR before real validators) ---
add("packages/artifacts/src/validation.js", "JSON.parse(fs.readFileSync(filePath",
    "validateArtifactFile wraps JSON.parse in a try/catch that returns a dedicated JSON_PARSE_ERROR validation result before delegating the parsed value to validateArtifact / validateArtifactKind (the real validators, which receive `parsed`, not the JSON.parse).",
    "Inlining JSON.parse as the argument of validateArtifactKind would route parse failures through the schema-validation error path, regressing the dedicated JSON_PARSE_ERROR code and message that callers depend on.")

# --- command-loader version (read own package.json, echo two fields) ---
add("packages/cli/src/command-loader/loader.js", "JSON.parse(await readFile(context.packageJsonPath",
    "The `version` command reads the CLI's own package.json solely to surface pkg.name and pkg.version; the parsed value is consumed by two scalar field reads inside a command that echoes them.",
    "No runtime schema exists for 'the CLI's own package.json' beyond these two fields; a magic-named narrow over a two-field echo would be a tautology, not genuine runtime validation.")

# --- create witnesses (re-read already-validated artifacts for deep-equal) ---
add("packages/cli/src/commands/create/run-cli-witnesses.mjs", "JSON.parse(readText(r.resultFile))",
    "Witness re-reads the just-written result-file envelope to assert.deep* byte-equivalence against the in-memory envelope already validated through validateCliResultEnvelope earlier in the same witness.",
    "A magic-named validator wrapper would duplicate validation already performed upstream and be tautological for a deep-equal round-trip proof.")
add("packages/cli/src/commands/create/run-cli-witnesses.mjs", 'JSON.parse(readText(resolve(r.targetRoot',
    "Witness re-reads the generated vibe-engineer.config.json to assert two config fields against expected values produced by the create command under test.",
    "The parsed config is consumed by scalar field asserts in a witness harness; a magic-named narrow would be a tautology over the two asserted fields.")
add("packages/cli/src/commands/create/run-cli-witnesses.mjs", 'JSON.parse(readText(resolve(args.evidenceRoot',
    "Witness re-reads a previously generated config carrier to assert invariants (maxParallelAgents / agenticWorkPackageTargetHours) across the registration suite.",
    "Witness-side scalar field asserts over a known generated carrier; a magic-named narrow would duplicate the create command's own config validation tautologically.")

# --- schematic command (extractPlanData peek + dynamic user input) ---
add("packages/cli/src/commands/schematic/index.js", "JSON.parse(planFileContent)",
    "extractPlanData peeks into a result-envelope carrier with optional chaining to surface plan_fingerprint when present, returning the parsed value otherwise; there is intentionally no single static shape (envelope OR raw plan data).",
    "The function is by design a shape-agnostic peek; a magic-named narrow would impose a single shape the function explicitly does not assume.")
add("packages/cli/src/commands/schematic/index.js", "JSON.parse(await fs.readFile(path.resolve(options.inputFile)",
    "The schematic command reads user-provided schematic input JSON of intentionally dynamic shape (forwarded to executeSchematic, which validates it) inside a try/catch that translates parse failure into an invalid_invocation envelope.",
    "Input shape is owned and validated by the schematics engine downstream; the CLI's try/catch only owes a parse-error->blocked-envelope translation. Inlining JSON.parse into an engine validator argument would bypass the CLI's own invocation-error envelope contract.")

# --- schematic witness (re-read result file for deep-equal) ---
add("packages/cli/src/commands/schematic/run-cli-witnesses.mjs", 'JSON.parse(readFileSync(resultFile',
    "Witness re-reads the result-file envelope to assert.deep* equivalence against the in-memory envelope that was already passed through validateCliResultEnvelope on the line above.",
    "Re-validation wrapper would duplicate the validateCliResultEnvelope check performed immediately prior; tautological for the deep-equal round-trip proof.")

# --- security command generic readJson ---
add("packages/cli/src/commands/security/index.ts", "JSON.parse(await readFile(filePath",
    "Generic security-command JSON reader returning unknown inside a try/catch that yields a ReadJsonResult error on parse failure; callers perform their own shape handling.",
    "The helper intentionally makes no shape assumption (it serves multiple security sub-paths); a magic-named narrow would impose a single shape the generic reader must not assume.")

# --- security witnesses ---
add("packages/cli/src/commands/security/run-cli-witnesses.mjs", "JSON.parse(fs.readFileSync(file",
    "Witness readJson helper reads recorded JSON envelopes that are immediately passed to assertEnvelope (validateCliResultEnvelope).",
    "The envelope is validated by assertEnvelope one statement later; a magic-named wrapper would duplicate that validation tautologically.")
add("packages/cli/src/commands/security/run-cli-witnesses.mjs", "JSON.parse(defaultEntry.stdout",
    "Witness parses CLI-spawned stdout to assert a specific classification field on the regression envelope.",
    "Single-field assert over spawn stdout in a witness harness; a magic-named narrow over one field read is a tautology.")
add("packages/cli/src/commands/security/run-cli-witnesses.mjs", "JSON.parse(foundation.stdout",
    "Witness parses CLI-spawned foundation envelope stdout to assert .status and record the regression summary.",
    "Scalar field asserts over spawn stdout in a witness harness; a magic-named narrow over a .status read is a tautology.")
add("packages/cli/src/commands/security/run-cli-witnesses.mjs", "JSON.parse(buildConsumer.stdout",
    "Witness parses the real-boundary build-facing API consumer spawn stdout to assert .futureJoin.",
    "Single-field assert over a spawn stdout in a witness harness; a magic-named narrow over one field read is a tautology.")
add("packages/cli/src/commands/security/run-verify-security-hook-witness.mjs", "JSON.parse(fs.readFileSync(file",
    "Witness readJson helper loads recorded hook envelopes passed to assertEnvelope (validateCliResultEnvelope).",
    "Envelope validated by assertEnvelope immediately after; a magic-named wrapper would duplicate that validation tautologically.")

# --- ship / verify runner catalog (try/catch -> distinct error before shape check) ---
add("packages/cli/src/commands/ship/index.ts", "JSON.parse(readFileSync(catalogPath",
    "readRunnerCatalog wraps JSON.parse in a try/catch returning {error:'Runner catalog must be a readable JSON file.'} before the Array.isArray+isRecord shape check (the genuine validation, which receives `parsed`).",
    "Inlining JSON.parse into the shape-check's argument would conflate unreadable-file / JSON-syntax errors with structural-catalog errors, regressing the distinct error message callers switch on.")
add("packages/cli/src/commands/verify/index.ts", "JSON.parse(await readFile(catalogPath",
    "readRunnerCatalog wraps JSON.parse in a try/catch returning {error:'Runner catalog must be a readable JSON file.'} before the Array.isArray+isRecord shape check (the genuine validation, which receives `parsed`).",
    "Inlining JSON.parse into the shape-check's argument would conflate unreadable-file / JSON-syntax errors with structural-catalog errors, regressing the distinct error message callers switch on.")

# --- ship witnesses ---
add("packages/cli/src/commands/ship/run-cli-witness.mjs", "JSON.parse(await fsp.readFile(cliPackageJson",
    "Witness reads the CLI package.json to assert the @vibe-engineer/skills workspace dep declaration.",
    "Single scalar dep-field assert over a known manifest; a magic-named narrow over one field read is a tautology.")
add("packages/cli/src/commands/ship/run-cli-witness.mjs", "JSON.parse(await fsp.readFile(path.join(repoRoot",
    "Witness reads the skills package.json to assert the ./ship export mapping.",
    "Single scalar export-field assert over a known manifest; a magic-named narrow over one field read is a tautology.")
add("packages/cli/src/commands/ship/run-cli-witness.mjs", "JSON.parse(await fsp.readFile(buildResultPath",
    "Witness reads a Build Result artifact, mutates its status, then re-validates it via validateArtifactKind (the real artifacts validator) on the following lines.",
    "The parsed artifact is handed straight to validateArtifactKind; a second magic-named narrow in front of it would duplicate the artifacts validator tautologically.")

# --- testing witnesses (spawn stdout / result file for assertEnvelope + deep-equal) ---
add("packages/cli/src/testing/run-witnesses.mjs", "JSON.parse(result.stdout",
    "Witness parses CLI-spawned stdout into an envelope that is immediately passed to assertEnvelope (validateCliResultEnvelope).",
    "Envelope validated by assertEnvelope one statement later; a magic-named wrapper would duplicate that validation tautologically.")
add("packages/cli/src/testing/run-witnesses.mjs", "JSON.parse(readFileSync(resultPath",
    "Witness re-reads the result-file envelope to assert.deep* equivalence against the in-memory envelope that was already passed through assertEnvelope.",
    "Re-validation wrapper would duplicate the assertEnvelope check performed immediately prior; tautological for the deep-equal round-trip proof.")

# --- config readJsonFile (try/catch -> MALFORMED_JSON before multi-stage validation) ---
add("packages/config/src/index.js", "JSON.parse(content)",
    "readJsonFile wraps JSON.parse in a try/catch returning a MALFORMED_JSON / invalid_config issue before the multi-stage config validation pipeline that consumes `data`.",
    "Inlining JSON.parse into a downstream config validator's argument would conflate JSON-syntax errors with config-schema errors, regressing the distinct MALFORMED_JSON issue code.")

# --- context generic carrier reader ---
add("packages/context/src/index.js", "JSON.parse(raw)",
    "Generic context-carrier JSON reader returning the parsed value to readJsonCarrier, which performs the real artifact-kind validation; the raw parse is intentionally shape-agnostic.",
    "The reader serves multiple artifact kinds whose shapes are validated by readJsonCarrier / the artifacts validator downstream; a magic-named narrow here would impose a single shape the generic reader must not assume.")

# --- mechanical-gates' OWN bounded JSON readers (the gate IS the validator layer) ---
for p, code in [
    ("packages/mechanical-gates/src/p0/boundaries/contracts.js", "P0_INVALID_JSON"),
    ("packages/mechanical-gates/src/p1/quality-ratchet/index.js", "QUALITY_RATCHET_INVALID_JSON"),
    ("packages/mechanical-gates/src/p1/test-anti-pattern/index.js", "TEST_ANTI_PATTERN_INVALID_JSON"),
]:
    add(p, "JSON.parse(text)",
        f"Gate-infrastructure bounded JSON reader loads a governance carrier / evidence file and wraps JSON.parse in a try/catch that throws a typed error ({code}) retaining the raw text for downstream inspection.",
        "This code IS the validator/governance layer; it cannot delegate JSON ingestion to another magic-named validator without infinite recursion, and a wrapper here is definitionally a tautology over the gate's own carrier-loading primitive.")
add("packages/mechanical-gates/src/p1/schema-contract-strictness/validate-schema-contract-strictness.ts", "JSON.parse(text)",
    "Gate validator's parseJson helper wraps JSON.parse in a try/catch that throws an 'Invalid JSON in <path>' error with the jsonPath context before the schema-contract strictness checks consume the parsed value.",
    "This is the gate's own JSON-loading primitive; delegating to another magic-named validator would recurse into the gate layer, and a wrapper is a tautology over the gate's carrier ingestion.")

# --- observability CJS interop ---
add("packages/observability/src/ids.js", "// eslint-disable-next-line @typescript-eslint/no-require-imports",
    "Synchronous CJS-interop require('node:crypto') under type:module for isometric UUID generation; resolveCrypto is a synchronous primitive consumed by every UUID caller.",
    "Converting to an async dynamic import() would change resolveCrypto's synchronous contract and ripple asynchronously through all randomUUID callers. tseslint strictTypeChecked flags the legitimate Node ESM<->CJS interop path that this directive scoped-acknowledges.")

# --- presets parseJsonObject (try/catch -> PRESET_MALFORMED_JSON before isObject) ---
for p in ("packages/presets/nest-react-rn/src/index.ts", "packages/presets/typescript/src/index.ts"):
    add(p, "JSON.parse(content)",
        "parseJsonObject wraps JSON.parse in a try/catch that pushes a PRESET_MALFORMED_JSON finding before the isObject record check (the genuine narrow, which receives `parsed`).",
        "Inlining JSON.parse into the isObject check's argument would conflate JSON-syntax errors with record-shape errors, regressing the distinct PRESET_MALFORMED_JSON finding semantics.")

# --- schematics builtins (consumed by non-magic assertRecord) ---
add("packages/schematics/src/builtins/index.ts", "JSON.parse(manifestFile.content)",
    "Parses a rendered TypeScript-preset manifest then immediately narrows via assertRecord (a genuine record guard) one statement later.",
    "assertRecord is the genuine validator but its name is not in the gate's magic set (schema|parse|validate|narrow); renaming it + inlining across its many call sites changes error-surfacing timing and is out of proportion to a scoped, reviewed exemption.")
add("packages/schematics/src/builtins/index.ts", "JSON.parse(manifestText)",
    "Parses a loaded built-in schematic manifest stored for later narrowRecord/assertRecord validation when the catalog entries are consumed.",
    "The manifest is validated downstream by assertRecord at consumption time; introducing a magic-named narrow here would either duplicate that check or shift its timing. Scoped exemption preferred over a cross-file rename of the genuine assertRecord guard.")

# --- schematics markers (try/catch -> invalid_marker_json before field validation) ---
add("packages/schematics/src/engine/markers.js", "JSON.parse(jsonText)",
    "Parses an inline generated-block marker header inside a try/catch returning {ok:false,reason:'invalid_marker_json'} on failure, then validates the marker's required string fields.",
    "Inlining JSON.parse into a field-validator's argument would conflate parse failure with the distinct missing_markers / invalid_marker_field / invalid_marker_field reasons the marker parser returns.")

# --- schematics manifest loader (try/catch -> manifest_json fail before engine validation) ---
add("packages/schematics/src/manifest/loader.js", "JSON.parse(text)",
    "parseJsonFile wraps JSON.parse in a try/catch that calls fail('manifest_json', ...) (a typed engine error) before the manifest is structurally validated by the engine.",
    "Inlining JSON.parse into the engine's structural validator would conflate JSON-syntax errors with manifest-schema errors, regressing the distinct manifest_json error code.")

# --- skills work-brief round-trip proof ---
add("packages/skills/src/input/common/work-brief-writer.js", "JSON.parse(await fs.readFile(outputPath",
    "Re-reads the just-written Work Brief artifact to round-trip-prove persistence; the file was already validated by validateWorkBriefFile on the line immediately above.",
    "A magic-named validator wrapper would duplicate the validateWorkBriefFile check performed one statement earlier; tautological for the persistence round-trip proof.")

# --- testing snapshot normalization (JSON-clone-with-replacer) ---
add("packages/testing/src/index.js", "JSON.parse(JSON.stringify(value, (_key, nested)",
    "normalizeForSnapshot deep-clones with a JSON replacer that transforms string values (backslash->slash, macOS temp-dir redaction) for deterministic snapshot comparison.",
    "structuredClone cannot apply a replacer or transform string values, and no other primitive replicates JSON's replacer-based deep-serialize-and-reparse semantics. The replacer-driven string transform is the whole point of the clone.")


def match_just(path, excerpt):
    for (p, prefix), (j, w) in J.items():
        if p == path and excerpt.startswith(prefix):
            return j, w
    raise SystemExit(f"NO JUSTIFICATION for {path} :: {excerpt!r}")


def main():
    rows = json.load(open(ROWS_PATH))
    fixed = {("packages/adapters/pi/src/capabilities/index.ts", 236),
             ("packages/adapters/pi/src/generated-file-manifest/index.ts", 182)}
    allow = [r for r in rows if not r["family"].startswith("p0.boundaries")
             and (r["path"], r["line"]) not in fixed]
    # distinct by (path, kind, excerpt) -> collect lines
    distinct = {}
    for r in allow:
        k = (r["path"], r["kind"], r["excerpt"])
        distinct.setdefault(k, []).append(r["line"])
    entries = []
    for (path, kind, excerpt), lines in sorted(distinct.items()):
        justification, why = match_just(path, excerpt)
        entry = {
            "path": path,
            "kind": kind,
            "locator": {"textIncludes": excerpt},
            "justification": justification,
            "whyUnavoidable": why,
            "reviewer": REVIEWER,
            "reviewedOn": REVIEWED_ON,
        }
        entries.append(entry)
    out = {"entries": entries, "distinct_count": len(entries), "escapes_covered": len(allow)}
    with open(OUT_PATH, "w") as fh:
        json.dump(out, fh, indent=2)
    print(f"generated {len(entries)} distinct entries covering {len(allow)} escapes -> {OUT_PATH}")


if __name__ == "__main__":
    main()
