"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AppLayout;
const Sidebar_1 = require("@/components/layout/Sidebar");
function AppLayout({ children }) {
    return (<div className="flex h-screen overflow-hidden bg-x402-black">
      <Sidebar_1.Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-8">{children}</div>
      </main>
    </div>);
}
//# sourceMappingURL=layout.js.map