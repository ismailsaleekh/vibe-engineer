// @sample @demo @reference — observability fixture dep-resolver register (I-19).
// Registers the ESM resolve loader hook (src/runtime/dep-resolver-hooks.mjs).
// Mirror of golden-{api,flow}/src/runtime/dep-resolver-register.mjs.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const hookUrl = new URL("./dep-resolver-hooks.mjs", import.meta.url);
register(hookUrl, pathToFileURL(import.meta.url).toString());
