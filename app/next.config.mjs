import { PHASE_PRODUCTION_SERVER } from 'next/constants.js';
import { withSentryConfig } from '@sentry/nextjs';

const distDir = 'nextjs';
const baseConfig = {
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

  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/tree-shaking/
  webpack: (config, { webpack }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    config.plugins.push(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      new webpack.DefinePlugin({
        __SENTRY_DEBUG__: false,
        __SENTRY_TRACING__: false,
        __RRWEB_EXCLUDE_IFRAME__: true,
        __RRWEB_EXCLUDE_SHADOW_DOM__: true,
        __SENTRY_EXCLUDE_REPLAY_WORKER__: true,
      })
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return config;
  },
};

const sentryWebpackPluginOptions = {
  org: 'm-d',
  project: 'crosshare',
  silent: true,
  disableLogger: true,
};

export default async (phase) => {
  if (phase === PHASE_PRODUCTION_SERVER) {
    return withSentryConfig(baseConfig, sentryWebpackPluginOptions);
  }

  const bundleAnalyzer = await import('@next/bundle-analyzer');

  const withBundleAnalyzer = bundleAnalyzer.default({
    // eslint-disable-next-line no-undef
    enabled: process.env.ANALYZE === 'true',
  });

  return withBundleAnalyzer(
    withSentryConfig(
      {
        ...baseConfig,
        env: {
          FIREBASE_PROJECT_ID: 'mdcrosshare',
        },
      },
      sentryWebpackPluginOptions
    )
  );
};
