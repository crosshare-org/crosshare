// eslint-disable-next-line @typescript-eslint/no-var-requires
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const withSourceMaps = require('@zeit/next-source-maps')({
  devtool: 'hidden-source-map'
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

const distDir = 'nextjs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nextBuildId = require('next-build-id');
let latestGitHash;
try {
  // Try getting hash from git - this should work locally when we build
  latestGitHash = nextBuildId.sync({
    dir: __dirname
  });
} catch {
  // If that fails then we deployed, get it from the pregenerated file
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  latestGitHash = fs.readFileSync(distDir + '/BUILD_ID').toString();
}
console.log('Loading config for release: ' + latestGitHash);

module.exports = withSourceMaps(withBundleAnalyzer({
  distDir: distDir,
  env: {
    FIREBASE_PROJECT_ID: 'mdcrosshare',
    NEXT_PUBLIC_SENTRY_RELEASE: latestGitHash,
  },
  experimental: {
    sprFlushToDisk: false,
  },
  generateBuildId: async () => {
    return latestGitHash;
  },
  poweredByHeader: false,
  webpack: (config, {
    isServer,
  }) => {
    // Note: we provide webpack above so you should not `require` it
    // Perform customizations to webpack config
    // Important: return the modified config
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push(function(context, request, callback) {
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
      NODE_ENV === 'production'
    ) {
      config.plugins.push(
        new SentryWebpackPlugin({
          include: distDir,
          ignore: ['node_modules'],
          urlPrefix: '~/_next',
          release: latestGitHash,
        })
      );
    }

    return config;
  },
}));