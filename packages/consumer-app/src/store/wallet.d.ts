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
export declare const useWalletStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<WalletState>, "setState" | "persist"> & {
    setState(partial: WalletState | Partial<WalletState> | ((state: WalletState) => WalletState | Partial<WalletState>), replace?: false | undefined): unknown;
    setState(state: WalletState | ((state: WalletState) => WalletState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<WalletState, {
            publicKey: string | undefined;
            role: "consumer" | "both" | "provider";
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: WalletState) => void) => () => void;
        onFinishHydration: (fn: (state: WalletState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<WalletState, {
            publicKey: string | undefined;
            role: "consumer" | "both" | "provider";
        }, unknown>>;
    };
}>;
export {};
//# sourceMappingURL=wallet.d.ts.map