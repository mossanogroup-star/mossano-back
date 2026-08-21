import js from "@eslint/js";
import globals from "globals";

/** Flat config — Node.js / ESM backend. */
export default [
  {
    ignores: ["node_modules/**", "uploads/**", "dist/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Warn rather than error: an unused import is worth surfacing but should
      // not fail `npm run validate` mid-refactor.
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Every catch here is deliberate — a failed storage delete, a browser
      // that blocks localStorage — and the binding is genuinely unused.
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
];
