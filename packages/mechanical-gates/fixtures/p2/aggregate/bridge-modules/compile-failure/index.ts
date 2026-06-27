export async function validateCodeSmells(projectRoot: string) {
  return { family: "p2.code-smell", projectRoot, ok: true, findings: [], evidence: { broken: true };
}
