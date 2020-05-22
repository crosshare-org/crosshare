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
});