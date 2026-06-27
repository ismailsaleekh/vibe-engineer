// YAML parsing boundary for the I-20B static workflow validator.
//
// Uses the PUBLIC, locked `js-yaml@4.2.0` (root devDependency, I-20S Step-1
// authorized; resolves from this owned path — witnessed at resume). A real,
// schema-aware typed parser is required: GitHub Actions workflows are YAML and
// a hand-rolled/regex parser is forbidden by the binding quality bar ("no
// heuristic/regex standing in for a typed contract"). Node ships no YAML
// builtin, so `js-yaml` is the only in-license typed parser.

import fs from "node:fs/promises";
import { load } from "js-yaml";

/**
 * Parse a workflow YAML file into a JS object (real parser boundary).
 * Throws a typed ParseError on malformed YAML (caller surfaces as a finding).
 */
export class ParseError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "ParseError";
    this.cause = cause;
  }
}

export async function readWorkflow(filePath) {
  let text;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new ParseError(`unable to read workflow file (${filePath}): ${error.message}`, error);
  }
  if (text.length === 0) {
    throw new ParseError(`workflow file is empty (${filePath})`);
  }
  let doc;
  try {
    doc = load(text, { schema: undefined /* DEFAULT_SCHEMA */ });
  } catch (error) {
    throw new ParseError(`YAML parse error in ${filePath}: ${error.message}`, error);
  }
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    throw new ParseError(`workflow root must be a mapping (${filePath})`);
  }
  return { doc, text };
}
