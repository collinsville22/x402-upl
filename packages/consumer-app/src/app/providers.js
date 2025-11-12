'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Providers = Providers;
const react_query_1 = require("@tanstack/react-query");
const react_1 = require("react");
function Providers({ children }) {
    const [queryClient] = (0, react_1.useState)(() => new react_query_1.QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30000,
                refetchOnWindowFocus: false,
            },
        },
    }));
    return <react_query_1.QueryClientProvider client={queryClient}>{children}</react_query_1.QueryClientProvider>;
}
//# sourceMappingURL=providers.js.map