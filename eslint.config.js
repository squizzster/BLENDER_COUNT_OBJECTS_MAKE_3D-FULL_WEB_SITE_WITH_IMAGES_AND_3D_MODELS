import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "public/**",
      ".tmp.*/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  js.configs.recommended,
  { files: ["src/**/*.js"], languageOptions: { globals: globals.browser } },
  {
    files: ["scripts/**/*.mjs", "*.config.js", "tests/**/*.js"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  { rules: { "no-unused-vars": ["error", { varsIgnorePattern: "^_" }] } },
];
