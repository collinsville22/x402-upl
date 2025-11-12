'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sidebar = Sidebar;
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const clsx_1 = __importDefault(require("clsx"));
const consumerNavigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Workflows', href: '/dashboard/workflows' },
    { name: 'Escrow', href: '/dashboard/escrow' },
    { name: 'Integrations', href: '/dashboard/integrations' },
    { name: 'Analytics', href: '/dashboard/analytics' },
];
const providerNavigation = [
    { name: 'Provider Dashboard', href: '/dashboard/merchant' },
    { name: 'My Services', href: '/dashboard/services' },
    { name: 'Discover', href: '/dashboard/discover' },
    { name: 'Trending', href: '/dashboard/trending' },
    { name: 'Settlements', href: '/dashboard/settlements' },
    { name: 'Transactions', href: '/dashboard/transactions' },
    { name: 'Settings', href: '/dashboard/settings' },
];
function Sidebar() {
    const pathname = (0, navigation_1.usePathname)();
    return (<div className="flex h-full w-64 flex-col border-r border-[#2A2A2A] bg-[#0A0A0A] text-white">
      <div className="flex h-16 items-center border-b border-[#2A2A2A] px-6">
        <h1 className="text-2xl font-bold">x402</h1>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[#888888]">
            Consumer
          </p>
          <div className="space-y-1">
            {consumerNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (<link_1.default key={item.name} href={item.href} className={(0, clsx_1.default)('flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive
                    ? 'bg-[#00FF88]/10 text-[#00FF88]'
                    : 'text-[#888888] hover:bg-[#1A1A1A] hover:text-white')}>
                  {item.name}
                </link_1.default>);
        })}
          </div>
        </div>

        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[#888888]">
            Service Provider
          </p>
          <div className="space-y-1">
            {providerNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (<link_1.default key={item.name} href={item.href} className={(0, clsx_1.default)('flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive
                    ? 'bg-[#00FF88]/10 text-[#00FF88]'
                    : 'text-[#888888] hover:bg-[#1A1A1A] hover:text-white')}>
                  {item.name}
                </link_1.default>);
        })}
          </div>
        </div>
      </nav>

      <div className="border-t border-[#2A2A2A] p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[#2A2A2A]"/>
          <div className="flex-1 text-sm">
            <div className="font-medium text-white">Agent</div>
            <div className="text-xs text-[#888888]">Connected</div>
          </div>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=Sidebar.js.map