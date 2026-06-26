import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalSchemaIdsByKind, loadRegistry } from '@vibe-engineer/registry';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageRoot, '../..');

assert.ok(fs.existsSync(path.join(packageRoot, 'src/index.js')), 'public source entrypoint exists');
assert.ok(fs.existsSync(path.join(packageRoot, 'src/index.d.ts')), 'public type entrypoint exists');
assert.ok(canonicalSchemaIdsByKind().agent_registry_entry.endsWith('/agent-registry-entry.schema.json'));
const core = loadRegistry(path.join(repoRoot, '.vibe/registry/core-agents'));
assert.equal(core.ok, true, core.errors.map((error) => `${error.ruleId}: ${error.message}`).join('\n'));
console.log('registry build smoke passed');
