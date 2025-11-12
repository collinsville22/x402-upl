/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pino'],
  },
  webpack: (config) => {
    config.externals.push('pino-pretty', 'encoding');
    return config;
  },
};

export default nextConfig;
