import eslint from '@eslint/js';
import stylisticTs from '@stylistic/eslint-plugin-ts'
import tseslint from 'typescript-eslint';

export default tseslint.config({
    files: ['**/*.ts'],
    extends: [
        eslint.configs.recommended,
        tseslint.configs.recommended,
    ],
    languageOptions: {
        parserOptions: {
            parser: '@typescript-eslint/parser',
            project: "./tsconfig.json"
        },
    },
    plugins: {
        '@stylistic/ts': stylisticTs,
        '@typescript-eslint': tseslint.plugin,
    },
    rules: {
        "indent": "off",
        "@stylistic/ts/indent": ["error", 2],
        "@typescript-eslint/await-thenable": 2,
        "@typescript-eslint/ban-ts-comment": 2,
        "@typescript-eslint/explicit-function-return-type": 0,
        "@typescript-eslint/no-explicit-any": 0,
        "@typescript-eslint/no-require-imports": 2,
        "@typescript-eslint/no-unnecessary-type-assertion": 2,
        "@typescript-eslint/promise-function-async": 2,
        "@typescript-eslint/unbound-method": 2
    },
});
