'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = IntegrationsPage;
const react_1 = require("react");
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const Input_1 = require("@/components/ui/Input");
const INTEGRATIONS = [
    {
        id: 'cdp-agent',
        name: 'Coinbase Developer Platform',
        description: 'AI agent for Solana blockchain operations via CDP. Execute transactions, deploy tokens, and manage wallets autonomously.',
        category: 'Blockchain',
        status: 'active',
        color: '#0052FF',
        capabilities: ['Wallet Management', 'Token Deployment', 'Transaction Execution', 'Smart Contracts'],
        pricing: 'Per transaction',
    },
    {
        id: 'dark-research',
        name: 'Dark Research AI',
        description: 'Advanced AI research assistant for market analysis, sentiment tracking, and predictive analytics.',
        category: 'AI',
        status: 'active',
        color: '#1A1A2E',
        capabilities: ['Market Analysis', 'Sentiment Tracking', 'Predictive Analytics', 'Research Reports'],
        pricing: '$0.05 per query',
    },
    {
        id: 'gradient',
        name: 'Gradient Parallax',
        description: 'Decentralized AI inference network for running ML models at scale with privacy guarantees.',
        category: 'AI',
        status: 'active',
        color: '#8B5CF6',
        capabilities: ['ML Inference', 'Model Deployment', 'Privacy-Preserving AI', 'Distributed Computing'],
        pricing: 'Usage-based',
    },
    {
        id: 'triton',
        name: 'Triton',
        description: 'High-performance trading infrastructure for DeFi protocols with real-time market data.',
        category: 'Trading',
        status: 'active',
        color: '#14B8A6',
        capabilities: ['Real-time Market Data', 'Trading APIs', 'Order Execution', 'Portfolio Analytics'],
        pricing: '$0.10 per API call',
    },
    {
        id: 'visa-tap',
        name: 'Visa TAP',
        description: 'Token Asset Platform integration for compliant digital asset issuance and management.',
        category: 'Payments',
        status: 'active',
        color: '#1434CB',
        capabilities: ['Asset Issuance', 'Compliance Tools', 'Settlement', 'Digital Wallets'],
        pricing: 'Enterprise',
    },
    {
        id: 'om1-robotics',
        name: 'OM1 Robotics',
        description: 'Robotics process automation for blockchain operations and autonomous task execution.',
        category: 'AI',
        status: 'available',
        color: '#F59E0B',
        capabilities: ['Process Automation', 'Task Scheduling', 'Workflow Orchestration', 'Monitoring'],
        pricing: 'Contact sales',
    },
    {
        id: 'switchboard',
        name: 'Switchboard',
        description: 'Decentralized oracle network providing real-world data feeds to smart contracts.',
        category: 'Data',
        status: 'active',
        color: '#EF4444',
        capabilities: ['Price Feeds', 'Custom Oracles', 'VRF', 'Data Aggregation'],
        pricing: 'Per update',
    },
    {
        id: 'phantom-cash',
        name: 'Phantom CASH',
        description: 'Privacy-focused stablecoin integration for confidential transactions on Solana.',
        category: 'Payments',
        status: 'active',
        color: '#AB68FF',
        capabilities: ['Private Transfers', 'Stablecoin Operations', 'Confidential Balances', 'Compliance'],
        pricing: 'Free',
    },
    {
        id: 'catalog',
        name: 'Catalog',
        description: 'Decentralized service registry and discovery protocol for Web3 applications.',
        category: 'Data',
        status: 'active',
        color: '#10B981',
        capabilities: ['Service Discovery', 'Registry Management', 'Metadata Storage', 'Search APIs'],
        pricing: '$0.01 per query',
    },
];
const CATEGORIES = ['All', 'AI', 'Blockchain', 'Payments', 'Data', 'Trading'];
function IntegrationsPage() {
    const [selectedCategory, setSelectedCategory] = (0, react_1.useState)('All');
    const [selectedStatus, setSelectedStatus] = (0, react_1.useState)('all');
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [selectedIntegration, setSelectedIntegration] = (0, react_1.useState)(null);
    const filteredIntegrations = INTEGRATIONS.filter((integration) => {
        const matchesCategory = selectedCategory === 'All' || integration.category === selectedCategory;
        const matchesStatus = selectedStatus === 'all' || integration.status === selectedStatus;
        const matchesSearch = searchQuery === '' ||
            integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            integration.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesStatus && matchesSearch;
    });
    const activeCount = INTEGRATIONS.filter((i) => i.status === 'active').length;
    return (<div className="space-y-6">
      {/* Header */}
      <div className="border-b border-x402-border pb-6">
        <h1 className="text-3xl font-bold tracking-tighter text-white">Integrations</h1>
        <p className="mt-1 text-x402-text-secondary">
          Powerful integrations that extend X402's capabilities
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card_1.Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Total Integrations</h3>
          <p className="mt-2 text-3xl font-bold text-white">{INTEGRATIONS.length}</p>
        </Card_1.Card>
        <Card_1.Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Active Integrations</h3>
          <p className="mt-2 text-3xl font-bold text-x402-accent">{activeCount}</p>
        </Card_1.Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Input_1.Input type="text" placeholder="Search integrations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10"/>
          <svg className="absolute left-3 top-3.5 h-5 w-5 text-x402-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>

        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="rounded-lg border border-x402-border bg-x402-surface px-4 py-3 text-sm text-white focus:border-x402-accent focus:outline-none focus:ring-1 focus:ring-x402-accent">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="available">Available</option>
        </select>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((category) => (<button key={category} onClick={() => setSelectedCategory(category)} className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${selectedCategory === category
                ? 'border-x402-accent bg-x402-accent-muted text-x402-accent'
                : 'border-x402-border bg-x402-surface text-x402-text-tertiary hover:bg-x402-surface-hover hover:text-white'}`}>
            {category}
          </button>))}
      </div>

      {/* Integrations Grid */}
      {filteredIntegrations.length === 0 ? (<Card_1.Card className="p-12">
          <div className="text-center">
            <p className="text-lg font-medium text-white">No integrations found</p>
            <p className="mt-1 text-sm text-x402-text-tertiary">
              Try adjusting your search or filters
            </p>
          </div>
        </Card_1.Card>) : (<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredIntegrations.map((integration) => (<Card_1.Card key={integration.id} variant="hover" onClick={() => setSelectedIntegration(integration)} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg" style={{
                    backgroundColor: integration.color + '20',
                    border: `2px solid ${integration.color}`,
                }}>
                    <div className="h-6 w-6 rounded" style={{ backgroundColor: integration.color }}/>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{integration.name}</h3>
                    <Badge_1.Badge variant={integration.status === 'active'
                    ? 'success'
                    : integration.status === 'available'
                        ? 'info'
                        : 'neutral'} className="mt-1">
                      {integration.status === 'active'
                    ? 'Active'
                    : integration.status === 'available'
                        ? 'Available'
                        : 'Coming Soon'}
                    </Badge_1.Badge>
                  </div>
                </div>
                <Badge_1.Badge variant="neutral">{integration.category}</Badge_1.Badge>
              </div>

              <p className="mt-4 line-clamp-2 text-sm text-x402-text-tertiary">
                {integration.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {integration.capabilities.slice(0, 3).map((capability) => (<span key={capability} className="rounded border border-x402-border bg-x402-black px-2 py-1 text-xs text-x402-text-secondary">
                    {capability}
                  </span>))}
                {integration.capabilities.length > 3 && (<span className="rounded border border-x402-border bg-x402-black px-2 py-1 text-xs text-x402-text-muted">
                    +{integration.capabilities.length - 3} more
                  </span>)}
              </div>
            </Card_1.Card>))}
        </div>)}

      {/* Integration Detail Modal */}
      {selectedIntegration && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedIntegration(null)}>
          <Card_1.Card className="max-w-2xl overflow-y-auto p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg" style={{
                backgroundColor: selectedIntegration.color + '20',
                border: `2px solid ${selectedIntegration.color}`,
            }}>
                  <div className="h-10 w-10 rounded" style={{ backgroundColor: selectedIntegration.color }}/>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedIntegration.name}</h2>
                  <p className="mt-1 text-sm text-x402-text-tertiary">{selectedIntegration.category}</p>
                </div>
              </div>
              <button onClick={() => setSelectedIntegration(null)} className="text-x402-text-tertiary hover:text-white">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <p className="mt-6 text-x402-text-secondary">{selectedIntegration.description}</p>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-white">Capabilities</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedIntegration.capabilities.map((capability) => (<span key={capability} className="rounded border border-x402-border bg-x402-black px-3 py-1 text-sm text-x402-text-secondary">
                    {capability}
                  </span>))}
              </div>
            </div>

            {selectedIntegration.pricing && (<div className="mt-6">
                <h3 className="text-sm font-semibold text-white">Pricing</h3>
                <p className="mt-2 text-sm text-x402-text-secondary">{selectedIntegration.pricing}</p>
              </div>)}

            <div className="mt-8 flex gap-3">
              <button className="flex-1 rounded-lg bg-x402-accent px-6 py-3 font-semibold text-x402-black transition-all hover:bg-x402-accent-hover">
                Use in Workflow
              </button>
              <button className="rounded-lg border border-x402-border bg-x402-surface px-6 py-3 font-semibold text-white transition-all hover:bg-x402-surface-hover">
                View Docs
              </button>
            </div>
          </Card_1.Card>
        </div>)}
    </div>);
}
//# sourceMappingURL=page.js.map