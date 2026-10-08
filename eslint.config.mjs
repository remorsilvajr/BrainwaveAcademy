import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // No em dash in anything a user can see (strings, template text, JSX text).
  // Comments are fine. See the Conventions note in CLAUDE.md.
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "Literal[value=/—/]", message: "No em dash in user-visible text: use a comma, a period, or a plain hyphen." },
        { selector: "TemplateElement[value.raw=/—/]", message: "No em dash in user-visible text: use a comma, a period, or a plain hyphen." },
        { selector: "JSXText[value=/—/]", message: "No em dash in user-visible text: use a comma, a period, or a plain hyphen." },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
