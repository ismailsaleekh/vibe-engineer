import {
  assertBlockingFinding,
  assertOkResult,
  createEphemeralWorkspace,
  normalizeForSnapshot,
  type EphemeralWorkspace,
  type TypedResultLike
} from "@vibe-engineer/testing";

async function consumeHelpers(): Promise<EphemeralWorkspace> {
  const workspace = await createEphemeralWorkspace({ prefix: "type-consumer-" });
  await workspace.writeFile("example.txt", "typed");
  return workspace;
}

const ok: TypedResultLike = { ok: true, findings: [] };
assertOkResult(ok);
assertBlockingFinding({ ok: false, findings: [{ ruleId: "typed.rule", blocking: true }] }, "typed.rule");
normalizeForSnapshot({ stable: true });
void consumeHelpers;
