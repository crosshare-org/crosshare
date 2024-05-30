import { PHASE_PRODUCTION_SERVER } from 'next/constants.js';
import { withSentryConfig } from '@sentry/nextjs';

const distDir = 'nextjs';
const baseConfig = {
  reactStrictMode: true,
  distDir: distDir,
  eslint: {
    dirs: ['components', 'lib', 'pages', 'reducers', 'scripts'],
  },
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
  sentry: {
    hideSourceMaps: false,
  },

  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/tree-shaking/
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.DefinePlugin({
        __SENTRY_DEBUG__: false,
        __SENTRY_TRACING__: false,
        __RRWEB_EXCLUDE_IFRAME__: true,
        __RRWEB_EXCLUDE_SHADOW_DOM__: true,
        __SENTRY_EXCLUDE_REPLAY_WORKER__: true,
      })
    );

    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };

    // return the modified config
    return config;
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
