export async function validateSchemaContractStrictness(projectRoot) {
    return { family: "p1.schema-contract-strictness", projectRoot, findings: [], evidence: { malformed: true } };
}
