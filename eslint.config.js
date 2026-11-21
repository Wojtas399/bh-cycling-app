// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const eslintComments = require('@eslint-community/eslint-plugin-eslint-comments');
const { EXCLUDED_GENERATED_PATHS } = require('./scripts/check-no-comments');

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

const noEffectsMessage =
  'useEffect and useLayoutEffect are banned, with no exceptions (ADR 0012). Derive during render, act in the event handler, or see "Do this instead of an effect" in CODING_STANDARDS.md.';

// The restricted selectors are listed once here too, for the same reason. The
// lib/typed.ts override below drops only the assertion-function ban.
// Forms (ADR 0006): watch() is incompatible with the React Compiler.
// No effects (ADR 0012): scripts/check-no-effects.sh, chained into
// `npm run lint`, also fails on these when a disable comment hides them.
// No type assertions (ADR 0014): no written predicate where TypeScript infers
// one, and no assertion functions.
const restrictedSyntax = [
  {
    selector: 'CallExpression[callee.name=/^use(Layout)?Effect$/]',
    message: noEffectsMessage,
  },
  {
    selector:
      "CallExpression[callee.object.name='React'][callee.property.name=/^use(Layout)?Effect$/]",
    message: noEffectsMessage,
  },
  {
    selector: "CallExpression[callee.property.name='watch']",
    message: 'Use useWatch or useFormState instead of watch() (ADR 0006).',
  },
  {
    selector:
      "VariableDeclarator[init.callee.name=/^use(App)?Form$/] > ObjectPattern > Property[key.name='watch']",
    message: 'Use useWatch or useFormState instead of watch() (ADR 0006).',
  },
  {
    selector:
      "CallExpression[callee.property.name=/^(filter|find)$/] > :matches(ArrowFunctionExpression, FunctionExpression)[returnType.typeAnnotation.type='TSTypePredicate']",
    message:
      'Drop the written type predicate: TypeScript infers it for a function passed straight to .filter or .find (ADR 0014).',
  },
  {
    selector:
      "CallExpression[callee.property.name='catch'] > ArrowFunctionExpression[params.length=0][body.type='BlockStatement'][body.body.length=0]",
    message:
      "Use ignoreFailure(() => work()) from '@/lib/ignoreFailure' instead of .catch(() => {}). To start a mutation whose error shows on mutation.error, call mutate.",
  },
];
const assertsFunctionSyntax = {
  selector: 'TSTypePredicate[asserts=true]',
  message:
    'Assertion functions are banned outside lib/typed.ts (ADR 0014). Use a named `x is T` predicate that checks everything it claims.',
};

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: [...EXCLUDED_GENERATED_PATHS, '.claude/**', 'functions/**'],
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
      'no-restricted-syntax': [
        'error',
        ...restrictedSyntax,
        assertsFunctionSyntax,
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // No type assertions (ADR 0014). scripts/check-no-comments.js, chained
      // into `npm run lint`, fails on any directive that disables this rule.
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
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

      // React
      'react/self-closing-comp': 'warn',
      'react/jsx-no-useless-fragment': ['warn', { allowExpressions: true }],
      'react/no-array-index-key': 'warn',
      'react/no-string-refs': 'warn',
      'react/jsx-curly-brace-presence': [
        'warn',
        { props: 'never', children: 'never', propElementValues: 'always' },
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

      // Library wrappers (ADR 0004): only the wrapper module may import the library.
      // Form fields (ADR 0006): only the binding hooks may use useController.
      'no-restricted-imports': [
        'error',
        { paths: [sonnerPath, rhfBindingPath] },
      ],
    },
  },
  {
    files: ['app/**'],
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
    // The only modules allowed to assert (ADR 0014). A new entry needs an ADR.
    files: ['lib/typed.ts', 'test-utils/**'],
    rules: {
      '@typescript-eslint/consistent-type-assertions': 'off',
    },
  },
  {
    files: ['lib/typed.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...restrictedSyntax],
    },
  },
  {
    files: ['lib/toast/**'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // e2e code isn't React: a fixture's `use` callback isn't a hook.
    files: ['**/__tests__/**'],
    rules: {
      // A test fails loudly on a missing value, which is the check `!` skips.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: { globals: { __dirname: 'readonly' } },
  },
  {
    files: ['e2e/**'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
]);
