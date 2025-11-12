'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { facilitatorAPI } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

interface ServiceSettings {
  webhookUrl: string;
  webhookSecret: string;
  settlementFrequency: string;
  minimumSettlement: string;
  autoSettlement: boolean;
}

export default function ServiceManagePage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;

  const [settings, setSettings] = useState<ServiceSettings>({
    webhookUrl: '',
    webhookSecret: '',
    settlementFrequency: 'daily',
    minimumSettlement: '100',
    autoSettlement: true,
  });

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['all-services'],
    queryFn: async () => {
      return await facilitatorAPI.getServices();
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['service-stats', serviceId],
    queryFn: async () => {
      return await facilitatorAPI.getServiceStats(serviceId);
    },
    enabled: !!serviceId,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['service-transactions', serviceId],
    queryFn: async () => {
      return await facilitatorAPI.getTransactions({ serviceId, limit: 50 });
    },
    enabled: !!serviceId,
  });

  const service = services?.find(s => s.id === serviceId);
  const isLoading = servicesLoading || statsLoading || txLoading;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-slate-900 dark:text-white">
            Service Not Found
          </p>
          <button
            onClick={() => router.push('/dashboard/services')}
            className="mt-4 rounded-lg bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
          >
            Back to Services
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.push('/dashboard/services')}
          className="mb-4 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          ← Back to Services
        </button>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          {service.name}
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Manage service settings and view performance
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Calls</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats?.totalCalls || 0}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Revenue</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            ${stats?.totalRevenue ? parseFloat(stats.totalRevenue).toFixed(2) : '0.00'}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">Success Rate</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats?.successRate ? stats.successRate.toFixed(1) : '0'}%
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">Average Rating</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats?.averageRating ? stats.averageRating.toFixed(1) : '0'}/5
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Service Details
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Service URL
            </label>
            <input
              type="text"
              value={service.url}
              disabled
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Wallet Address
            </label>
            <input
              type="text"
              value={service.wallet}
              disabled
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Category
              </label>
              <input
                type="text"
                value={service.category || 'Uncategorized'}
                disabled
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Price per Call
              </label>
              <input
                type="text"
                value={`${parseFloat(service.pricePerCall).toFixed(2)} USDC`}
                disabled
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Settlement settings moved to /dashboard/settings */}

      <div className="rounded-lg bg-white shadow dark:bg-slate-800">
        <div className="border-b border-slate-200 p-6 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Recent Transactions
          </h2>
        </div>
        {transactions && transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Token
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Signature
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {transactions.slice(0, 10).map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {new Date(tx.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                      ${parseFloat(tx.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                      {tx.token}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          tx.status === 'confirmed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <code className="text-xs text-slate-600 dark:text-slate-400">
                        {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center">
            <p className="text-slate-600 dark:text-slate-400">No transactions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
