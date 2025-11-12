const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@x402-upl/sdk'],
  env: {
    NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK || 'devnet',
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
    NEXT_PUBLIC_REGISTRY_API_URL: process.env.NEXT_PUBLIC_REGISTRY_API_URL,
  },
};

module.exports = nextConfig;
