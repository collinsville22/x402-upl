'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RegisterServicePage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const Input_1 = require("@/components/ui/Input");
const Textarea_1 = require("@/components/ui/Textarea");
const wallet_1 = require("@/store/wallet");
const api_1 = require("@/lib/api");
function RegisterServicePage() {
    const router = (0, navigation_1.useRouter)();
    const wallet = (0, wallet_1.useWalletStore)((state) => state.publicKey);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)('');
    const [formData, setFormData] = (0, react_1.useState)({
        name: '',
        description: '',
        endpoint: '',
        category: 'ai',
        pricing: {
            model: 'per-call',
            amount: 0.001,
        },
    });
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!wallet) {
            setError('Please connect your wallet first');
            return;
        }
        if (!formData.name || !formData.description || !formData.endpoint) {
            setError('Please fill in all required fields');
            return;
        }
        setLoading(true);
        try {
            // Register service with facilitator
            await api_1.facilitatorAPI.registerService({
                name: formData.name,
                description: formData.description,
                endpoint: formData.endpoint,
                category: formData.category,
                merchantWallet: wallet.toString(),
                pricing: formData.pricing,
            });
            // Success - redirect to services list
            router.push('/provider/services');
        }
        catch (err) {
            console.error('Failed to register service:', err);
            setError(err.message || 'Failed to register service. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="space-y-6">
      <div className="border-b border-x402-border pb-6">
        <h1 className="text-3xl font-bold tracking-tighter text-white">Register New Service</h1>
        <p className="mt-1 text-x402-text-secondary">
          Make your API available on the X402 network
        </p>
      </div>

      <Card_1.Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (<div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>)}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white">
              Service Name *
            </label>
            <Input_1.Input id="name" type="text" placeholder="My AI Service" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-2" required/>
            <p className="mt-1 text-xs text-x402-text-tertiary">
              A clear, descriptive name for your service
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-white">
              Description *
            </label>
            <Textarea_1.Textarea id="description" placeholder="Describe what your service does..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="mt-2" rows={4} required/>
            <p className="mt-1 text-xs text-x402-text-tertiary">
              Explain the capabilities and use cases
            </p>
          </div>

          <div>
            <label htmlFor="endpoint" className="block text-sm font-medium text-white">
              API Endpoint *
            </label>
            <Input_1.Input id="endpoint" type="url" placeholder="https://api.example.com" value={formData.endpoint} onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })} className="mt-2" required/>
            <p className="mt-1 text-xs text-x402-text-tertiary">
              Your service's base URL
            </p>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-white">
              Category
            </label>
            <select id="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="mt-2 w-full rounded-lg border border-x402-border bg-x402-surface px-4 py-2 text-white focus:border-x402-accent focus:outline-none">
              <option value="ai">AI</option>
              <option value="blockchain">Blockchain</option>
              <option value="payments">Payments</option>
              <option value="data">Data</option>
              <option value="trading">Trading</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="pricing-model" className="block text-sm font-medium text-white">
              Pricing Model
            </label>
            <select id="pricing-model" value={formData.pricing.model} onChange={(e) => setFormData({
            ...formData,
            pricing: { ...formData.pricing, model: e.target.value },
        })} className="mt-2 w-full rounded-lg border border-x402-border bg-x402-surface px-4 py-2 text-white focus:border-x402-accent focus:outline-none">
              <option value="per-call">Per Call</option>
              <option value="per-minute">Per Minute</option>
              <option value="per-token">Per Token</option>
            </select>
          </div>

          <div>
            <label htmlFor="pricing-amount" className="block text-sm font-medium text-white">
              Price (SOL)
            </label>
            <Input_1.Input id="pricing-amount" type="number" step="0.0001" min="0" placeholder="0.001" value={formData.pricing.amount} onChange={(e) => setFormData({
            ...formData,
            pricing: { ...formData.pricing, amount: parseFloat(e.target.value) },
        })} className="mt-2" required/>
            <p className="mt-1 text-xs text-x402-text-tertiary">
              Cost per API call in SOL
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button_1.Button type="submit" variant="primary" loading={loading} className="flex-1">
              Register Service
            </Button_1.Button>
            <Button_1.Button type="button" variant="secondary" onClick={() => router.push('/provider/services')} disabled={loading}>
              Cancel
            </Button_1.Button>
          </div>
        </form>
      </Card_1.Card>

      <Card_1.Card className="p-6">
        <h3 className="text-lg font-semibold text-white">Requirements</h3>
        <ul className="mt-4 space-y-2 text-sm text-x402-text-secondary">
          <li className="flex items-start gap-2">
            <span className="text-x402-accent">•</span>
            <span>Your API must accept X402 payment headers</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-x402-accent">•</span>
            <span>Endpoint must be publicly accessible via HTTPS</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-x402-accent">•</span>
            <span>Service should respond within 30 seconds</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-x402-accent">•</span>
            <span>Implement proper error handling and status codes</span>
          </li>
        </ul>
      </Card_1.Card>
    </div>);
}
//# sourceMappingURL=page.js.map