// ESLint config — V3.9 lint policy (§18): zero-error readiness.
// server/shared/client/src are type-aware (projectService). Tests + scripts
// are NOT in the main tsconfig (tests excluded, scripts run via tsx), so they
// lint with non-type-aware recommended rules.
//
// Deliberately minimal: rules that would churn legacy code (useless-escape,
// useless-assignment, prefer-const, extra-boolean-cast, ban-ts-comment) are
// OFF. Real-defect rules stay errors: fallthrough, debugger, dupe-keys,
// dupe-class-members, constant-condition, no-empty (with empty-catch allowed),
// and no-redeclare. unused-vars is a warning (tsc already guards type errors).
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "build/**", "migrations/**", "*.cjs"],
  },
  // Type-aware block: production code (server, shared, client).
  {
    files: ["server/**/*.ts", "shared/**/*.ts", "client/src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-redeclare": "error",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-useless-assignment": "off",
      "no-useless-escape": "off",
      "no-constant-binary-expression": "off",
      "prefer-const": "off",
      "no-extra-boolean-cast": "off",
      "preserve-caught-error": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-fallthrough": "error",
      "no-debugger": "error",
      "no-dupe-keys": "error",
      "no-dupe-class-members": "error",
    },
  },
  // Non-type-aware block: tests + scripts (not in main tsconfig).
  {
    files: ["tests/**/*.ts", "scripts/**/*.ts"],
    extends: [js.configs.recommended],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-useless-assignment": "off",
      "no-useless-escape": "off",
      "no-constant-binary-expression": "off",
      "prefer-const": "off",
      "no-extra-boolean-cast": "off",
      "preserve-caught-error": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-fallthrough": "error",
      "no-debugger": "error",
      "no-dupe-keys": "error",
    },
  },
);