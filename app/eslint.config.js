// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import pluginLingui from 'eslint-plugin-lingui';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { flatConfigs as importPluginFlatConfigs } from 'eslint-plugin-import';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      importPluginFlatConfigs.recommended,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
  pluginLingui.configs['flat/recommended'],
  ...compat.config({
    plugins: ['css-modules', 'react', 'react-hooks', 'redos'],
    extends: [
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
      'plugin:css-modules/recommended',
      'plugin:redos/recommended',
      'plugin:@next/next/recommended',
      'prettier',
    ],
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
        tsconfigRootDir: import.meta.dirname,
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
  }
);
