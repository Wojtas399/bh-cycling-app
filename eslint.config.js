// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

// Each restricted path is listed once here, because a later config block that
// sets 'no-restricted-imports' replaces the whole list rather than merging it.
const sonnerPath = {
  name: 'sonner-native',
  message: "Import from '@/lib/toast' instead (ADR 0004).",
};
const rhfBindingPath = {
  name: 'react-hook-form',
  importNames: ['Controller', 'useController'],
  message: 'Bind fields through a hooks/useForm<Kind>Field.ts hook (ADR 0006).',
};
const formFieldPaths = [
  '@/components/FormField',
  '@/components/Input',
  '@/components/PasswordInput',
].map(name => ({
  name,
  message:
    'Screens build forms with FormTextField (ADR 0006). A live, non-form input may disable this inline with a reason.',
}));

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
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

      // React
      'react/self-closing-comp': 'warn',
      'react/jsx-no-useless-fragment': ['warn', { allowExpressions: true }],
      'react/no-array-index-key': 'warn',
      'react/no-string-refs': 'warn',
      'react/jsx-curly-brace-presence': [
        'warn',
        { props: 'never', children: 'never', propElementValues: 'always' },
      ],
      // New in eslint-config-expo 57. The connection-driven data hooks reset
      // their state from an effect when the Intervals connection changes;
      // reworking them is follow-up work, so this warns rather than fails.
      'react-hooks/set-state-in-effect': 'warn',

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

      // Library wrappers (ADR 0004): only the wrapper module may import the library.
      // Form fields (ADR 0006): only the binding hooks may use useController.
      'no-restricted-imports': [
        'error',
        { paths: [sonnerPath, rhfBindingPath] },
      ],

      // Forms (ADR 0006): watch() is incompatible with the React Compiler.
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='watch']",
          message:
            'Use useWatch or useFormState instead of watch() (ADR 0006).',
        },
        {
          selector:
            "VariableDeclarator[init.callee.name='useForm'] > ObjectPattern > Property[key.name='watch']",
          message:
            'Use useWatch or useFormState instead of watch() (ADR 0006).',
        },
      ],
    },
  },
  {
    files: ['app/**'],
    ignores: [
      'app/(auth)/sign-in/index.tsx', // TODO: remove when migrated (ADR 0006)
      'app/(auth)/sign-up/index.tsx', // TODO: remove when migrated (ADR 0006)
      'app/(auth)/forgot-password/index.tsx', // TODO: remove when migrated (ADR 0006)
      'app/(app)/delete-account/index.tsx', // TODO: remove when migrated (ADR 0006)
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [sonnerPath, rhfBindingPath, ...formFieldPaths] },
      ],
    },
  },
  {
    files: ['hooks/useForm*Field.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: [sonnerPath] }],
    },
  },
  {
    files: ['lib/toast/**'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
]);
