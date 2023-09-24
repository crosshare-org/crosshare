import { formatter } from '@lingui/format-po-gettext';

const config = {
  locales: ['en', 'es', 'it', 'fr', 'pseudo'],
  sourceLocale: 'en',
  pseudoLocale: 'pseudo',
  fallbackLocales: {
    default: 'en',
  },
  catalogs: [
    {
      path: 'locales/{locale}/messages',
      include: ['pages', 'components', 'lib'],
      exclude: ['**/node_modules/**'],
    },
  ],
  format: formatter(),
  compileNamespace: 'ts',
};

export default config;
