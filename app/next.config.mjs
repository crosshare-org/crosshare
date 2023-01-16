import { PHASE_PRODUCTION_SERVER } from 'next/constants.js';
import bundleAnalyzer from '@next/bundle-analyzer';
import nextSourceMaps from '@zeit/next-source-maps';
import SentryWebpackPlugin from '@sentry/webpack-plugin';

const distDir = 'nextjs';
const baseConfig = {
  distDir: distDir,
  poweredByHeader: false,
  i18n: {
    locales: ['en', 'es', 'it', 'fr', 'pseudo'],
    defaultLocale: 'en',
  },
  experimental: {
    swcPlugins: [
      ['@lingui/swc-plugin', {
       // the same options as in .swcrc
      }],
    ],
  },
  compiler: {
    emotion: true,
  }
};

export default (phase) => {
  if (phase === PHASE_PRODUCTION_SERVER) {
    return baseConfig;
  }

  const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === 'true',
  });

  const withSourceMaps = nextSourceMaps({
    devtool: 'hidden-source-map',
  });

  const {
    NEXT_PUBLIC_SENTRY_DSN: SENTRY_DSN,
    SENTRY_ORG,
    SENTRY_PROJECT,
    SENTRY_AUTH_TOKEN,
    NODE_ENV,
  } = process.env;

  process.env.SENTRY_DSN = SENTRY_DSN;

  const sentryRelease = Array.from(
    { length: 20 },
    () => Math.random().toString(36)[2]
  ).join('');

  return withSourceMaps(
    withBundleAnalyzer({
      ...baseConfig,
      env: {
        FIREBASE_PROJECT_ID: 'mdcrosshare',
        NEXT_PUBLIC_SENTRY_RELEASE: sentryRelease,
      },
      webpack: (config, { isServer, dev }) => {
        // Note: we provide webpack above so you should not `require` it
        // Perform customizations to webpack config
        // Important: return the modified config
        if (!isServer) {
          config.externals = config.externals || [];
          config.externals.push(function ({ request }, callback) {
            if (/^@sentry\/.*$/i.test(request)) {
              return callback(null, 'Sentry');
            }
            // Continue without externalizing the import
            callback();
          });
        }

        // When all the Sentry configuration env variables are available/configured
        // The Sentry webpack plugin gets pushed to the webpack plugins to build
        // and upload the source maps to sentry.
        // This is an alternative to manually uploading the source maps
        // Note: This is disabled in development mode.
        if (
          SENTRY_DSN &&
          SENTRY_ORG &&
          SENTRY_PROJECT &&
          SENTRY_AUTH_TOKEN &&
          NODE_ENV === 'production' &&
          !process.env.NO_SENTRY
        ) {
          config.plugins.push(
            new SentryWebpackPlugin({
              include: distDir,
              ignore: ['node_modules'],
              urlPrefix: '~/_next',
              release: sentryRelease,
            })
          );
        }

        return config;
      },
    })
  );
};
