import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const sourcePath = path.join(repoRoot, '.vibe/work/I-11S-contract-dependency-package-handoff/validation-evidence/import-witness.ts');
const virtualContractsPath = path.join(repoRoot, 'packages/contracts/__validation__/import-witness.ts');
const sourceText = fs.readFileSync(sourcePath, 'utf8');

const options = {
  noEmit: true,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  target: ts.ScriptTarget.ES2022,
  skipLibCheck: true,
  strict: true,
  esModuleInterop: false,
  allowSyntheticDefaultImports: false,
  forceConsistentCasingInFileNames: true,
};

const host = ts.createCompilerHost(options, true);
const originalGetSourceFile = host.getSourceFile.bind(host);
const originalFileExists = host.fileExists.bind(host);
const originalReadFile = host.readFile.bind(host);

host.getCurrentDirectory = () => repoRoot;
host.fileExists = (fileName) => (path.resolve(fileName) === virtualContractsPath ? true : originalFileExists(fileName));
host.readFile = (fileName) => (path.resolve(fileName) === virtualContractsPath ? sourceText : originalReadFile(fileName));
host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
  if (path.resolve(fileName) === virtualContractsPath) {
    return ts.createSourceFile(fileName, sourceText, languageVersion, true, ts.ScriptKind.TS);
  }
  return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
};

const program = ts.createProgram([virtualContractsPath], options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);

if (diagnostics.length > 0) {
  const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => repoRoot,
    getNewLine: () => '\n',
  });
  console.error(formatted);
  process.exit(1);
}

const required = [
  'reflect-metadata',
  'zod',
  '@ts-rest/core',
  '@ts-rest/nest',
  '@nestjs/common',
  '@nestjs/core',
  '@nestjs/platform-express',
  'rxjs',
  'vitest',
  '@vitest/coverage-v8',
];

for (const specifier of required) {
  const resolved = ts.resolveModuleName(specifier, virtualContractsPath, options, host).resolvedModule?.resolvedFileName;
  console.log(`${specifier} => ${resolved ?? 'UNRESOLVED'}`);
  if (!resolved) {
    console.error(`Missing resolved module: ${specifier}`);
    process.exitCode = 1;
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('TypeScript import witness: PASS');
