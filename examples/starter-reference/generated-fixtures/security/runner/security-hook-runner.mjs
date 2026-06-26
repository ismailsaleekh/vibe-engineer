import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const cliPackageRequire = createRequire(new URL('../../../../../packages/cli/package.json', import.meta.url));
const securityModule = await import(cliPackageRequire.resolve('@vibe-engineer/security'));
const { SecurityGateStatus, redactSecurityText, redactSecurityValue, runSecurityGate } = securityModule;

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(redactSecurityValue(data), null, 2)}\n`, 'utf8');
}

async function main() {
  const [requestPath, outputPath] = process.argv.slice(2);
  if (typeof requestPath !== 'string' || typeof outputPath !== 'string') {
    console.error('security hook runner requires typed request and output paths');
    process.exitCode = 2;
    return;
  }
  const request = await readJson(requestPath);
  const result = runSecurityGate(request);
  const summary = {
    ok: result.status === SecurityGateStatus.Passed || result.status === 'advisory',
    status: result.status,
    decision: result.decision,
    findingClassifications: result.findings.map((finding) => finding.classification),
    findings: result.findings,
    auditEvents: result.auditEvents
  };
  await writeJson(outputPath, summary);
  process.stdout.write(`${redactSecurityText(JSON.stringify({ status: result.status, decision: result.decision }))}\n`);
  if (result.status !== SecurityGateStatus.Passed && result.status !== 'advisory') {
    process.exitCode = 4;
  }
}

main().catch((error) => {
  console.error(redactSecurityText(error instanceof Error ? error.message : 'security hook runner failed'));
  process.exitCode = 1;
});
