const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const angularPlugin = require('@angular-eslint/eslint-plugin');
const templateParser = require('@angular-eslint/template-parser');
const templatePlugin = require('@angular-eslint/eslint-plugin-template');

module.exports = [
  { ignores: ['www/**', 'android/**', 'node_modules/**', 'dist/**', 'coverage/**'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser: tsParser, parserOptions: { sourceType: 'module' } },
    plugins: { '@typescript-eslint': tsPlugin, '@angular-eslint': angularPlugin, '@angular-eslint/template': templatePlugin },
    processor: templatePlugin.processors['extract-inline-html'],
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...angularPlugin.configs.recommended.rules,
    },
  },
  {
    files: ['src/**/*.html'],
    languageOptions: { parser: templateParser },
    plugins: { '@angular-eslint/template': templatePlugin },
    rules: { ...templatePlugin.configs.recommended.rules },
  },
];
