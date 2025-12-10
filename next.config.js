/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations for free tier
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header
  reactStrictMode: true, // Enable React strict mode for better performance
  
  // Reduce bundle size and improve performance
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'framer-motion', 'recharts', 'jspdf', 'jspdf-autotable'],
    optimizeCss: true, // Optimize CSS
  },
  
  // Enable SWC minification for faster builds
  swcMinify: true,
  
  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
  },
  
  // Headers for caching and performance
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=10, stale-while-revalidate=59',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
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
    
    // Optimize bundle size
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      },
    };
    
    return config;
  },
}

module.exports = nextConfig

