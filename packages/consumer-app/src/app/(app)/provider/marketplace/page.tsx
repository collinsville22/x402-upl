'use client';

import { Card } from '@/components/ui/Card';

export default function MarketplacePage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-x402-border pb-6">
        <h1 className="text-3xl font-bold tracking-tighter text-white">Marketplace</h1>
        <p className="mt-1 text-x402-text-secondary">
          Discover and integrate other services
        </p>
      </div>

      <Card className="p-12">
        <div className="text-center">
          <p className="text-lg font-medium text-white">Marketplace coming soon</p>
          <p className="mt-1 text-sm text-x402-text-tertiary">
            Browse and integrate other provider services
          </p>
        </div>
      </Card>
    </div>
  );
}
