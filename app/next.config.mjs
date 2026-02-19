import { withSentryConfig } from '@sentry/nextjs';

const distDir = 'nextjs';
const baseConfig = {
  output: 'standalone',
  reactStrictMode: true,
  distDir: distDir,
  poweredByHeader: false,
  productionBrowserSourceMaps: true,
  i18n: {
    locales: ['en', 'es', 'it', 'fr', 'id', 'pseudo'],
    defaultLocale: 'en',
  },
  turbopack: {
    rules: {
      '*.ts': [
        {
          loaders: ['./import-rewrite-loader.cjs'],
        },
      ],
      '*.tsx': [
        {
          loaders: ['./import-rewrite-loader.cjs'],
        },
      ],
    },
  },
  experimental: {
    swcPlugins: [
      [
        '@lingui/swc-plugin',
        {
          // the same options as in .swcrc
        },
      ],
    ],
  },
};

export default withSentryConfig(baseConfig, {
  org: 'm-d',
  project: 'crosshare',
  // eslint-disable-next-line no-undef
  authToken: process.env.SENTRY_AUTH_TOKEN,
  telemetry: false,
  widenClientFileUpload: true,
});
