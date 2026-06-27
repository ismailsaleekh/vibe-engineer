export async function validateCodeSmells(projectRoot: string): Promise<{ family: string; projectRoot: string; findings: never[]; evidence: Record<string, unknown> }> {
  return { family: "p2.code-smell", projectRoot, findings: [], evidence: { malformed: true } };
}
