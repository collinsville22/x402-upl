"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const google_1 = require("next/font/google");
require("./globals.css");
const providers_1 = require("./providers");
const inter = (0, google_1.Inter)({ subsets: ['latin'], variable: '--font-inter' });
exports.metadata = {
    title: 'X402 - Universal Payment Layer for Autonomous Agents',
    description: 'Build anything with AI agents using natural language',
};
function RootLayout({ children, }) {
    return (<html lang="en" className={inter.variable}>
      <body>
        <providers_1.Providers>{children}</providers_1.Providers>
      </body>
    </html>);
}
//# sourceMappingURL=layout.js.map