import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Production optimizations */
  reactStrictMode: true,
  
  // Enable compression
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Production logging
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  
  // Optimized output for production
  output: 'standalone',
  
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Compiler options
  compiler: {
    // Remove console.logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['framer-motion', 'lucide-react'],
  },
};

export default nextConfig;

