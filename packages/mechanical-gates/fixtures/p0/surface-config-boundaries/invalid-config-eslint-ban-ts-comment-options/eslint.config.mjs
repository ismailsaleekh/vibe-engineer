export default [
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    rules: {
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-non-null-assertion": "error",
  "@typescript-eslint/ban-ts-comment": [
    "error",
    {
      "ts-expect-error": true,
      "ts-ignore": false,
      "ts-nocheck": false,
      "minimumDescriptionLength": 0
    }
  ],
  "@typescript-eslint/no-unnecessary-type-assertion": "error",
  "@typescript-eslint/consistent-type-imports": [
    "error",
    {
      "prefer": "type-imports"
    }
  ],
  "@typescript-eslint/no-confusing-void-expression": "error",
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-argument": "error",
  "@typescript-eslint/no-unsafe-call": "error",
  "@typescript-eslint/no-unsafe-member-access": "error",
  "@typescript-eslint/no-unsafe-return": "error",
  "@typescript-eslint/restrict-template-expressions": "error",
  "@typescript-eslint/switch-exhaustiveness-check": "error",
  "no-empty": [
    "error",
    {
      "allowEmptyCatch": false
    }
  ],
  "no-fallthrough": "error",
  "no-implicit-coercion": "error",
  "no-restricted-syntax": [
    "error",
    {
      "selector": "CallExpression[callee.object.name='JSON'][callee.property.name='parse']",
      "message": "Parse untrusted JSON only behind a named runtime boundary validator."
    }
  ]
}
  }
];
