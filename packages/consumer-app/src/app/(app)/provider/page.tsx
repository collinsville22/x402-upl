'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWalletStore } from '@/store/wallet';
import { facilitatorAPI } from '@/lib/api';

export default function ProviderDashboard() {
  const wallet = useWalletStore((state) => state.publicKey);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!wallet) {
        setLoading(false);
        return;
      }

      try {
        const data = await facilitatorAPI.getMerchantStats(wallet.toString());
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch merchant stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [wallet]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-x402-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Provider Dashboard</h1>
          <p className="mt-1 text-x402-text-secondary">
            Manage your services and track revenue
          </p>
        </div>
        <Link href="/provider/services/new">
          <Button variant="primary">Register New Service</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Total Revenue</h3>
          <p className="mt-2 text-3xl font-bold text-white">
            ${stats?.totalRevenue?.toFixed(2) || '0.00'}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">API Calls</h3>
          <p className="mt-2 text-3xl font-bold text-white">{stats?.totalCalls || 0}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Success Rate</h3>
          <p className="mt-2 text-3xl font-bold text-green-400">
            {stats?.successRate?.toFixed(1) || '0'}%
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Active Services</h3>
          <p className="mt-2 text-3xl font-bold text-white">{stats?.activeServices || 0}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Link href="/provider/services">
            <Card variant="hover" className="p-4">
              <h3 className="font-medium text-white">Manage Services</h3>
              <p className="mt-1 text-sm text-x402-text-tertiary">
                View and edit your registered services
              </p>
            </Card>
          </Link>
          <Link href="/provider/settlements">
            <Card variant="hover" className="p-4">
              <h3 className="font-medium text-white">Settlements</h3>
              <p className="mt-1 text-sm text-x402-text-tertiary">
                Withdraw your earnings
              </p>
            </Card>
          </Link>
        </div>
      </Card>
    </div>
  );
}
