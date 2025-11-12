'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProviderDashboard;
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const wallet_1 = require("@/store/wallet");
const api_1 = require("@/lib/api");
function ProviderDashboard() {
    const wallet = (0, wallet_1.useWalletStore)((state) => state.publicKey);
    const [stats, setStats] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        async function fetchStats() {
            if (!wallet) {
                setLoading(false);
                return;
            }
            try {
                const data = await api_1.facilitatorAPI.getMerchantStats(wallet.toString());
                setStats(data);
            }
            catch (err) {
                console.error('Failed to fetch merchant stats:', err);
            }
            finally {
                setLoading(false);
            }
        }
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [wallet]);
    return (<div className="space-y-6">
      <div className="flex items-center justify-between border-b border-x402-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Provider Dashboard</h1>
          <p className="mt-1 text-x402-text-secondary">
            Manage your services and track revenue
          </p>
        </div>
        <link_1.default href="/provider/services/new">
          <Button_1.Button variant="primary">Register New Service</Button_1.Button>
        </link_1.default>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card_1.Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Total Revenue</h3>
          <p className="mt-2 text-3xl font-bold text-white">
            ${stats?.totalRevenue?.toFixed(2) || '0.00'}
          </p>
        </Card_1.Card>
        <Card_1.Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">API Calls</h3>
          <p className="mt-2 text-3xl font-bold text-white">{stats?.totalCalls || 0}</p>
        </Card_1.Card>
        <Card_1.Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Success Rate</h3>
          <p className="mt-2 text-3xl font-bold text-green-400">
            {stats?.successRate?.toFixed(1) || '0'}%
          </p>
        </Card_1.Card>
        <Card_1.Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Active Services</h3>
          <p className="mt-2 text-3xl font-bold text-white">{stats?.activeServices || 0}</p>
        </Card_1.Card>
      </div>

      <Card_1.Card className="p-6">
        <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <link_1.default href="/provider/services">
            <Card_1.Card variant="hover" className="p-4">
              <h3 className="font-medium text-white">Manage Services</h3>
              <p className="mt-1 text-sm text-x402-text-tertiary">
                View and edit your registered services
              </p>
            </Card_1.Card>
          </link_1.default>
          <link_1.default href="/provider/settlements">
            <Card_1.Card variant="hover" className="p-4">
              <h3 className="font-medium text-white">Settlements</h3>
              <p className="mt-1 text-sm text-x402-text-tertiary">
                Withdraw your earnings
              </p>
            </Card_1.Card>
          </link_1.default>
        </div>
      </Card_1.Card>
    </div>);
}
//# sourceMappingURL=page.js.map