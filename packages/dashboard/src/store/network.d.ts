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
export declare const useNetworkStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<NetworkState>, "setState" | "persist"> & {
    setState(partial: NetworkState | Partial<NetworkState> | ((state: NetworkState) => NetworkState | Partial<NetworkState>), replace?: false | undefined): unknown;
    setState(state: NetworkState | ((state: NetworkState) => NetworkState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<NetworkState, NetworkState, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: NetworkState) => void) => () => void;
        onFinishHydration: (fn: (state: NetworkState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<NetworkState, NetworkState, unknown>>;
    };
}>;
export {};
//# sourceMappingURL=network.d.ts.map