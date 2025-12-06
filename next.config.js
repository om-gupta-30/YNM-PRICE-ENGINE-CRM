/** @type {import('next').NextConfig} */
const nextConfig = {
  // instrumentationHook is no longer needed in Next.js 16 - instrumentation.ts is available by default
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Turbopack configuration (Next.js 16 default)
  turbopack: {
    // Make ioredis optional - won't fail build if not installed
  },
  // Webpack fallback for compatibility (only used if --webpack flag is used)
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'ioredis': 'commonjs ioredis',
      });
    }
    return config;
  },
}

module.exports = nextConfig

