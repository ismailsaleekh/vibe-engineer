import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve as resolvePath } from "node:path";
import { URL, fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const reactNativeMockUrl = new URL("./react-native-test-mock.mjs", import.meta.url).href;
const sourceExtensionsForJsImports = [".ts", ".tsx", ".mts", ".cts"];

function existingFileUrl(fileUrl) {
  return existsSync(fileURLToPath(fileUrl));
}

function remapRelativeJsImportToTypeScriptSource(specifier, parentUrl) {
  if (parentUrl === undefined || !parentUrl.startsWith("file:") || !specifier.endsWith(".js")) {
    return null;
  }
  if (!(specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/"))) {
    return null;
  }

  const parentDirectory = dirname(fileURLToPath(parentUrl));
  const requestedJsPath = specifier.startsWith("/")
    ? specifier
    : resolvePath(parentDirectory, specifier);
  const requestedWithoutJs = requestedJsPath.slice(0, -".js".length);

  for (const extension of sourceExtensionsForJsImports) {
    const candidateUrl = pathToFileURL(`${requestedWithoutJs}${extension}`).href;
    if (existingFileUrl(candidateUrl)) return candidateUrl;
  }

  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "react-native") {
    return { url: reactNativeMockUrl, shortCircuit: true };
  }

  const remappedUrl = remapRelativeJsImportToTypeScriptSource(specifier, context.parentURL);
  if (remappedUrl !== null) return { url: remappedUrl, shortCircuit: true };

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (/\.(?:ts|tsx|mts|cts)$/u.test(url)) {
    const source = await readFile(fileURLToPath(url), "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        esModuleInterop: true,
        inlineSources: true,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ES2022,
        sourceMap: true,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: fileURLToPath(url),
    });

    return { format: "module", source: transpiled.outputText, shortCircuit: true };
  }

  return nextLoad(url, context);
}
