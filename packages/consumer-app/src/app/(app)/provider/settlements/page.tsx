'use client';

import { Card } from '@/components/ui/Card';

export default function SettlementsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-x402-border pb-6">
        <h1 className="text-3xl font-bold tracking-tighter text-white">Settlements</h1>
        <p className="mt-1 text-x402-text-secondary">
          Withdraw your earnings
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Available Balance</h3>
          <p className="mt-2 text-3xl font-bold text-white">
            0.0000 <span className="text-lg text-x402-text-tertiary">SOL</span>
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Pending</h3>
          <p className="mt-2 text-3xl font-bold text-white">
            0.0000 <span className="text-lg text-x402-text-tertiary">SOL</span>
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Total Earned</h3>
          <p className="mt-2 text-3xl font-bold text-white">
            0.0000 <span className="text-lg text-x402-text-tertiary">SOL</span>
          </p>
        </Card>
      </div>
    </div>
  );
}
