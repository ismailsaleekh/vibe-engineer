
const resolved = await import.meta.resolve('@vibe-engineer/orchestration');
const orchestration = await import('@vibe-engineer/orchestration');
if (!resolved.includes('/.vibe/work/TS-ROOT-build-export-contract/witness-workspaces/orchestration-build-export/packages/orchestration/dist/src/index.js')) {
  throw new Error('resolved export did not use owned transient dist: ' + resolved);
}
if (orchestration.DEFAULT_ORCHESTRATION_LIMITS.maxParallelAgents !== 8) {
  throw new Error('unexpected orchestration export value');
}
console.log(JSON.stringify({ ok: true, resolved, maxParallelAgents: orchestration.DEFAULT_ORCHESTRATION_LIMITS.maxParallelAgents }, null, 2));
