'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardLayout;
const Sidebar_1 = require("@/components/Sidebar");
const react_query_1 = require("@tanstack/react-query");
const react_1 = require("react");
function DashboardLayout({ children, }) {
    const [queryClient] = (0, react_1.useState)(() => new react_query_1.QueryClient());
    return (<react_query_1.QueryClientProvider client={queryClient}>
      <div className="flex h-screen overflow-hidden bg-[#0A0A0A]">
        <Sidebar_1.Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#0A0A0A]">
          <div className="mx-auto max-w-7xl p-6">{children}</div>
        </main>
      </div>
    </react_query_1.QueryClientProvider>);
}
//# sourceMappingURL=layout.js.map