// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { flatConfigs as importPluginFlatConfigs } from 'eslint-plugin-import';
import configPrettier from 'eslint-config-prettier/flat';
import redos from 'eslint-plugin-redos';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  {
    ignores: ['import-rewrite-loader.cjs'],
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
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
  {
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.ts', 'eslint.config.js'],
        },
        tsconfigRootDir: '/workspaces/crosshare/functions',
      },
    },
  },
  {
    rules: {
      'linebreak-style': ['error', 'unix'],
      semi: ['error', 'always'],
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
