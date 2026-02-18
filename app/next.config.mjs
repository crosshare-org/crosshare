import { PHASE_PRODUCTION_SERVER } from 'next/constants.js';
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

const sentryWebpackPluginOptions = {
  org: 'm-d',
  project: 'crosshare',
  silent: true,
};

export default (phase) => {
  if (phase === PHASE_PRODUCTION_SERVER) {
    return withSentryConfig(baseConfig, sentryWebpackPluginOptions);
  }

  return withSentryConfig(
    {
      ...baseConfig,
      env: {
        FIREBASE_PROJECT_ID: 'mdcrosshare',
      },
    },
    sentryWebpackPluginOptions
  );
};
