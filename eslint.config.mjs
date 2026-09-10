import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsconfigPath = `${__dirname}/tsconfig.json`;

/** @type {import("eslint").Linter.Config} */
const config = [
  {
    ignores: ["**/.next/**", "**/out/**", "**/node_modules/**", "**/.git/**"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: await import("@typescript-eslint/parser").then((m) => m.default || m),
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        project: tsconfigPath,
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      "@typescript-eslint": await import("@typescript-eslint/eslint-plugin").then((m) => m.default || m),
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
];

export default config;
