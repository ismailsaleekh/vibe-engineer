// NEGATIVE fixture for W-NEG-PRIVATE-SCOPED-IMPORT.
//
// This consumer imports a HARNESS INTERNAL scoped package
// (`@vibe-engineer/adapter-pi/...`) directly from the starter app, bypassing the
// public `vibe-engineer` surface. DL-16 §2 + the brief's W-NEG-PRIVATE-SCOPED-
// IMPORT forbid this: the starter may consume ONLY the public `vibe-engineer`
// harness package, never `@vibe-engineer/*` internals (adapter-pi, context,
// verification, security, artifacts, schematics, etc.) and never relative
// imports into packages/adapters/presets. The witness runner's private-scoped-
// import detector MUST flag this file. This file is a negative carrier only.

import { getPiGeneratedFileManifest } from "@vibe-engineer/adapter-pi/generated-file-manifest";
import { writeContextProject } from "@vibe-engineer/context";

export const manifest = getPiGeneratedFileManifest();
void writeContextProject;
