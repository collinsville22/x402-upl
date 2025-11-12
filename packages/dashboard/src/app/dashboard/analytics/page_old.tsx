'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { facilitatorAPI } from '@/lib/api';
import { useWalletStore } from '@/store/wallet';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface MonthlyData {
  date: string;
  earnings: number;
  count: number;
}

export default function AnalyticsPage() {
  const [earningsData, setEarningsData] = useState<MonthlyData[]>([]);
  const [transactionsData, setTransactionsData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const wallet = useWalletStore((state) => state.publicKey);

  useEffect(() => {
    async function fetchAnalytics() {
      if (!wallet) {
        setLoading(false);
        return;
      }

      try {
        const transactions = await facilitatorAPI.getTransactions({
          agentId: wallet.toString(),
          limit: 1000,
        });

        const monthlyStats = new Map<string, { earnings: number; count: number }>();

        for (let i = 5; i >= 0; i--) {
          const date = subMonths(new Date(), i);
          const key = format(date, 'MMM');
          monthlyStats.set(key, { earnings: 0, count: 0 });
        }

        transactions.forEach((tx) => {
          const txDate = new Date(tx.timestamp);
          const key = format(txDate, 'MMM');
          const stats = monthlyStats.get(key);

          if (stats && tx.status === 'confirmed') {
            stats.earnings += parseFloat(tx.amount);
            stats.count += 1;
          }
        });

        const chartData: MonthlyData[] = Array.from(monthlyStats.entries()).map(
          ([date, stats]) => ({
            date,
            earnings: stats.earnings,
            count: stats.count,
          })
        );

        setEarningsData(chartData);
        setTransactionsData(chartData);
      } catch (error) {

      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000);

    return () => clearInterval(interval);
  }, [wallet]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Analytics</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Track your performance over time
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Earnings Over Time
          </h2>
          <div className="mt-4 h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-600 dark:text-slate-400">
                Loading...
              </div>
            ) : earningsData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-600 dark:text-slate-400">
                No earnings data yet
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={earningsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="earnings" stroke="#0ea5e9" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Transactions Per Month
          </h2>
          <div className="mt-4 h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-600 dark:text-slate-400">
                Loading...
              </div>
            ) : transactionsData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-600 dark:text-slate-400">
                No transaction data yet
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={transactionsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Service Performance
        </h2>
        <div className="mt-4 text-center text-slate-600 dark:text-slate-400">
          No performance data available yet
        </div>
      </div>
    </div>
  );
}
