interface EscrowBalance {
    available: number;
    reserved: number;
    total: number;
}
interface EscrowState {
    balance: EscrowBalance;
    loading: boolean;
    setBalance: (balance: EscrowBalance) => void;
    setLoading: (loading: boolean) => void;
}
export declare const useEscrowStore: import("zustand").UseBoundStore<import("zustand").StoreApi<EscrowState>>;
export {};
//# sourceMappingURL=escrow.d.ts.map