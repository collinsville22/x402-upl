"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEscrowStore = void 0;
const zustand_1 = require("zustand");
exports.useEscrowStore = (0, zustand_1.create)((set) => ({
    balance: { available: 0, reserved: 0, total: 0 },
    loading: false,
    setBalance: (balance) => set({ balance }),
    setLoading: (loading) => set({ loading }),
}));
//# sourceMappingURL=escrow.js.map