const { PHASE_PRODUCTION_SERVER } =
  process.env.NODE_ENV === 'development' ? {} : require('next/constants');

const distDir = 'nextjs';
const baseConfig = {
  distDir: distDir,
  poweredByHeader: false,
  i18n: {
    locales: ['en', 'es', 'pseudo'],
    defaultLocale: 'en',
    domains: [
      {
        domain: 'crosshare.org',
        defaultLocale: 'en',
      },
      {
        domain: 'es.crosshare.org',
        defaultLocale: 'es',
      },
    ]
  }
};

module.exports = (phase) => {
  if (phase === PHASE_PRODUCTION_SERVER) {
    return baseConfig;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  });

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const withSourceMaps = require('@zeit/next-source-maps')({
    devtool: 'hidden-source-map',
  });

  // Use the SentryWebpack plugin to upload the source maps during build step
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const SentryWebpackPlugin = require('@sentry/webpack-plugin');
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
        // https://github.com/vercel/next.js/issues/22813
        config.output.chunkFilename = isServer
          ? `${dev ? '[name]' : '[name].[fullhash]'}.js`
          : `static/chunks/${dev ? '[name]' : '[name].[fullhash]'}.js`;

        // Note: we provide webpack above so you should not `require` it
        // Perform customizations to webpack config
        // Important: return the modified config
        if (!isServer) {
          config.externals = config.externals || [];
          config.externals.push(function ({request}, callback) {
            // Ignore firebase/sentry imports on the client side - we're using a script tag
            if (/^firebase\/.*$/i.test(request)) {
              return callback(null, 'firebase');
            }
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
