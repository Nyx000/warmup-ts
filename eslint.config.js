import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      // cs_script.d.ts marks APIs Valve will remove; catch them at lint time
      "@typescript-eslint/no-deprecated": "error",
      // createGamemode owns these, and cs_script refuses a second registration of each
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='Instance'][property.name=/^(SetThink|SetNextThink|On(?!ScriptInput$).*)$/]",
          message:
            "Only createGamemode may register this Instance callback; cs_script allows one registration, so this one would fail. Use the plugin hook instead (onThink, init, onRoundStart, ...). Instance.OnScriptInput is the exception.",
        },
      ],
    },
  },
  {
    files: ["src/core/**/*.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    ignores: ["node_modules/**", "dist/**", "src/types/cs_script.d.ts"],
  },
];
