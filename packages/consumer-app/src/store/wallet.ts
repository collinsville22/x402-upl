import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PublicKey } from '@solana/web3.js';

interface WalletState {
  publicKey: PublicKey | null;
  connected: boolean;
  role: 'consumer' | 'provider' | 'both';
  setPublicKey: (publicKey: PublicKey | null) => void;
  setConnected: (connected: boolean) => void;
  setRole: (role: 'consumer' | 'provider' | 'both') => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      publicKey: null,
      connected: false,
      role: 'consumer',
      setPublicKey: (publicKey) => set({ publicKey }),
      setConnected: (connected) => set({ connected }),
      setRole: (role) => set({ role }),
      disconnect: () => set({ publicKey: null, connected: false }),
    }),
    {
      name: 'x402-wallet-storage',
      partialize: (state) => ({
        publicKey: state.publicKey?.toString(),
        role: state.role,
      }),
    }
  )
);
