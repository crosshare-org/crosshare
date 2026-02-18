// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import lingui from 'eslint-plugin-lingui';
import { flatConfigs as importPluginFlatConfigs } from 'eslint-plugin-import';
import { FlatCompat } from '@eslint/eslintrc';
import configPrettier from 'eslint-config-prettier/flat';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import redos from 'eslint-plugin-redos';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig } from 'eslint/config';

const compat = new FlatCompat({
  baseDirectory: '/workspaces/crosshare/app',
});

export default defineConfig(
  {
    ignores: ['import-rewrite-loader.cjs'],
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  ...(react.configs.flat.recommended ? [react.configs.flat.recommended] : []),
  ...(react.configs.flat['jsx-runtime']
    ? [react.configs.flat['jsx-runtime']]
    : []),
  reactHooks.configs.flat.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
  {
    plugins: {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      redos,
    },
    rules: {
      'redos/no-vulnerable': ['error', { cache: true }],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      importPluginFlatConfigs.recommended,
      importPluginFlatConfigs.typescript,
    ],
    rules: {
      'import/order': [
        'error',
        {
          'newlines-between': 'never',
          alphabetize: { order: 'asc' },
          warnOnUnassignedImports: true,
        },
      ],
      'import/no-anonymous-default-export': 'warn',
    },
  },
  lingui.configs['flat/recommended'],
  ...compat.config({
    plugins: ['css-modules'],
    extends: ['plugin:css-modules/recommended'],
  }),
  {
    // Disabled these after upgrading eslint-plugin-react-hooks, they can be enabled in the future
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/set-state-in-render': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  jsxA11y.flatConfigs.recommended,
  {
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
      react: {
        version: 'detect',
      },
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: '/workspaces/crosshare/app',
      },
    },
  },
  {
    rules: {
      // someday?... "lingui/no-unlocalized-strings": 2,
      'lingui/t-call-in-function': 2,
      'lingui/no-single-variables-to-translate': 2,
      'lingui/no-expression-in-message': 2,
      'lingui/no-single-tag-to-translate': 2,
      'lingui/no-trans-inside-trans': 2,
      'jsx-a11y/anchor-is-valid': [
        'error',
        {
          components: ['Link'],
        },
      ],
      'jsx-a11y/label-has-associated-control': [
        'error',
        { controlComponents: ['LengthLimitedTextarea'] },
      ],
      'jsx-a11y/anchor-has-content': [
        'error',
        {
          components: ['Link'],
        },
      ],
      'linebreak-style': ['error', 'unix'],
      semi: ['error', 'always'],
      'react/no-unused-prop-types': 2,
      'react/react-in-jsx-scope': 'off',
      'jsx-a11y/alt-text': [
        'warn',
        {
          elements: ['img'],
          img: ['Image'],
        },
      ],
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/aria-proptypes': 'warn',
      'jsx-a11y/aria-unsupported-elements': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/role-supports-aria-props': 'warn',
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowNullableBoolean: true,
          allowNullableNumber: true,
          allowNullableString: true,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
        },
      ],
      // TODO might be nice to disallow number/string combos but there are way too many places it's used currently
      '@typescript-eslint/restrict-plus-operands': [
        'error',
        {
          allowNumberAndString: true,
        },
      ],
      // TODO get this turned on, it's just a lot to update all at once.
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      'sort-imports': [
        'error',
        {
          ignoreDeclarationSort: true,
        },
      ],
    },
  },
  configPrettier
);
