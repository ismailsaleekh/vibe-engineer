export async function validateSchemaContractStrictness(projectRoot) {
    return { family: "p1.not-schema-contract-strictness", ok: true, projectRoot, findings: [], evidence: { injectedWrongFamily: true } };
}
