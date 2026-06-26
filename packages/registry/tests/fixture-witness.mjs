import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertRegistryOk, loadRegistry } from '@vibe-engineer/registry';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageRoot, '../..');

const coreRoot = path.join(repoRoot, '.vibe/registry/core-agents');
const fixtureRoot = path.join(packageRoot, 'fixtures/valid/core-set');
const scopedProject = path.join(packageRoot, 'fixtures/valid/scoped/project-extension.json');
const scopedSample = path.join(packageRoot, 'fixtures/valid/scoped/sample-demo.json');

const core = assertRegistryOk(loadRegistry(coreRoot));
assert.equal(core.entries.length, 7);
assert.ok(core.entriesById.has('core-orchestrator'));
assert.ok(core.entriesById.has('locked-skill-adapter'));
assert.ok(core.graph.validatorLinks.some((link) => link.from === 'core-orchestrator' && link.to === 'registry-quality-validator'));
assert.ok(core.entries.filter((entry) => entry.agentType !== 'reviewer').every((entry) => entry.validatorRefs.some((ref) => ref.artifactKind === 'agent_registry_entry' && ref.artifactId !== entry.agentId && ref.required === true)));
assert.ok(core.graph.topLevelLinks.some((link) => link.from === 'core-orchestrator' && link.to !== 'core-orchestrator'));
assert.ok(core.entries.every((entry) => entry.evals.every((ref) => ref.artifactKind === 'evidence_packet')));
assert.ok(core.entries.every((entry) => entry.extensions['dev.vibe.registry'].smokeRefs.every((ref) => ref.artifactKind === 'evidence_packet')));

const fixtures = assertRegistryOk(loadRegistry(fixtureRoot));
assert.equal(fixtures.entries.length, 7);
assert.deepEqual(new Set(fixtures.entries.map((entry) => entry.agentType)), new Set(['orchestrator', 'specialist', 'validator', 'fixer', 'reviewer', 'meta', 'skill_adapter']));
assert.ok(fixtures.graph.topLevelLinks.some((link) => link.from === 'fixture-specialist' && link.to === 'fixture-orchestrator'));
assert.ok(fixtures.entries.every((entry) => entry.evals.every((ref) => ref.artifactKind === 'evidence_packet')));

assert.equal(loadRegistry(scopedProject).ok, false);
assert.equal(assertRegistryOk(loadRegistry(scopedProject, { allowedScopes: ['project_extension'] })).entries[0].agentId, 'fixture-project-extension');
assert.equal(loadRegistry(scopedSample).ok, false);
assert.equal(assertRegistryOk(loadRegistry(scopedSample, { allowSamples: true })).entries[0].agentId, 'fixture-sample-demo');

console.log('fixture witness passed: public @vibe-engineer/registry API loaded core entries and fixtures through canonical on-disk JSON');
