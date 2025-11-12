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
const wallet_1 = require("@/store/wallet");
const consumerNav = [
    { name: 'Dashboard', href: '/' },
    { name: 'Workflows', href: '/workflows' },
    { name: 'Escrow', href: '/escrow' },
    { name: 'Marketplace', href: '/integrations' },
    { name: 'Analytics', href: '/analytics' },
];
const developerNav = [
    { name: 'Testing Sandbox', href: '/developer/sandbox' },
    { name: 'Plugins', href: '/developer/plugins' },
    { name: 'Documentation', href: '/developer/documentation' },
];
const providerNav = [
    { name: 'Provider Dashboard', href: '/provider' },
    { name: 'My Services', href: '/provider/services' },
    { name: 'Settlements', href: '/provider/settlements' },
    { name: 'Transactions', href: '/provider/transactions' },
];
function Sidebar() {
    const pathname = (0, navigation_1.usePathname)();
    const role = (0, wallet_1.useWalletStore)((state) => state.role);
    const publicKey = (0, wallet_1.useWalletStore)((state) => state.publicKey);
    return (<div className="flex h-full w-64 flex-col border-r border-x402-border bg-x402-black">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-x402-border px-6">
        <link_1.default href="/" className="text-2xl font-bold tracking-tighter text-white">
          x402
        </link_1.default>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
        {/* Consumer Section */}
        {(role === 'consumer' || role === 'both') && (<div>
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-x402-text-tertiary">
              Consumer
            </p>
            <div className="space-y-1">
              {consumerNav.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (<link_1.default key={item.name} href={item.href} className={(0, clsx_1.default)('flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive
                        ? 'bg-x402-accent-muted text-x402-accent'
                        : 'text-x402-text-tertiary hover:bg-x402-surface-hover hover:text-x402-text-primary')}>
                    {item.name}
                  </link_1.default>);
            })}
            </div>
          </div>)}

        {/* Provider Section */}
        {(role === 'provider' || role === 'both') && (<div>
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-x402-text-tertiary">
              Service Provider
            </p>
            <div className="space-y-1">
              {providerNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href);
                return (<link_1.default key={item.name} href={item.href} className={(0, clsx_1.default)('flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive
                        ? 'bg-x402-accent-muted text-x402-accent'
                        : 'text-x402-text-tertiary hover:bg-x402-surface-hover hover:text-x402-text-primary')}>
                    {item.name}
                  </link_1.default>);
            })}
            </div>
          </div>)}

        {/* Developer Section */}
        <div>
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-x402-text-tertiary">
            Developer
          </p>
          <div className="space-y-1">
            {developerNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            return (<link_1.default key={item.name} href={item.href} className={(0, clsx_1.default)('flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive
                    ? 'bg-x402-accent-muted text-x402-accent'
                    : 'text-x402-text-tertiary hover:bg-x402-surface-hover hover:text-x402-text-primary')}>
                  {item.name}
                </link_1.default>);
        })}
          </div>
        </div>
      </nav>

      {/* Wallet Info */}
      <div className="border-t border-x402-border p-4">
        <div className="mb-3">
          <p className="mb-2 text-xs font-semibold text-x402-text-tertiary">Role</p>
          <div className="flex gap-2">
            <button onClick={() => wallet_1.useWalletStore.getState().setRole('consumer')} className={(0, clsx_1.default)('flex-1 rounded px-2 py-1 text-xs font-medium transition-colors', role === 'consumer'
            ? 'bg-x402-accent text-black'
            : 'bg-x402-surface text-x402-text-tertiary hover:bg-x402-surface-hover')}>
              Consumer
            </button>
            <button onClick={() => wallet_1.useWalletStore.getState().setRole('provider')} className={(0, clsx_1.default)('flex-1 rounded px-2 py-1 text-xs font-medium transition-colors', role === 'provider'
            ? 'bg-x402-accent text-black'
            : 'bg-x402-surface text-x402-text-tertiary hover:bg-x402-surface-hover')}>
              Provider
            </button>
            <button onClick={() => wallet_1.useWalletStore.getState().setRole('both')} className={(0, clsx_1.default)('flex-1 rounded px-2 py-1 text-xs font-medium transition-colors', role === 'both'
            ? 'bg-x402-accent text-black'
            : 'bg-x402-surface text-x402-text-tertiary hover:bg-x402-surface-hover')}>
              Both
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-x402-accent/10 text-sm font-semibold text-x402-accent">
            {publicKey ? publicKey.toString().slice(0, 2).toUpperCase() : '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">
              {publicKey ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}` : 'Not Connected'}
            </div>
            <div className="text-xs text-x402-text-tertiary capitalize">{role}</div>
          </div>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=Sidebar.js.map