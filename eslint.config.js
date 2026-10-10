import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // 缩进交给 Prettier（保存时自动执行），ESLint 不再重复管这一条
      indent: "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      // 全站文案是中文，禁用不适用于本项目风格的空格/标点类规则
      "no-irregular-whitespace": "off",
    },
  },
  {
    // 以下文件由 shadcn/ui CLI 生成、以及构建期配置，逐字沿用上游写法。
    // 关闭与之冲突的规则，避免这些噪声掩盖我们自己的代码错误。
    files: ["src/components/ui/**/*.{ts,tsx}", "src/hooks/use-toast.ts", "tailwind.config.ts"],
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "react-refresh/only-export-components": "off",
    },
  },
);
