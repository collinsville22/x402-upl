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
export declare const useWalletStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<WalletState>, "setState" | "persist"> & {
    setState(partial: WalletState | Partial<WalletState> | ((state: WalletState) => WalletState | Partial<WalletState>), replace?: false | undefined): unknown;
    setState(state: WalletState | ((state: WalletState) => WalletState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<WalletState, WalletState, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: WalletState) => void) => () => void;
        onFinishHydration: (fn: (state: WalletState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<WalletState, WalletState, unknown>>;
    };
}>;
export {};
//# sourceMappingURL=wallet.d.ts.map