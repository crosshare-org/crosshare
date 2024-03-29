import { PHASE_PRODUCTION_SERVER } from 'next/constants.js';
import { withSentryConfig } from '@sentry/nextjs';

const distDir = 'nextjs';
const baseConfig = {
  reactStrictMode: true,
  distDir: distDir,
  poweredByHeader: false,
  productionBrowserSourceMaps: true,
  i18n: {
    locales: ['en', 'es', 'it', 'fr', 'pseudo'],
    defaultLocale: 'en',
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
  compiler: {
    emotion: true,
  },
  sentry: {
    hideSourceMaps: false,
  },
};

const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin. Keep in mind that
  // the following options are set automatically, and overriding them is not
  // recommended:
  //   release, url, org, project, authToken, configFile, stripPrefix,
  //   urlPrefix, include, ignore

  silent: true, // Suppresses all logs
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options.
};

export default async (phase) => {
  if (phase === PHASE_PRODUCTION_SERVER) {
    return withSentryConfig(baseConfig, sentryWebpackPluginOptions);
  }

  const bundleAnalyzer = await import('@next/bundle-analyzer');

  const withBundleAnalyzer = bundleAnalyzer.default({
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
