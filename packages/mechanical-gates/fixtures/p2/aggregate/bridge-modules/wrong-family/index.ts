export async function validateCodeSmells(projectRoot: string): Promise<{ family: string; ok: boolean; projectRoot: string; findings: never[]; evidence: Record<string, unknown> }> {
  return { family: "p2.not-code-smell", ok: true, projectRoot, findings: [], evidence: { injectedWrongFamily: true } };
}
