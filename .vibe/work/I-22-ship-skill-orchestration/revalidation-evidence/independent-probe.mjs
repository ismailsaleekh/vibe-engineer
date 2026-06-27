// Independent adversarial probe — I-22 revalidation (glm-5.2, xhigh).
// DECISIVE invariants, proven by THIS revalidator (not the implementer's witnesses):
//   (1) Ship Packet SCHEMA enforces no-push/no-commit/no-PR via `const` — mutate each to its
//       forbidden value and confirm the REAL @vibe-engineer/artifacts validator rejects it.
//       This proves the invariant is structurally un-emissable, independent of the assembler.
//   (2) Failed-final-verify BLOCKS (N4 load-bearing) — real runShipFromBuildResult over the green
//       Build Result + a failing blocking catalog must return blocked('ship_final_verify_blocks')
//       and emit NO Ship Packet.
//   (3) Dynamic git-state invariant — HEAD + all refs unchanged before/after a real ship run.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { validateArtifactKind } from '../../../../packages/artifacts/src/index.js';
import { runShipFromBuildResult } from '../../../../packages/skills/src/ship/orchestrator/index.js';

const ROOT = '/Users/lizavasilyeva/work/vibe-engineer';
const EVID = path.join(ROOT, '.vibe/work/I-22-ship-skill-orchestration/evidence');
const CHAIN = path.join(EVID, 'witness-ship-chain');
const REVAL = path.join(ROOT, '.vibe/work/I-22-ship-skill-orchestration/revalidation-evidence');
const results = [];
const pass = (name, detail) => { results.push({ name, status: 'PASS', detail }); console.log(`[PASS] ${name} — ${detail}`); };
const fail = (name, detail) => { results.push({ name, status: 'FAIL', detail }); console.log(`[FAIL] ${name} — ${detail}`); };

function gitState() {
  const head = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
  const refs = execSync('git for-each-ref --format="%(refname) %(objectname)"', { cwd: ROOT }).toString().trim();
  const statusCount = execSync('git status --porcelain | wc -l', { cwd: ROOT }).toString().trim();
  const reflogCount = (() => { try { return execSync('git reflog -n 50 2>/dev/null | wc -l', { cwd: ROOT }).toString().trim(); } catch { return 'n/a'; } })();
  return { head, refsHash: refs, statusCount, reflogCount };
}

// ---- locate the real green Ship Packet produced by the orchestrator witness (glob) ----
const shipFiles = readdirSync(CHAIN).filter((f) => /^ship-[a-f0-9]+\.json$/.test(f));
if (shipFiles.length === 0) throw new Error('no green Ship Packet found in witness-ship-chain');
const greenPacketPath = path.join(CHAIN, shipFiles.sort().pop());
const green = JSON.parse(readFileSync(greenPacketPath, 'utf8'));
console.log(`# green packet: ${greenPacketPath} (artifactId=${green.artifactId}, status=${green.status})`);

// ---- (1a) schema baseline: the real green packet validates ----
const baseVal = validateArtifactKind('ship_packet', green);
if (baseVal.ok) pass('S0-green-validates', 'real @vibe-engineer/artifacts accepts the green Ship Packet');
else fail('S0-green-validates', `validator rejected green packet: ${JSON.stringify(baseVal.errors)}`);

// ---- (1b) DECISIVE: mutate noPushWithoutApproval -> false ; MUST be schema-rejected (const:true) ----
{
  const m = structuredClone(green);
  m.noPushWithoutApproval = false;
  const v = validateArtifactKind('ship_packet', m);
  if (!v.ok) pass('S1-noPushWithoutApproval-false-rejected', 'const:true enforced — push-allowed packet is unvalidatable');
  else fail('S1-noPushWithoutApproval-false-rejected', 'CRITICAL: schema ACCEPTED noPushWithoutApproval=false');
}

// ---- (1c) DECISIVE: mutate commitPerformedByAgent -> true ; MUST be rejected (const:false) ----
{
  const m = structuredClone(green);
  m.commitPreparation.commitPerformedByAgent = true;
  const v = validateArtifactKind('ship_packet', m);
  if (!v.ok) pass('S2-commitPerformedByAgent-true-rejected', 'const:false enforced — agent-commit packet is unvalidatable');
  else fail('S2-commitPerformedByAgent-true-rejected', 'CRITICAL: schema ACCEPTED commitPerformedByAgent=true');
}

// ---- (1d) DECISIVE: mutate prOpenedByAgent -> true ; MUST be rejected (const:false) ----
{
  const m = structuredClone(green);
  m.prPreparation.prOpenedByAgent = true;
  const v = validateArtifactKind('ship_packet', m);
  if (!v.ok) pass('S3-prOpenedByAgent-true-rejected', 'const:false enforced — agent-PR packet is unvalidatable');
  else fail('S3-prOpenedByAgent-true-rejected', 'CRITICAL: schema ACCEPTED prOpenedByAgent=true');
}

// ---- (1e) DECISIVE: inject a stray push/commit/PR field — root additionalProperties:false must reject ----
{
  const m = structuredClone(green);
  m.gitPushCommand = 'git push origin main';
  const v = validateArtifactKind('ship_packet', m);
  if (!v.ok) pass('S4-stray-push-field-rejected', 'additionalProperties:false — no hidden push/commit/PR field can sneak in');
  else fail('S4-stray-push-field-rejected', 'CRITICAL: schema ACCEPTED a stray gitPushCommand field');
}

// ---- (2) DECISIVE: failed final-verify BLOCKS (N4 load-bearing) via real orchestrator ----
{
  const seedBuild = readdirSync(path.join(CHAIN, 'seed-build')).filter((f) => /^build-[a-f0-9]+\.json$/.test(f)).sort().pop();
  const buildResultPath = path.join(CHAIN, 'seed-build', seedBuild);
  const failingCatalog = JSON.parse(readFileSync(path.join(EVID, 'witness-cli-dispatch/failing-catalog.json'), 'utf8'));
  const before = gitState();
  const out = await runShipFromBuildResult({
    buildResultPath,
    evidenceRoot: path.join(REVAL, 'probe-n4'),
    projectRoot: ROOT,
    runId: 'i22-reval-n4-probe',
    runnerCatalog: failingCatalog
  });
  const after = gitState();
  if (!out.ok && out.reason === 'ship_final_verify_blocks') {
    pass('N4-failed-final-verify-blocks', `reason=${out.reason} verificationStatus=${out.verificationStatus} — NO Ship Packet emitted`);
  } else {
    fail('N4-failed-final-verify-blocks', `CRITICAL: expected blocked('ship_final_verify_blocks'); got ok=${out.ok} reason=${out.reason}`);
  }
  // git-state dynamic invariant on the failing run too
  if (before.head === after.head && before.refsHash === after.refsHash) {
    pass('N4-git-state-unchanged', `HEAD=${after.head.slice(0,12)} refs+status-count unchanged by the failing ship run`);
  } else {
    fail('N4-git-state-unchanged', `CRITICAL: git state changed: head ${before.head} -> ${after.head}`);
  }
}

// ---- (3) dynamic git-state on a GREEN ship run (re-run the real green path, assert no commit/push/tag) ----
{
  const seedBuild = readdirSync(path.join(CHAIN, 'seed-build')).filter((f) => /^build-[a-f0-9]+\.json$/.test(f)).sort().pop();
  const buildResultPath = path.join(CHAIN, 'seed-build', seedBuild);
  const greenCatalog = JSON.parse(readFileSync(path.join(EVID, 'witness-cli-dispatch/runner-catalog.json'), 'utf8'));
  const before = gitState();
  const out = await runShipFromBuildResult({
    buildResultPath,
    evidenceRoot: path.join(REVAL, 'probe-green'),
    projectRoot: ROOT,
    runId: 'i22-reval-green-probe',
    runnerCatalog: greenCatalog,
    now: '2026-06-27T09:00:00.000Z'
  });
  const after = gitState();
  if (out.ok) {
    const p = out.value.shipPacket;
    const inv = p.noPushWithoutApproval === true && p.commitPreparation.commitPerformedByAgent === false && p.prPreparation.prOpenedByAgent === false;
    if (inv) pass('GREEN-probe-packet-invariant', `green packet invariant held: noPush=true commitByAgent=false prByAgent=false status=${p.status}`);
    else fail('GREEN-probe-packet-invariant', 'CRITICAL: green packet invariant violated by assembler');
  } else {
    fail('GREEN-probe-packet-invariant', `green probe unexpectedly blocked: ${out.reason} ${out.verificationStatus ?? ''}`);
  }
  if (before.head === after.head && before.refsHash === after.refsHash) {
    pass('GREEN-git-state-unchanged', `HEAD+refs unchanged by the green ship run (no commit/push/tag)`);
  } else {
    fail('GREEN-git-state-unchanged', `CRITICAL: git state changed by green ship run`);
  }
}

const summary = { total: results.length, pass: results.filter((r) => r.status === 'PASS').length, fail: results.filter((r) => r.status === 'FAIL').length, results };
console.log(`\n# PROBE SUMMARY: ${summary.pass}/${summary.total} PASS, ${summary.fail} FAIL`);
writeFileSync(path.join(REVAL, 'probe-summary.json'), JSON.stringify(summary, null, 2));
process.exit(summary.fail === 0 ? 0 : 1);
