"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWalletStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
exports.useWalletStore = (0, zustand_1.create)()((0, middleware_1.persist)((set) => ({
    publicKey: null,
    connected: false,
    role: 'consumer',
    setPublicKey: (publicKey) => set({ publicKey }),
    setConnected: (connected) => set({ connected }),
    setRole: (role) => set({ role }),
    disconnect: () => set({ publicKey: null, connected: false }),
}), {
    name: 'x402-wallet-storage',
    partialize: (state) => ({
        publicKey: state.publicKey?.toString(),
        role: state.role,
    }),
}));
//# sourceMappingURL=wallet.js.map