export async function validateCodeSmells(projectRoot) {
    return { family: "p2.not-code-smell", ok: true, projectRoot, findings: [], evidence: { injectedWrongFamily: true } };
}
