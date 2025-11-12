'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TestingSandboxPage;
const react_1 = require("react");
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const Badge_1 = require("@/components/ui/Badge");
const wallet_1 = require("@/store/wallet");
const SANDBOX_URL = process.env.NEXT_PUBLIC_SANDBOX_URL || 'http://localhost:4000';
const testEndpoints = [
    {
        id: 'echo',
        name: 'Echo Service',
        method: 'POST',
        path: '/echo',
        price: 0.001,
        description: 'Returns your input with metadata',
        samplePayload: { message: 'Hello X402' },
    },
    {
        id: 'weather',
        name: 'Weather Data',
        method: 'GET',
        path: '/weather',
        price: 0.002,
        description: 'Mock weather data for testing',
        samplePayload: null,
    },
    {
        id: 'random',
        name: 'Random Data',
        method: 'GET',
        path: '/random-data',
        price: 0.005,
        description: 'Generate random test data',
        samplePayload: null,
    },
    {
        id: 'crypto',
        name: 'Crypto Prices',
        method: 'GET',
        path: '/crypto-price',
        price: 0.003,
        description: 'Mock cryptocurrency prices',
        samplePayload: null,
    },
    {
        id: 'analytics',
        name: 'Analytics',
        method: 'POST',
        path: '/analytics',
        price: 0.01,
        description: 'Process analytics with statistics',
        samplePayload: { data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    },
    {
        id: 'ml',
        name: 'ML Inference',
        method: 'POST',
        path: '/ml-inference',
        price: 0.02,
        description: 'Mock ML inference endpoint',
        samplePayload: { input: 'Test classification input' },
    },
    {
        id: 'blockchain',
        name: 'Blockchain Data',
        method: 'GET',
        path: '/blockchain-data',
        price: 0.015,
        description: 'Mock blockchain transactions',
        samplePayload: null,
    },
];
function TestingSandboxPage() {
    const wallet = (0, wallet_1.useWalletStore)((state) => state.publicKey);
    const [stats, setStats] = (0, react_1.useState)(null);
    const [selectedEndpoint, setSelectedEndpoint] = (0, react_1.useState)(null);
    const [testResults, setTestResults] = (0, react_1.useState)([]);
    const [testing, setTesting] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);
    async function fetchStats() {
        try {
            const response = await fetch(`${SANDBOX_URL}/stats`);
            const data = await response.json();
            setStats(data);
        }
        catch (err) {
            console.error('Failed to fetch sandbox stats:', err);
        }
    }
    async function testEndpoint(endpoint) {
        if (!wallet) {
            alert('Please connect your wallet first');
            return;
        }
        setTesting(true);
        setSelectedEndpoint(endpoint.id);
        try {
            // This would use X402 SDK to make payment
            // For now, just simulate the call
            const result = {
                endpoint: endpoint.name,
                status: 'success',
                cost: endpoint.price,
                timestamp: new Date().toISOString(),
                refundStatus: 'pending',
                message: 'Payment sent. Refund will be processed in 15-30 seconds.',
            };
            setTestResults([result, ...testResults]);
        }
        catch (err) {
            setTestResults([
                {
                    endpoint: endpoint.name,
                    status: 'error',
                    error: err.message,
                    timestamp: new Date().toISOString(),
                },
                ...testResults,
            ]);
        }
        finally {
            setTesting(false);
            setSelectedEndpoint(null);
        }
    }
    return (<div className="space-y-6">
      <div className="border-b border-x402-border pb-6">
        <h1 className="text-3xl font-bold tracking-tighter text-white">Testing Sandbox</h1>
        <p className="mt-1 text-x402-text-secondary">
          Test X402 payments with automatic refunds
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card_1.Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Total Refunds</h3>
          <p className="mt-2 text-3xl font-bold text-white">
            {stats?.refunds?.totalRefunds || 0}
          </p>
        </Card_1.Card>
        <Card_1.Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Success Rate</h3>
          <p className="mt-2 text-3xl font-bold text-green-400">
            {stats?.refunds
            ? ((stats.refunds.successfulRefunds / stats.refunds.totalRefunds) *
                100).toFixed(1)
            : 0}
            %
          </p>
        </Card_1.Card>
        <Card_1.Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Wallet Balance</h3>
          <p className="mt-2 text-3xl font-bold text-white">
            {stats?.wallet?.balance?.sol?.toFixed(4) || '0.0000'}{' '}
            <span className="text-lg text-x402-text-tertiary">SOL</span>
          </p>
        </Card_1.Card>
        <Card_1.Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Avg Refund Time</h3>
          <p className="mt-2 text-3xl font-bold text-white">
            {stats?.refunds?.averageRefundTimeMs
            ? (stats.refunds.averageRefundTimeMs / 1000).toFixed(1)
            : 0}
            s
          </p>
        </Card_1.Card>
      </div>

      {/* Info Banner */}
      <Card_1.Card className="border-l-4 border-x402-accent bg-x402-accent-muted/10 p-6">
        <h3 className="font-semibold text-white">How It Works</h3>
        <ul className="mt-2 space-y-1 text-sm text-x402-text-secondary">
          <li>• Send X402 payment to test any endpoint</li>
          <li>• Payment is automatically verified on Solana devnet</li>
          <li>• Full refund sent back within 15-30 seconds</li>
          <li>• Perfect for testing integrations risk-free</li>
        </ul>
      </Card_1.Card>

      {/* Test Endpoints */}
      <Card_1.Card className="p-6">
        <h2 className="text-lg font-semibold text-white">Test Endpoints</h2>
        <div className="mt-4 grid gap-4">
          {testEndpoints.map((endpoint) => (<Card_1.Card key={endpoint.id} variant="hover" className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-white">{endpoint.name}</h3>
                    <Badge_1.Badge variant="neutral">{endpoint.method}</Badge_1.Badge>
                    <span className="text-sm text-x402-text-tertiary">{endpoint.path}</span>
                  </div>
                  <p className="mt-1 text-sm text-x402-text-secondary">
                    {endpoint.description}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-x402-text-tertiary">
                    <span>Cost: {endpoint.price} SOL</span>
                    {endpoint.samplePayload && (<span>Requires payload</span>)}
                  </div>
                </div>
                <Button_1.Button variant="primary" size="sm" onClick={() => testEndpoint(endpoint)} loading={testing && selectedEndpoint === endpoint.id} disabled={testing}>
                  Test
                </Button_1.Button>
              </div>
            </Card_1.Card>))}
        </div>
      </Card_1.Card>

      {/* Test Results */}
      {testResults.length > 0 && (<Card_1.Card className="p-6">
          <h2 className="text-lg font-semibold text-white">Recent Tests</h2>
          <div className="mt-4 space-y-3">
            {testResults.map((result, idx) => (<div key={idx} className="flex items-center justify-between rounded-lg border border-x402-border bg-x402-surface p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-white">{result.endpoint}</span>
                    <Badge_1.Badge variant={result.status === 'success' ? 'success' : 'error'}>
                      {result.status}
                    </Badge_1.Badge>
                    {result.refundStatus && (<Badge_1.Badge variant="warning">{result.refundStatus}</Badge_1.Badge>)}
                  </div>
                  {result.message && (<p className="mt-1 text-sm text-x402-text-secondary">{result.message}</p>)}
                  {result.error && (<p className="mt-1 text-sm text-red-400">{result.error}</p>)}
                  <p className="mt-1 text-xs text-x402-text-tertiary">
                    {new Date(result.timestamp).toLocaleString()}
                  </p>
                </div>
                {result.cost && (<span className="text-sm font-medium text-x402-text-secondary">
                    {result.cost} SOL
                  </span>)}
              </div>))}
          </div>
        </Card_1.Card>)}

      {/* Setup Instructions */}
      <Card_1.Card className="p-6">
        <h2 className="text-lg font-semibold text-white">Setup Instructions</h2>
        <div className="mt-4 space-y-4 text-sm text-x402-text-secondary">
          <div>
            <h3 className="font-medium text-white">1. Install X402 SDK</h3>
            <code className="mt-1 block rounded bg-x402-black p-2 text-x402-accent">
              npm install @x402-upl/sdk
            </code>
          </div>
          <div>
            <h3 className="font-medium text-white">2. Make Test Request</h3>
            <pre className="mt-1 overflow-x-auto rounded bg-x402-black p-3 text-xs text-x402-text-primary">
        {`import { SolanaX402Client } from '@x402-upl/sdk';

const client = new SolanaX402Client({
  wallet: yourWallet,
  network: 'devnet',
});

const response = await client.get('${SANDBOX_URL}/weather');
console.log(response.data);`}
            </pre>
          </div>
          <div>
            <h3 className="font-medium text-white">3. Check Refund Status</h3>
            <code className="mt-1 block rounded bg-x402-black p-2 text-x402-text-primary">
              GET {SANDBOX_URL}/refund/[signature]
            </code>
          </div>
        </div>
      </Card_1.Card>
    </div>);
}
//# sourceMappingURL=page.js.map