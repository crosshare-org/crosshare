/* eslint-env node */

module.exports = {
  env: {
    browser: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:redos/recommended',
    "plugin:css-modules/recommended",
    'next/core-web-vitals',
    'prettier',
  ],
  overrides: [
    {
      extends: ['plugin:@typescript-eslint/disable-type-checked'],
      files: ['./**/*.{js,cjs}'],
    },
  ],
  ignorePatterns: ['next.config.mjs', 'jest.config.mjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: { project: true, tsconfigRootDir: __dirname },
  plugins: ['@emotion', 'lingui', "css-modules"],
  rules: {
    // someday?... "lingui/no-unlocalized-strings": 2,
    'lingui/t-call-in-function': 2,
    'lingui/no-single-variables-to-translate': 2,
    'lingui/no-expression-in-message': 2,
    'lingui/no-single-tag-to-translate': 2,
    'lingui/no-trans-inside-trans': 2,
    '@emotion/pkg-renaming': 'error',
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
  },
};
