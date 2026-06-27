// @sample @demo @reference — registers the golden-records dep-resolver loader hook.
// Usage: `node --import ./src/runtime/dep-resolver-register.mjs --experimental-strip-types <entry.ts>`.
// (Node 24: loader hooks must be registered via `register()` from `node:module`.)

import { register } from "node:module";

// Register the sibling hooks module; `import.meta.url` is the parent URL used to
// resolve the relative hook path.
register("./dep-resolver-hooks.mjs", import.meta.url);
