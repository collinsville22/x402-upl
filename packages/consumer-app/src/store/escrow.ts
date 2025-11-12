import { create } from 'zustand';

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

export const useEscrowStore = create<EscrowState>((set) => ({
  balance: { available: 0, reserved: 0, total: 0 },
  loading: false,
  setBalance: (balance) => set({ balance }),
  setLoading: (loading) => set({ loading }),
}));
