import { PHASE_PRODUCTION_SERVER } from 'next/constants.js';
import bundleAnalyzer from '@next/bundle-analyzer';

const distDir = 'nextjs';
const baseConfig = {
  reactStrictMode: true,
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

  return (
    withBundleAnalyzer({
      ...baseConfig,
      env: {
        FIREBASE_PROJECT_ID: 'mdcrosshare',
      },
    })
  );
};
