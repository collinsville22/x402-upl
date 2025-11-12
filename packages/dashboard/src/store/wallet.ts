import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Keypair } from '@solana/web3.js';

interface WalletState {
  privateKey: string | null;
  publicKey: string | null;
  agentId: string | null;
  did: string | null;
  setWallet: (privateKey: string, publicKey: string) => void;
  setAgentId: (agentId: string) => void;
  setDid: (did: string) => void;
  clearWallet: () => void;
  getKeypair: () => Keypair | null;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      privateKey: null,
      publicKey: null,
      agentId: null,
      did: null,

      setWallet: (privateKey: string, publicKey: string) => {
        set({ privateKey, publicKey });
      },

      setAgentId: (agentId: string) => {
        set({ agentId });
      },

      setDid: (did: string) => {
        set({ did });
      },

      clearWallet: () => {
        set({
          privateKey: null,
          publicKey: null,
          agentId: null,
          did: null,
        });
      },

      getKeypair: () => {
        const { privateKey } = get();
        if (!privateKey) return null;

        try {
          const secretKey = Uint8Array.from(JSON.parse(privateKey));
          return Keypair.fromSecretKey(secretKey);
        } catch {
          return null;
        }
      },
    }),
    {
      name: 'x402-wallet-storage',
    }
  )
);
