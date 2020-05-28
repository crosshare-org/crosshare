const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  distDir: 'nextjs',
  env: {
    FIREBASE_PROJECT_ID: 'mdcrosshare',
  },
  experimental: {
    sprFlushToDisk: false,
  },
  poweredByHeader: false,
  webpack: (config, {
    buildId,
    dev,
    isServer,
    defaultLoaders,
    webpack
  }) => {
    // Note: we provide webpack above so you should not `require` it
    // Perform customizations to webpack config
    // Important: return the modified config
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push(function(context, request, callback) {
        if (/^firebase\/.*$/i.test(request)) {
          return callback(null, 'firebase');
        }
        // Continue without externalizing the import
        callback();
      });
    }
    return config
  },
});