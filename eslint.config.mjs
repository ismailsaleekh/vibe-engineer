import js from "@eslint/js";
import tseslint from "typescript-eslint";

const sourceFiles = [
  "**/*.js",
  "**/*.mjs",
  "**/*.cjs",
  "**/*.ts",
  "**/*.tsx",
  "**/*.mts",
  "**/*.cts",
];

const nodeAndBrowserGlobals = {
  AbortController: "readonly",
  Buffer: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  crypto: "readonly",
  document: "readonly",
  fetch: "readonly",
  File: "readonly",
  FormData: "readonly",
  global: "readonly",
  globalThis: "readonly",
  Headers: "readonly",
  process: "readonly",
  Request: "readonly",
  require: "readonly",
  Response: "readonly",
  setTimeout: "readonly",
  TextDecoder: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  window: "readonly",
  __dirname: "readonly",
  __filename: "readonly",
};

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/node_modules/**",
      ".vibe/**",
      ".pi/**",
      ".vitepress/cache/**",
      "**/fixtures/**",
      "**/.generated-fixtures/**",
      "examples/starter-reference/generated-fixtures/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: sourceFiles,
  })),
  {
    files: sourceFiles,
    languageOptions: {
      globals: nodeAndBrowserGlobals,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-check": false,
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": true,
          minimumDescriptionLength: 20,
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-useless-escape": "off",
    },
  },
);
