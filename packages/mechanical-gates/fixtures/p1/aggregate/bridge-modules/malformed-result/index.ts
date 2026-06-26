export async function validateSchemaContractStrictness(projectRoot: string): Promise<{ family: string; projectRoot: string; findings: never[]; evidence: Record<string, unknown> }> {
  return { family: "p1.schema-contract-strictness", projectRoot, findings: [], evidence: { malformed: true } };
}
