export async function validateCodeSmells(projectRoot) {
    return { family: "p2.code-smell", projectRoot, findings: [], evidence: { malformed: true } };
}
