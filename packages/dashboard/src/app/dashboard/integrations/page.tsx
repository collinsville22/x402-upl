'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: 'AI' | 'Blockchain' | 'Payments' | 'Data' | 'Trading';
  status: 'active' | 'available' | 'coming-soon';
  color: string;
  capabilities: string[];
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'cdp-agent',
    name: 'Coinbase Developer Platform',
    description: 'AI agent for Solana blockchain operations via CDP. Execute transactions, deploy tokens, and manage wallets autonomously.',
    category: 'Blockchain',
    status: 'active',
    color: '#0052FF',
    capabilities: ['Wallet Management', 'Token Deployment', 'Transaction Execution', 'Smart Contracts'],
  },
  {
    id: 'dark-research',
    name: 'Dark Research AI',
    description: 'Advanced AI research assistant for market analysis, sentiment tracking, and predictive analytics.',
    category: 'AI',
    status: 'active',
    color: '#1A1A2E',
    capabilities: ['Market Analysis', 'Sentiment Tracking', 'Predictive Analytics', 'Research Reports'],
  },
  {
    id: 'gradient',
    name: 'Gradient Parallax',
    description: 'Decentralized AI inference network for running ML models at scale with privacy guarantees.',
    category: 'AI',
    status: 'active',
    color: '#8B5CF6',
    capabilities: ['ML Inference', 'Model Deployment', 'Privacy-Preserving AI', 'Distributed Computing'],
  },
  {
    id: 'triton',
    name: 'Triton',
    description: 'High-performance trading infrastructure for DeFi protocols with real-time market data.',
    category: 'Trading',
    status: 'active',
    color: '#14B8A6',
    capabilities: ['Real-time Market Data', 'Trading APIs', 'Order Execution', 'Portfolio Analytics'],
  },
  {
    id: 'visa-tap',
    name: 'Visa TAP',
    description: 'Token Asset Platform integration for compliant digital asset issuance and management.',
    category: 'Payments',
    status: 'active',
    color: '#1434CB',
    capabilities: ['Asset Issuance', 'Compliance Tools', 'Settlement', 'Digital Wallets'],
  },
  {
    id: 'om1-robotics',
    name: 'OM1 Robotics',
    description: 'Robotics process automation for blockchain operations and autonomous task execution.',
    category: 'AI',
    status: 'available',
    color: '#F59E0B',
    capabilities: ['Process Automation', 'Task Scheduling', 'Workflow Orchestration', 'Monitoring'],
  },
  {
    id: 'switchboard',
    name: 'Switchboard',
    description: 'Decentralized oracle network providing real-world data feeds to smart contracts.',
    category: 'Data',
    status: 'active',
    color: '#EF4444',
    capabilities: ['Price Feeds', 'Custom Oracles', 'VRF', 'Data Aggregation'],
  },
  {
    id: 'phantom-cash',
    name: 'Phantom CASH',
    description: 'Privacy-focused stablecoin integration for confidential transactions on Solana.',
    category: 'Payments',
    status: 'active',
    color: '#AB68FF',
    capabilities: ['Private Transfers', 'Stablecoin Operations', 'Confidential Balances', 'Compliance'],
  },
  {
    id: 'catalog',
    name: 'Catalog',
    description: 'Decentralized service registry and discovery protocol for Web3 applications.',
    category: 'Data',
    status: 'active',
    color: '#10B981',
    capabilities: ['Service Discovery', 'Registry Management', 'Metadata Storage', 'Search APIs'],
  },
];

const CATEGORIES = ['All', 'AI', 'Blockchain', 'Payments', 'Data', 'Trading'];

export default function IntegrationsPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'available'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIntegrations = INTEGRATIONS.filter((integration) => {
    const matchesCategory = selectedCategory === 'All' || integration.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || integration.status === selectedStatus;
    const matchesSearch =
      searchQuery === '' ||
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesStatus && matchesSearch;
  });

  const activeCount = INTEGRATIONS.filter(i => i.status === 'active').length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="border-b border-[#2A2A2A] pb-6">
          <h1 className="text-3xl font-bold text-white">Integrations</h1>
          <p className="mt-2 text-[#888888]">
            Powerful integrations that extend X402's capabilities across AI, blockchain, and payments
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
            <p className="text-sm text-[#888888]">Total Integrations</p>
            <p className="mt-2 text-3xl font-bold text-white">{INTEGRATIONS.length}</p>
          </div>
          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
            <p className="text-sm text-[#888888]">Active Integrations</p>
            <p className="mt-2 text-3xl font-bold text-[#00FF88]">{activeCount}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-4 py-3 pl-10 text-white placeholder-[#555555] focus:border-[#00FF88] focus:outline-none focus:ring-1 focus:ring-[#00FF88]"
            />
            <svg
              className="absolute left-3 top-3.5 h-5 w-5 text-[#888888]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="rounded-lg border border-[#2A2A2A] bg-[#111111] px-4 py-3 text-sm text-white focus:border-[#00FF88] focus:outline-none focus:ring-1 focus:ring-[#00FF88]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="available">Available</option>
            </select>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'border-[#00FF88] bg-[#00FF88]/10 text-[#00FF88]'
                  : 'border-[#2A2A2A] bg-[#111111] text-[#888888] hover:bg-[#1A1A1A]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Integrations Grid */}
        {filteredIntegrations.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredIntegrations.map((integration) => (
              <button
                key={integration.id}
                onClick={() => router.push(`/dashboard/integrations/${integration.id}`)}
                className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6 text-left transition-all hover:border-[#00FF88]/30 hover:bg-[#1A1A1A]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: integration.color + '20', border: `2px solid ${integration.color}` }}
                    >
                      <div className="h-6 w-6 rounded" style={{ backgroundColor: integration.color }}></div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{integration.name}</h3>
                      <span
                        className={`mt-1 inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium ${
                          integration.status === 'active'
                            ? 'border-[#00FF88]/20 bg-[#00FF88]/10 text-[#00FF88]'
                            : integration.status === 'available'
                            ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                            : 'border-[#888888]/20 bg-[#888888]/10 text-[#888888]'
                        }`}
                      >
                        {integration.status === 'active'
                          ? 'Active'
                          : integration.status === 'available'
                          ? 'Available'
                          : 'Coming Soon'}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1 text-xs text-[#888888]">
                    {integration.category}
                  </span>
                </div>

                <p className="mt-4 text-sm text-[#888888] line-clamp-2">
                  {integration.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {integration.capabilities.slice(0, 3).map((capability) => (
                    <span
                      key={capability}
                      className="rounded border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1 text-xs text-[#CCCCCC]"
                    >
                      {capability}
                    </span>
                  ))}
                  {integration.capabilities.length > 3 && (
                    <span className="rounded border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1 text-xs text-[#888888]">
                      +{integration.capabilities.length - 3} more
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#111111]">
            <div className="text-center">
              <p className="text-lg font-medium text-white">No integrations found</p>
              <p className="mt-1 text-sm text-[#888888]">
                Try adjusting your search or filters
              </p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
          <h3 className="text-sm font-semibold text-white">About Integrations</h3>
          <p className="mt-3 text-sm text-[#888888]">
            X402 integrations extend the platform's capabilities by connecting to external services,
            AI models, blockchain networks, and data providers. Each integration is designed to work
            seamlessly with the autonomous workflow system, enabling complex multi-step operations
            across different domains.
          </p>
        </div>
      </div>
    </div>
  );
}
