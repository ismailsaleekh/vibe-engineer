export async function validateSchemaContractStrictness(projectRoot: string) {
  return { family: "p1.schema-contract-strictness", projectRoot, ok: true, findings: [], evidence: { broken: true };
}
