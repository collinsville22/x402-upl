"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
require("./globals.css");
const sonner_1 = require("sonner");
exports.metadata = {
    title: 'x402 Dashboard',
    description: 'Merchant dashboard for x402 Universal Payment Layer',
};
function RootLayout({ children, }) {
    return (<html lang="en">
      <body className="antialiased">
        {children}
        <sonner_1.Toaster position="top-right" richColors/>
      </body>
    </html>);
}
//# sourceMappingURL=layout.js.map