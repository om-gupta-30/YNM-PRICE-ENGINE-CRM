/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations for free tier
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header
  reactStrictMode: true, // Enable React strict mode for better performance
  
  // Reduce bundle size
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'framer-motion'],
  },
  
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

