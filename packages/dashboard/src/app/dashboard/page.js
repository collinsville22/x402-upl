'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardPage;
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const wallet_1 = require("@/store/wallet");
const react_1 = require("react");
function DashboardPage() {
    const router = (0, navigation_1.useRouter)();
    const wallet = (0, wallet_1.useWalletStore)((state) => state.publicKey);
    const [escrowBalance, setEscrowBalance] = (0, react_1.useState)({ available: 0, reserved: 0, total: 0 });
    (0, react_1.useEffect)(() => {
        async function fetchBalance() {
            if (!wallet)
                return;
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_REASONING_URL || 'http://localhost:5000'}/escrow/${wallet.toString()}/balance`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setEscrowBalance(data.balance);
                    }
                }
            }
            catch (err) {
                console.error('Failed to fetch escrow balance:', err);
            }
        }
        fetchBalance();
    }, [wallet]);
    return (<div className="space-y-8">
      <div className="border-b border-[#2A2A2A] pb-6">
        <h1 className="text-4xl font-bold text-white">Welcome to X402</h1>
        <p className="mt-2 text-lg text-[#CCCCCC]">
          Create AI-powered workflows in natural language
        </p>
      </div>

      <div className="rounded-lg border border-[#00FF88]/20 bg-[#00FF88]/5 p-8">
        <h2 className="text-2xl font-bold text-white">Create Your First Workflow</h2>
        <p className="mt-2 text-[#CCCCCC]">
          Describe what you want to accomplish, and X402's AI will orchestrate the services needed to complete your task.
        </p>
        <button onClick={() => router.push('/dashboard/workflows/new')} className="mt-6 rounded-lg bg-[#00FF88] px-8 py-3 font-semibold text-[#0A0A0A] transition-all hover:bg-[#00DD77]">
          Create Workflow
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
          <h3 className="text-sm font-medium text-[#888888]">Escrow Balance</h3>
          <p className="mt-2 text-3xl font-bold text-white">
            {escrowBalance.available.toFixed(4)} <span className="text-lg text-[#888888]">SOL</span>
          </p>
          <link_1.default href="/dashboard/escrow" className="mt-4 inline-block text-sm text-[#00FF88] hover:underline">
            Manage Escrow →
          </link_1.default>
        </div>

        <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
          <h3 className="text-sm font-medium text-[#888888]">Active Workflows</h3>
          <p className="mt-2 text-3xl font-bold text-white">0</p>
          <link_1.default href="/dashboard/workflows" className="mt-4 inline-block text-sm text-[#00FF88] hover:underline">
            View All Workflows →
          </link_1.default>
        </div>

        <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
          <h3 className="text-sm font-medium text-[#888888]">Integrations</h3>
          <p className="mt-2 text-3xl font-bold text-white">9</p>
          <link_1.default href="/dashboard/integrations" className="mt-4 inline-block text-sm text-[#00FF88] hover:underline">
            Explore Integrations →
          </link_1.default>
        </div>
      </div>

      <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
        <h2 className="text-xl font-semibold text-white">How It Works</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#00FF88]/10 text-2xl font-bold text-[#00FF88]">
              1
            </div>
            <h3 className="mt-4 font-semibold text-white">Describe Your Task</h3>
            <p className="mt-2 text-sm text-[#888888]">
              Use natural language to tell X402 what you want to accomplish
            </p>
          </div>

          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#00FF88]/10 text-2xl font-bold text-[#00FF88]">
              2
            </div>
            <h3 className="mt-4 font-semibold text-white">AI Plans Execution</h3>
            <p className="mt-2 text-sm text-[#888888]">
              The reasoning engine creates an optimal execution plan using available services
            </p>
          </div>

          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#00FF88]/10 text-2xl font-bold text-[#00FF88]">
              3
            </div>
            <h3 className="mt-4 font-semibold text-white">Autonomous Execution</h3>
            <p className="mt-2 text-sm text-[#888888]">
              X402 orchestrates services and handles payments automatically
            </p>
          </div>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map