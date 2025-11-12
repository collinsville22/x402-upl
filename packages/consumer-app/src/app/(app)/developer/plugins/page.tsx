'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const plugins = [
  {
    id: 'wordpress',
    name: 'WordPress',
    description: 'Accept X402 payments in your WordPress site',
    status: 'active',
    version: '1.0.0',
    downloads: 1240,
    rating: 4.8,
    category: 'cms',
    docs: 'https://docs.x402.network/plugins/wordpress',
    install: 'composer require x402-upl/wordpress-plugin',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'X402 payment gateway for Shopify stores',
    status: 'active',
    version: '2.1.0',
    downloads: 3450,
    rating: 4.9,
    category: 'ecommerce',
    docs: 'https://docs.x402.network/plugins/shopify',
    install: 'Via Shopify App Store',
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Accept crypto payments with X402 in WooCommerce',
    status: 'active',
    version: '1.5.2',
    downloads: 2890,
    rating: 4.7,
    category: 'ecommerce',
    docs: 'https://docs.x402.network/plugins/woocommerce',
    install: 'composer require x402-upl/woocommerce',
  },
  {
    id: 'eliza',
    name: 'Eliza AI',
    description: 'X402 integration for Eliza AI framework',
    status: 'beta',
    version: '0.9.0',
    downloads: 580,
    rating: 4.5,
    category: 'ai',
    docs: 'https://docs.x402.network/plugins/eliza',
    install: 'npm install @x402-upl/eliza-plugin',
  },
];

export default function PluginsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', name: 'All Plugins', count: plugins.length },
    { id: 'ecommerce', name: 'E-commerce', count: 2 },
    { id: 'cms', name: 'CMS', count: 1 },
    { id: 'ai', name: 'AI', count: 1 },
  ];

  const filteredPlugins = plugins.filter((plugin) => {
    const matchesCategory = selectedCategory === 'all' || plugin.category === selectedCategory;
    const matchesSearch =
      plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-x402-border pb-6">
        <h1 className="text-3xl font-bold tracking-tighter text-white">Plugins</h1>
        <p className="mt-1 text-x402-text-secondary">
          Integrate X402 into your e-commerce platform
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Total Plugins</h3>
          <p className="mt-2 text-3xl font-bold text-white">{plugins.length}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Total Downloads</h3>
          <p className="mt-2 text-3xl font-bold text-white">
            {plugins.reduce((sum, p) => sum + p.downloads, 0).toLocaleString()}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Active</h3>
          <p className="mt-2 text-3xl font-bold text-green-400">
            {plugins.filter((p) => p.status === 'active').length}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Avg Rating</h3>
          <p className="mt-2 text-3xl font-bold text-white">
            {(plugins.reduce((sum, p) => sum + p.rating, 0) / plugins.length).toFixed(1)}
          </p>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-x402-accent text-black'
                    : 'bg-x402-surface text-x402-text-tertiary hover:bg-x402-surface-hover'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-x402-border bg-x402-surface px-4 py-2 text-white placeholder:text-x402-text-tertiary focus:border-x402-accent focus:outline-none"
          />
        </div>
      </Card>

      {/* Plugins Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {filteredPlugins.map((plugin) => (
          <Card key={plugin.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">{plugin.name}</h3>
                  <Badge
                    variant={plugin.status === 'active' ? 'success' : 'warning'}
                  >
                    {plugin.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-x402-text-secondary">{plugin.description}</p>

                <div className="mt-4 flex items-center gap-4 text-xs text-x402-text-tertiary">
                  <span>v{plugin.version}</span>
                  <span>{plugin.downloads.toLocaleString()} downloads</span>
                  <span className="flex items-center gap-1">
                    <span className="text-yellow-400">★</span>
                    {plugin.rating}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="rounded-lg bg-x402-black p-3">
                <p className="text-xs font-medium text-x402-text-tertiary">Installation</p>
                <code className="mt-1 block text-xs text-x402-accent">{plugin.install}</code>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.open(plugin.docs, '_blank')}
                className="flex-1"
              >
                View Docs
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigator.clipboard.writeText(plugin.install)}
              >
                Copy Install
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredPlugins.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-lg font-medium text-white">No plugins found</p>
            <p className="mt-1 text-sm text-x402-text-tertiary">
              Try adjusting your search or filters
            </p>
          </div>
        </Card>
      )}

      {/* Documentation */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white">Plugin Development</h2>
        <p className="mt-2 text-sm text-x402-text-secondary">
          Want to build a plugin for your platform? Check out our developer documentation.
        </p>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <h3 className="font-medium text-white">Quick Start</h3>
            <code className="mt-1 block rounded bg-x402-black p-2 text-x402-accent">
              npm create x402-plugin@latest
            </code>
          </div>
          <div>
            <h3 className="font-medium text-white">Core Requirements</h3>
            <ul className="mt-1 space-y-1 text-x402-text-secondary">
              <li>• X402 SDK integration</li>
              <li>• Payment verification</li>
              <li>• Webhook support</li>
              <li>• Error handling</li>
            </ul>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.open('https://docs.x402.network/plugins', '_blank')}
            >
              Read Plugin Docs
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open('https://github.com/x402-upl/plugins', '_blank')}
            >
              View on GitHub
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
