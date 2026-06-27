import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
const FAMILY = "p1.schema-contract-strictness";
const DEFAULT_MANIFEST_PATH = "schema-contract-strictness.manifest.json";
const MAX_FILE_BYTES = 256 * 1024;
function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function finding(ruleId, findingPath, message, evidence = {}) {
    return { family: FAMILY, ruleId, severity: "error", blocking: true, path: findingPath, message, evidence };
}
function assertTypedFindings(findings) {
    for (const entry of findings) {
        if (entry.family !== FAMILY || typeof entry.ruleId !== "string" || entry.ruleId.length === 0 || typeof entry.blocking !== "boolean" || typeof entry.path !== "string" || typeof entry.message !== "string" || !isPlainObject(entry.evidence)) {
            throw new Error("Schema-contract strictness emitted an untyped finding.");
        }
    }
    return true;
}
function result(projectRoot, findings, evidence) {
    assertTypedFindings(findings);
    return { family: FAMILY, ok: findings.filter((entry) => entry.blocking).length === 0, projectRoot: path.resolve(projectRoot), findings, evidence };
}
function normalizeProjectPath(projectRoot, candidatePath) {
    const root = path.resolve(projectRoot);
    const absolute = path.resolve(root, candidatePath);
    const relativePath = path.relative(root, absolute).split(path.sep).join("/");
    if (relativePath === "" || relativePath === ".." || relativePath.startsWith("../") || path.isAbsolute(relativePath)) {
        throw new Error(`Path escapes validation root: ${candidatePath}`);
    }
    return relativePath;
}
async function readTextBounded(projectRoot, relativePath) {
    const safePath = normalizeProjectPath(projectRoot, relativePath);
    const absolutePath = path.join(path.resolve(projectRoot), safePath);
    const metadata = await stat(absolutePath);
    if (!metadata.isFile())
        throw new Error(`Path is not a file: ${safePath}`);
    if (metadata.size > MAX_FILE_BYTES)
        throw new Error(`File exceeds strictness read cap: ${safePath}`);
    return readFile(absolutePath, "utf8");
}
async function pathExists(projectRoot, relativePath) {
    try {
        await stat(path.join(path.resolve(projectRoot), normalizeProjectPath(projectRoot, relativePath)));
        return true;
    }
    catch {
        return false;
    }
}
function parseJson(text, jsonPath) {
    try {
        const parsed = JSON.parse(text);
        return parsed;
    }
    catch (error) {
        throw new Error(`Invalid JSON in ${jsonPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function readStringArray(value) {
    return Array.isArray(value) && value.length > 0 && value.every((entry) => typeof entry === "string" && entry.length > 0) ? value : undefined;
}
function validateManifestShape(raw, manifestPath, findings) {
    const allowedKeys = new Set(["schemaVersion", "proofMode", "canonicalContractFile", "generatedClientFile", "providerFile", "consumerFile", "realBoundaryTestFile", "sourceFiles", "boundaryFiles", "domainModelFiles", "requiredNamedSchemas", "requiredProviderSchemaCalls", "requiredConsumerImports"]);
    if (!isPlainObject(raw)) {
        findings.push(finding("named-runtime-schema-boundary.manifest-malformed", manifestPath, "Strictness manifest must be a JSON object."));
        return undefined;
    }
    for (const key of Object.keys(raw)) {
        if (!allowedKeys.has(key))
            findings.push(finding("named-runtime-schema-boundary.unknown-manifest-field", `${manifestPath}#/${key}`, "Unknown strictness manifest field fails closed.", { key }));
    }
    if (raw.schemaVersion !== "i11.schema-contract-strictness/1")
        findings.push(finding("named-runtime-schema-boundary.manifest-malformed", `${manifestPath}#/schemaVersion`, "Unsupported strictness manifest version."));
    if (raw.proofMode !== "typescript-ast")
        findings.push(finding("named-runtime-schema-boundary.regex-only-proof-rejected", `${manifestPath}#/proofMode`, "Schema-contract proof must use TypeScript AST, not regex or narrative proof.", { actual: raw.proofMode ?? null }));
    const canonicalContractFile = typeof raw.canonicalContractFile === "string" && raw.canonicalContractFile.length > 0 ? raw.canonicalContractFile : undefined;
    const generatedClientFile = typeof raw.generatedClientFile === "string" && raw.generatedClientFile.length > 0 ? raw.generatedClientFile : undefined;
    const providerFile = typeof raw.providerFile === "string" && raw.providerFile.length > 0 ? raw.providerFile : undefined;
    const consumerFile = typeof raw.consumerFile === "string" && raw.consumerFile.length > 0 ? raw.consumerFile : undefined;
    const realBoundaryTestFile = typeof raw.realBoundaryTestFile === "string" && raw.realBoundaryTestFile.length > 0 ? raw.realBoundaryTestFile : undefined;
    for (const [key, value] of [
        ["canonicalContractFile", canonicalContractFile],
        ["generatedClientFile", generatedClientFile],
        ["providerFile", providerFile],
        ["consumerFile", consumerFile],
        ["realBoundaryTestFile", realBoundaryTestFile]
    ]) {
        if (!value)
            findings.push(finding("named-runtime-schema-boundary.manifest-malformed", `${manifestPath}#/${key}`, "Manifest path field must be a non-empty string."));
    }
    const sourceFiles = readStringArray(raw.sourceFiles);
    const boundaryFiles = readStringArray(raw.boundaryFiles);
    const domainModelFiles = readStringArray(raw.domainModelFiles);
    const requiredNamedSchemas = readStringArray(raw.requiredNamedSchemas);
    const requiredProviderSchemaCalls = readStringArray(raw.requiredProviderSchemaCalls);
    const requiredConsumerImports = readStringArray(raw.requiredConsumerImports);
    for (const [key, value] of [
        ["sourceFiles", sourceFiles],
        ["boundaryFiles", boundaryFiles],
        ["domainModelFiles", domainModelFiles],
        ["requiredNamedSchemas", requiredNamedSchemas],
        ["requiredProviderSchemaCalls", requiredProviderSchemaCalls],
        ["requiredConsumerImports", requiredConsumerImports]
    ]) {
        if (!value)
            findings.push(finding("named-runtime-schema-boundary.manifest-malformed", `${manifestPath}#/${key}`, "Manifest field must be a non-empty string array."));
    }
    if (findings.length > 0 || !canonicalContractFile || !generatedClientFile || !providerFile || !consumerFile || !realBoundaryTestFile || !sourceFiles || !boundaryFiles || !domainModelFiles || !requiredNamedSchemas || !requiredProviderSchemaCalls || !requiredConsumerImports)
        return undefined;
    return {
        schemaVersion: "i11.schema-contract-strictness/1",
        proofMode: "typescript-ast",
        canonicalContractFile,
        generatedClientFile,
        providerFile,
        consumerFile,
        realBoundaryTestFile,
        sourceFiles,
        boundaryFiles,
        domainModelFiles,
        requiredNamedSchemas,
        requiredProviderSchemaCalls,
        requiredConsumerImports
    };
}
function sourceKind(filePath) {
    if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx"))
        return ts.ScriptKind.TSX;
    if (filePath.endsWith(".js") || filePath.endsWith(".mjs") || filePath.endsWith(".cjs"))
        return ts.ScriptKind.JS;
    return ts.ScriptKind.TS;
}
async function readSourceUnit(projectRoot, filePath) {
    const safePath = normalizeProjectPath(projectRoot, filePath);
    const text = await readTextBounded(projectRoot, safePath);
    return { filePath: safePath, text, sourceFile: ts.createSourceFile(safePath, text, ts.ScriptTarget.Latest, true, sourceKind(safePath)) };
}
function isIdentifierNamed(node, expected) {
    return Boolean(node && ts.isIdentifier(node) && node.text === expected);
}
function propertyNameText(name) {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name))
        return name.text;
    return undefined;
}
function expressionName(expression) {
    if (ts.isIdentifier(expression))
        return expression.text;
    if (ts.isPropertyAccessExpression(expression))
        return `${expressionName(expression.expression) ?? ""}.${expression.name.text}`;
    return undefined;
}
function collectImports(unit) {
    const imports = [];
    function visit(node) {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier))
            imports.push(node.moduleSpecifier.text);
        ts.forEachChild(node, visit);
    }
    visit(unit.sourceFile);
    return imports;
}
function collectExportedConstNames(unit) {
    const names = new Set();
    function visit(node) {
        if (ts.isVariableStatement(node)) {
            const exported = node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true;
            if (exported) {
                for (const declaration of node.declarationList.declarations) {
                    if (ts.isIdentifier(declaration.name))
                        names.add(declaration.name.text);
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(unit.sourceFile);
    return names;
}
function inspectNamedSchemas(contractUnit, manifest, findings) {
    const exported = collectExportedConstNames(contractUnit);
    for (const schemaName of manifest.requiredNamedSchemas) {
        if (!exported.has(schemaName))
            findings.push(finding("named-runtime-schema-boundary.named-schema-missing", contractUnit.filePath, "Required named runtime schema is missing from canonical contract source.", { schemaName }));
    }
}
function inspectContractShapes(contractUnit, findings) {
    function isBareContractShape(node) {
        if (ts.isCallExpression(node) && expressionName(node.expression) === "z.object")
            return true;
        if (ts.isArrayLiteralExpression(node))
            return true;
        return false;
    }
    function inspectRouteProperty(property) {
        const name = propertyNameText(property.name);
        if (!name || !["body", "query", "headers", "pathParams", "responses"].includes(name))
            return;
        if (isBareContractShape(property.initializer)) {
            findings.push(finding("named-runtime-schema-boundary.bare-contract-shape", contractUnit.filePath, "Important contract shapes must reference named runtime schemas, not inline/bare object/list/map shapes.", { property: name }));
        }
        if (name === "responses" && ts.isObjectLiteralExpression(property.initializer)) {
            for (const responseProperty of property.initializer.properties) {
                if (ts.isPropertyAssignment(responseProperty) && isBareContractShape(responseProperty.initializer)) {
                    findings.push(finding("named-runtime-schema-boundary.bare-contract-shape", contractUnit.filePath, "Response contracts must reference named response schemas.", { property: propertyNameText(responseProperty.name) ?? "response" }));
                }
            }
        }
    }
    function visit(node) {
        if (ts.isPropertyAssignment(node))
            inspectRouteProperty(node);
        ts.forEachChild(node, visit);
    }
    visit(contractUnit.sourceFile);
}
function inspectDuplicateSchemas(units, contractFile, findings) {
    for (const unit of units) {
        if (unit.filePath === contractFile)
            continue;
        function visit(node) {
            if (ts.isCallExpression(node) && expressionName(node.expression) === "z.object") {
                findings.push(finding("named-runtime-schema-boundary.duplicate-dto-schema-source", unit.filePath, "Only the canonical contract source may define payload Zod object schemas for this seam."));
            }
            if ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && /(Dto|DTO|Request|Response|Payload)$/.test(node.name.text)) {
                findings.push(finding("named-runtime-schema-boundary.duplicate-dto-schema-source", unit.filePath, "Provider/client/consumer DTO or payload types must be contract-derived, not duplicated."));
            }
            ts.forEachChild(node, visit);
        }
        visit(unit.sourceFile);
    }
}
function inspectBroadRecordModels(units, findings) {
    for (const unit of units) {
        function visit(node) {
            if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && node.typeName.text === "Record" && node.typeArguments?.length === 2) {
                const [first, second] = node.typeArguments;
                if (first && second && first.kind === ts.SyntaxKind.StringKeyword && second.kind === ts.SyntaxKind.UnknownKeyword) {
                    findings.push(finding("named-runtime-schema-boundary.broad-record-domain-model", unit.filePath, "Broad Record<string, unknown> domain models are forbidden at contract boundaries."));
                }
            }
            ts.forEachChild(node, visit);
        }
        visit(unit.sourceFile);
    }
}
function inspectJsonParse(units, boundaryFiles, findings) {
    for (const unit of units) {
        if (!boundaryFiles.has(unit.filePath))
            continue;
        function visit(node) {
            if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && isIdentifierNamed(node.expression.expression, "JSON") && node.expression.name.text === "parse") {
                findings.push(finding("named-runtime-schema-boundary.unvalidated-json-parse", unit.filePath, "Boundary JSON.parse is forbidden; boundary values must enter as unknown and be narrowed by named schemas."));
            }
            ts.forEachChild(node, visit);
        }
        visit(unit.sourceFile);
    }
}
function inspectProviderValidation(providerUnit, manifest, findings) {
    const calledSchemas = new Set();
    function visit(node) {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
            const owner = expressionName(node.expression.expression);
            const method = node.expression.name.text;
            if (owner && ["parse", "safeParse"].includes(method))
                calledSchemas.add(owner);
        }
        ts.forEachChild(node, visit);
    }
    visit(providerUnit.sourceFile);
    for (const schemaName of manifest.requiredProviderSchemaCalls) {
        if (!calledSchemas.has(schemaName))
            findings.push(finding("named-runtime-schema-boundary.unvalidated-boundary-payload", providerUnit.filePath, "Provider/API boundary must validate request and response data with named schemas before use/exposure.", { schemaName }));
    }
}
function inspectConsumerImports(consumerUnit, manifest, findings) {
    const imported = collectImports(consumerUnit);
    for (const requiredImport of manifest.requiredConsumerImports) {
        if (!imported.includes(requiredImport))
            findings.push(finding("named-runtime-schema-boundary.consumer-not-using-generated-client", consumerUnit.filePath, "Consumer fixture must import the generated/shared client artifact derived from the canonical contract.", { requiredImport }));
    }
}
function extractStringLiteralProperty(objectExpression, propertyName) {
    for (const property of objectExpression.properties) {
        if (ts.isPropertyAssignment(property) && propertyNameText(property.name) === propertyName && ts.isStringLiteralLike(property.initializer))
            return property.initializer.text;
    }
    return undefined;
}
function inspectGeneratedClientProvenance(generatedUnit, contractUnit, manifest, findings) {
    let provenanceObject;
    function visit(node) {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "GENERATED_CLIENT_PROVENANCE") {
            if (node.initializer && ts.isAsExpression(node.initializer) && ts.isObjectLiteralExpression(node.initializer.expression))
                provenanceObject = node.initializer.expression;
            if (node.initializer && ts.isObjectLiteralExpression(node.initializer))
                provenanceObject = node.initializer;
        }
        ts.forEachChild(node, visit);
    }
    visit(generatedUnit.sourceFile);
    if (!provenanceObject) {
        findings.push(finding("named-runtime-schema-boundary.generated-client-provenance-missing", generatedUnit.filePath, "Generated/shared client must expose a verifiable provenance marker."));
        return;
    }
    const sourceSha256 = extractStringLiteralProperty(provenanceObject, "sourceSha256");
    const canonicalContractPath = extractStringLiteralProperty(provenanceObject, "canonicalContractPath");
    const generatedClientPath = extractStringLiteralProperty(provenanceObject, "generatedClientPath");
    const actualHash = createHash("sha256").update(contractUnit.text).digest("hex");
    if (canonicalContractPath !== manifest.canonicalContractFile || generatedClientPath !== manifest.generatedClientFile || sourceSha256 !== actualHash) {
        findings.push(finding("named-runtime-schema-boundary.generated-client-stale", generatedUnit.filePath, "Generated/shared client provenance does not match the current canonical contract source.", { canonicalContractPath, generatedClientPath, sourceSha256, actualHash }));
    }
}
function inspectRealBoundaryTest(testUnit, manifest, findings) {
    const imports = collectImports(testUnit);
    const importsProvider = imports.some((specifier) => specifier.includes("provider") || specifier.includes("reference-flow.provider"));
    const importsGeneratedClient = imports.some((specifier) => specifier.includes("generated") || specifier.includes("reference-flow-client"));
    let parseCalls = 0;
    let clientCalls = 0;
    function visit(node) {
        if (ts.isCallExpression(node)) {
            const name = expressionName(node.expression) ?? "";
            if (name.endsWith(".parse") || name.endsWith(".safeParse"))
                parseCalls += 1;
            if (name.includes("referenceFlowClient") || name.includes("callReferenceFlowConsumer"))
                clientCalls += 1;
        }
        ts.forEachChild(node, visit);
    }
    visit(testUnit.sourceFile);
    if (!importsProvider || !importsGeneratedClient || clientCalls === 0) {
        findings.push(finding("named-runtime-schema-boundary.parser-self-agreement-only-test", manifest.realBoundaryTestFile, "Contract tests must exercise actual provider/client/consumer behavior, not parser self-agreement only.", { importsProvider, importsGeneratedClient, parseCalls, clientCalls }));
    }
}
export async function validateSchemaContractStrictness(projectRoot, options = {}) {
    const optionKeys = Object.keys(options);
    const unknownOption = optionKeys.find((key) => key !== "manifestPath");
    if (unknownOption) {
        return result(projectRoot, [finding("named-runtime-schema-boundary.unknown-validator-option", ".", "Unknown validator options fail closed.", { option: unknownOption })], { failClosed: true });
    }
    const manifestPath = options.manifestPath ?? DEFAULT_MANIFEST_PATH;
    const initialFindings = [];
    let manifestText;
    try {
        manifestText = await readTextBounded(projectRoot, manifestPath);
    }
    catch (error) {
        return result(projectRoot, [finding("named-runtime-schema-boundary.manifest-unreadable", manifestPath, "Strictness manifest is missing, unreadable, malformed, or outside the validation root.", { errorMessage: error instanceof Error ? error.message : String(error) })], { manifestPath, failClosed: true });
    }
    let rawManifest;
    try {
        rawManifest = parseJson(manifestText, manifestPath);
    }
    catch (error) {
        return result(projectRoot, [finding("named-runtime-schema-boundary.manifest-unreadable", manifestPath, "Strictness manifest is missing, unreadable, malformed, or outside the validation root.", { errorMessage: error instanceof Error ? error.message : String(error) })], { manifestPath, failClosed: true });
    }
    const manifest = validateManifestShape(rawManifest, manifestPath, initialFindings);
    if (!manifest)
        return result(projectRoot, initialFindings, { manifestPath, failClosed: true });
    const allPaths = new Set([manifest.canonicalContractFile, manifest.generatedClientFile, manifest.providerFile, manifest.consumerFile, manifest.realBoundaryTestFile, ...manifest.sourceFiles, ...manifest.boundaryFiles, ...manifest.domainModelFiles]);
    for (const sourcePath of allPaths) {
        try {
            normalizeProjectPath(projectRoot, sourcePath);
            if (!(await pathExists(projectRoot, sourcePath)))
                initialFindings.push(finding("named-runtime-schema-boundary.required-file-missing", sourcePath, "Required strictness fixture file is missing."));
        }
        catch (error) {
            initialFindings.push(finding("named-runtime-schema-boundary.path-traversal", sourcePath, "Strictness manifest path escapes the project root.", { errorMessage: error instanceof Error ? error.message : String(error) }));
        }
    }
    if (initialFindings.length > 0)
        return result(projectRoot, initialFindings, { manifestPath, failClosed: true });
    const sourceUnits = await Promise.all([...new Set(manifest.sourceFiles)].map((filePath) => readSourceUnit(projectRoot, filePath)));
    const unitByPath = new Map(sourceUnits.map((unit) => [unit.filePath, unit]));
    const contractUnit = unitByPath.get(normalizeProjectPath(projectRoot, manifest.canonicalContractFile));
    const generatedUnit = unitByPath.get(normalizeProjectPath(projectRoot, manifest.generatedClientFile));
    const providerUnit = unitByPath.get(normalizeProjectPath(projectRoot, manifest.providerFile));
    const consumerUnit = unitByPath.get(normalizeProjectPath(projectRoot, manifest.consumerFile));
    const testUnit = unitByPath.get(normalizeProjectPath(projectRoot, manifest.realBoundaryTestFile));
    if (!contractUnit || !generatedUnit || !providerUnit || !consumerUnit || !testUnit) {
        return result(projectRoot, [finding("named-runtime-schema-boundary.required-file-missing", manifestPath, "Manifest required files must also be listed in sourceFiles.")], { manifestPath, failClosed: true });
    }
    const findings = [];
    inspectNamedSchemas(contractUnit, manifest, findings);
    inspectContractShapes(contractUnit, findings);
    inspectDuplicateSchemas(sourceUnits, contractUnit.filePath, findings);
    inspectBroadRecordModels(sourceUnits.filter((unit) => manifest.domainModelFiles.includes(unit.filePath)), findings);
    inspectJsonParse(sourceUnits, new Set(manifest.boundaryFiles.map((entry) => normalizeProjectPath(projectRoot, entry))), findings);
    inspectProviderValidation(providerUnit, manifest, findings);
    inspectConsumerImports(consumerUnit, manifest, findings);
    inspectGeneratedClientProvenance(generatedUnit, contractUnit, manifest, findings);
    inspectRealBoundaryTest(testUnit, manifest, findings);
    return result(projectRoot, findings, {
        manifestPath,
        parser: "typescript",
        proofMode: "typescript-ast",
        family: FAMILY,
        sourceFileCount: sourceUnits.length,
        boundaryFileCount: manifest.boundaryFiles.length,
        requiredNamedSchemas: manifest.requiredNamedSchemas,
        generatedClientFile: manifest.generatedClientFile,
        canonicalContractFile: manifest.canonicalContractFile
    });
}
