# @vibe-engineer/artifacts

Package-owned implementation for DL-02 canonical artifact contracts.

- Canonical carriers are UTF-8 JSON files validated against committed JSON Schema 2020-12 schemas in `schemas/*.schema.json`.
- Runtime APIs treat boundary data as `unknown` and fail closed with typed validation errors.
- Generated TypeScript declarations in `src/generated/types.d.ts` are derived from the committed schemas by `scripts/generate-types.mjs`; `scripts/check-generated-types.mjs` is the drift witness.
- Markdown, YAML, frontmatter, chat text, and TypeScript object literals are not accepted as canonical carriers.
