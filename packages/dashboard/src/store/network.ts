import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NetworkState {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  rpcUrl: string | null;
  registryApiUrl: string | null;
  setNetwork: (network: 'mainnet-beta' | 'devnet' | 'testnet') => void;
  setRpcUrl: (url: string) => void;
  setRegistryApiUrl: (url: string) => void;
  getDefaultRpcUrl: () => string;
  getDefaultRegistryApiUrl: () => string;
}

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set, get) => ({
      network: 'devnet',
      rpcUrl: null,
      registryApiUrl: null,

      setNetwork: (network: 'mainnet-beta' | 'devnet' | 'testnet') => {
        set({ network });
      },

      setRpcUrl: (url: string) => {
        set({ rpcUrl: url });
      },

      setRegistryApiUrl: (url: string) => {
        set({ registryApiUrl: url });
      },

      getDefaultRpcUrl: () => {
        const { network, rpcUrl } = get();
        if (rpcUrl) return rpcUrl;

        return network === 'mainnet-beta'
          ? 'https://api.mainnet-beta.solana.com'
          : 'https://api.devnet.solana.com';
      },

      getDefaultRegistryApiUrl: () => {
        const { network, registryApiUrl } = get();
        if (registryApiUrl) return registryApiUrl;

        return network === 'mainnet-beta'
          ? 'https://api.x402-upl.network'
          : 'https://api-dev.x402-upl.network';
      },
    }),
    {
      name: 'x402-network-storage',
    }
  )
);
