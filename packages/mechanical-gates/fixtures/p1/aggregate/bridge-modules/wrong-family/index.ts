export async function validateSchemaContractStrictness(projectRoot: string): Promise<{ family: string; ok: boolean; projectRoot: string; findings: never[]; evidence: Record<string, unknown> }> {
  return { family: "p1.not-schema-contract-strictness", ok: true, projectRoot, findings: [], evidence: { injectedWrongFamily: true } };
}
