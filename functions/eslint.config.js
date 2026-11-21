// Standalone on purpose: the root config builds on eslint-config-expo, whose
// React and React Native rules don't fit Node code. The ADR rules below are
// copied from the root eslint.config.js, so a change to them updates both.
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const eslintComments = require('@eslint-community/eslint-plugin-eslint-comments');
const globals = require('globals');

// No type assertions (ADR 0014): no written predicate where TypeScript infers
// one, and no assertion functions.
const restrictedSyntax = [
  {
    selector:
      "CallExpression[callee.property.name=/^(filter|find)$/] > :matches(ArrowFunctionExpression, FunctionExpression)[returnType.typeAnnotation.type='TSTypePredicate']",
    message:
      'Drop the written type predicate: TypeScript infers it for a function passed straight to .filter or .find (ADR 0014).',
  },
  {
    selector: 'TSTypePredicate[asserts=true]',
    message:
      'Assertion functions are banned (ADR 0014). Use a named `x is T` predicate that checks everything it claims.',
  },
];

module.exports = defineConfig([
  eslintPluginPrettierRecommended,
  {
    ignores: ['lib/**', 'node_modules/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    plugins: { 'eslint-comments': eslintComments },
    rules: {
      'eslint-comments/require-description': ['error', { ignore: [] }],
      'eslint-comments/no-restricted-disable': [
        'error',
        '@typescript-eslint/consistent-type-assertions',
      ],
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-restricted-syntax': ['error', ...restrictedSyntax],
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-empty-interface': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': true,
        },
      ],

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          prev: '*',
          next: 'return',
        },
        {
          blankLine: 'always',
          prev: ['const', 'let', 'var'],
          next: '*',
        },
        {
          blankLine: 'any',
          prev: ['const', 'let', 'var'],
          next: ['const', 'let', 'var'],
        },
        {
          blankLine: 'always',
          prev: '*',
          next: ['if', 'for', 'while', 'switch', 'try'],
        },
        {
          blankLine: 'always',
          prev: ['if', 'for', 'while', 'switch', 'try'],
          next: '*',
        },
      ],
    },
  },
  {
    files: ['**/__tests__/**'],
    rules: {
      // A test fails loudly on a missing value, which is the check `!` skips.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
]);
