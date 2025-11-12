/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@x402-upl/sdk'],
  experimental: {
    optimizePackageImports: ['recharts', 'framer-motion'],
  },
}

module.exports = nextConfig
