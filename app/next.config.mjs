import { PHASE_PRODUCTION_SERVER } from 'next/constants.js';

const distDir = 'nextjs';
const baseConfig = {
  reactStrictMode: true,
  distDir: distDir,
  eslint: {
    dirs: ['components', 'lib', 'pages', 'reducers'], // TODO add "scripts"
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
};

export default async (phase) => {
  if (phase === PHASE_PRODUCTION_SERVER) {
    return baseConfig;
  }

  const bundleAnalyzer = await import('@next/bundle-analyzer');

  const withBundleAnalyzer = bundleAnalyzer.default({
    enabled: process.env.ANALYZE === 'true',
  });

  return withBundleAnalyzer({
    ...baseConfig,
    env: {
      FIREBASE_PROJECT_ID: 'mdcrosshare',
    },
  });
};
