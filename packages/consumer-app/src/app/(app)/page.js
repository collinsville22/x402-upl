'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardPage;
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
const wallet_1 = require("@/store/wallet");
const escrow_1 = require("@/store/escrow");
const react_1 = require("react");
const api_1 = require("@/lib/api");
function DashboardPage() {
    const router = (0, navigation_1.useRouter)();
    const wallet = (0, wallet_1.useWalletStore)((state) => state.publicKey);
    const balance = (0, escrow_1.useEscrowStore)((state) => state.balance);
    const setBalance = (0, escrow_1.useEscrowStore)((state) => state.setBalance);
    (0, react_1.useEffect)(() => {
        async function fetchBalance() {
            if (!wallet)
                return;
            try {
                const data = await api_1.reasoningAPI.getEscrowBalance(wallet.toString());
                if (data.success) {
                    setBalance(data.balance);
                }
            }
            catch (err) {
                console.error('Failed to fetch escrow balance:', err);
            }
        }
        fetchBalance();
        const interval = setInterval(fetchBalance, 30000);
        return () => clearInterval(interval);
    }, [wallet, setBalance]);
    return (<div className="space-y-8">
      {/* Header */}
      <div className="border-b border-x402-border pb-6">
        <h1 className="text-4xl font-bold tracking-tighter text-white">
          Welcome to X402
        </h1>
        <p className="mt-2 text-lg text-x402-text-secondary">
          Create AI-powered workflows in natural language
        </p>
      </div>

      {/* Hero CTA */}
      <Card_1.Card variant="accent" className="p-8">
        <h2 className="text-2xl font-bold text-white">
          Create Your First Workflow
        </h2>
        <p className="mt-2 text-x402-text-secondary">
          Describe what you want to accomplish, and X402's AI will orchestrate the
          services needed to complete your task.
        </p>
        <Button_1.Button variant="primary" size="lg" onClick={() => router.push('/workflows/new')} className="mt-6">
          Create Workflow
        </Button_1.Button>
      </Card_1.Card>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card_1.Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Escrow Balance</h3>
          <p className="mt-2 text-3xl font-bold text-white">
            {balance.available.toFixed(4)}{' '}
            <span className="text-lg text-x402-text-tertiary">SOL</span>
          </p>
          <link_1.default href="/escrow" className="mt-4 inline-block text-sm text-x402-accent hover:underline">
            Manage Escrow →
          </link_1.default>
        </Card_1.Card>

        <Card_1.Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Active Workflows</h3>
          <p className="mt-2 text-3xl font-bold text-white">0</p>
          <link_1.default href="/workflows" className="mt-4 inline-block text-sm text-x402-accent hover:underline">
            View All Workflows →
          </link_1.default>
        </Card_1.Card>

        <Card_1.Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Integrations</h3>
          <p className="mt-2 text-3xl font-bold text-white">9</p>
          <link_1.default href="/integrations" className="mt-4 inline-block text-x402-accent hover:underline">
            Explore Integrations →
          </link_1.default>
        </Card_1.Card>
      </div>

      {/* How It Works */}
      <Card_1.Card className="p-6">
        <h2 className="text-xl font-semibold text-white">How It Works</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-x402-accent/10 text-2xl font-bold text-x402-accent">
              1
            </div>
            <h3 className="mt-4 font-semibold text-white">Describe Your Task</h3>
            <p className="mt-2 text-sm text-x402-text-tertiary">
              Use natural language to tell X402 what you want to accomplish
            </p>
          </div>

          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-x402-accent/10 text-2xl font-bold text-x402-accent">
              2
            </div>
            <h3 className="mt-4 font-semibold text-white">AI Plans Execution</h3>
            <p className="mt-2 text-sm text-x402-text-tertiary">
              The reasoning engine creates an optimal execution plan using available services
            </p>
          </div>

          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-x402-accent/10 text-2xl font-bold text-x402-accent">
              3
            </div>
            <h3 className="mt-4 font-semibold text-white">Autonomous Execution</h3>
            <p className="mt-2 text-sm text-x402-text-tertiary">
              X402 orchestrates services and handles payments automatically
            </p>
          </div>
        </div>
      </Card_1.Card>
    </div>);
}
//# sourceMappingURL=page.js.map