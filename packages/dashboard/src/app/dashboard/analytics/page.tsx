'use client';

import { useEffect, useState } from 'react';
import { useWalletStore } from '@/store/wallet';

interface WorkflowStats {
  totalWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  totalSpent: number;
  averageCost: number;
}

interface SpendingTrend {
  date: string;
  amount: number;
}

export default function AnalyticsPage() {
  const wallet = useWalletStore((state) => state.publicKey);
  const [loading, setLoading] = useState(true);
  const [workflowStats, setWorkflowStats] = useState<WorkflowStats | null>(null);
  const [spendingTrends, setSpendingTrends] = useState<SpendingTrend[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    async function fetchAnalytics() {
      if (!wallet) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_REASONING_URL || 'http://localhost:5000'}/users/${wallet.toString()}/workflows?limit=100`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.workflows) {
            const workflows = data.workflows;

            const stats: WorkflowStats = {
              totalWorkflows: workflows.length,
              completedWorkflows: workflows.filter((w: any) => w.status === 'completed').length,
              failedWorkflows: workflows.filter((w: any) => w.status === 'failed').length,
              totalSpent: workflows.reduce((sum: number, w: any) => sum + (w.totalCost || 0), 0),
              averageCost: 0,
            };

            stats.averageCost = stats.totalWorkflows > 0 ? stats.totalSpent / stats.totalWorkflows : 0;

            setWorkflowStats(stats);

            const trendMap = new Map<string, number>();
            workflows.forEach((w: any) => {
              if (w.completedAt) {
                const date = new Date(w.completedAt).toISOString().split('T')[0];
                trendMap.set(date, (trendMap.get(date) || 0) + (w.totalCost || 0));
              }
            });

            const trends = Array.from(trendMap.entries())
              .map(([date, amount]) => ({ date, amount }))
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(-30);

            setSpendingTrends(trends);
          }
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000);
    return () => clearInterval(interval);
  }, [wallet, timeRange]);

  const handleExport = (format: 'csv' | 'json') => {
    if (!workflowStats) return;

    const data = {
      summary: workflowStats,
      trends: spendingTrends,
      exportedAt: new Date().toISOString(),
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `x402-analytics-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const csv = [
        'Date,Amount',
        ...spendingTrends.map(t => `${t.date},${t.amount}`),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `x402-analytics-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2A2A2A] border-t-[#00FF88]"></div>
          <p className="mt-4 text-sm text-[#888888]">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics</h1>
            <p className="mt-1 text-[#888888]">
              Track your workflow performance and spending patterns
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="rounded-lg border border-[#2A2A2A] bg-[#111111] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1A1A1A]"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="rounded-lg border border-[#2A2A2A] bg-[#111111] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1A1A1A]"
            >
              Export JSON
            </button>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'border-[#00FF88] bg-[#00FF88]/10 text-[#00FF88]'
                  : 'border-[#2A2A2A] bg-[#111111] text-[#888888] hover:bg-[#1A1A1A]'
              }`}
            >
              {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
        </div>

        {/* Stats Grid */}
        {workflowStats ? (
          <>
            <div className="grid gap-6 md:grid-cols-4">
              <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
                <p className="text-sm text-[#888888]">Total Workflows</p>
                <p className="mt-2 text-3xl font-bold text-white">{workflowStats.totalWorkflows}</p>
              </div>
              <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
                <p className="text-sm text-[#888888]">Completed</p>
                <p className="mt-2 text-3xl font-bold text-green-400">{workflowStats.completedWorkflows}</p>
                <p className="mt-1 text-xs text-[#888888]">
                  {workflowStats.totalWorkflows > 0
                    ? ((workflowStats.completedWorkflows / workflowStats.totalWorkflows) * 100).toFixed(1)
                    : 0}% success rate
                </p>
              </div>
              <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
                <p className="text-sm text-[#888888]">Total Spent</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {workflowStats.totalSpent.toFixed(4)} <span className="text-sm text-[#888888]">SOL</span>
                </p>
              </div>
              <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
                <p className="text-sm text-[#888888]">Average Cost</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {workflowStats.averageCost.toFixed(4)} <span className="text-sm text-[#888888]">SOL</span>
                </p>
              </div>
            </div>

            {/* Spending Trends */}
            {spendingTrends.length > 0 && (
              <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
                <h3 className="text-lg font-semibold text-white">Spending Trends</h3>
                <div className="mt-6 flex h-64 items-end gap-2">
                  {spendingTrends.map((trend, i) => {
                    const maxAmount = Math.max(...spendingTrends.map(t => t.amount));
                    const height = maxAmount > 0 ? (trend.amount / maxAmount) * 100 : 0;

                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-2">
                        <div className="relative w-full">
                          <div
                            className="w-full rounded-t bg-[#00FF88]"
                            style={{ height: `${height}%`, minHeight: trend.amount > 0 ? '4px' : '0' }}
                          />
                        </div>
                        <div className="text-center">
                          <span className="text-xs text-[#888888]">
                            {new Date(trend.date).getDate()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex justify-between text-xs text-[#888888]">
                  <span>{spendingTrends[0]?.date}</span>
                  <span>{spendingTrends[spendingTrends.length - 1]?.date}</span>
                </div>
              </div>
            )}

            {/* Performance Breakdown */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
                <h3 className="text-lg font-semibold text-white">Workflow Status</h3>
                <div className="mt-6 space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#888888]">Completed</span>
                      <span className="text-green-400">{workflowStats.completedWorkflows}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[#2A2A2A]">
                      <div
                        className="h-2 rounded-full bg-green-400"
                        style={{
                          width: `${
                            workflowStats.totalWorkflows > 0
                              ? (workflowStats.completedWorkflows / workflowStats.totalWorkflows) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#888888]">Failed</span>
                      <span className="text-red-400">{workflowStats.failedWorkflows}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[#2A2A2A]">
                      <div
                        className="h-2 rounded-full bg-red-400"
                        style={{
                          width: `${
                            workflowStats.totalWorkflows > 0
                              ? (workflowStats.failedWorkflows / workflowStats.totalWorkflows) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
                <h3 className="text-lg font-semibold text-white">Cost Efficiency</h3>
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#888888]">Most Expensive</span>
                    <span className="font-mono text-sm text-white">
                      {Math.max(...spendingTrends.map(t => t.amount), 0).toFixed(4)} SOL
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#888888]">Least Expensive</span>
                    <span className="font-mono text-sm text-white">
                      {Math.min(...spendingTrends.filter(t => t.amount > 0).map(t => t.amount), 0).toFixed(4)} SOL
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#888888]">Median Cost</span>
                    <span className="font-mono text-sm text-white">
                      {workflowStats.averageCost.toFixed(4)} SOL
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#111111]">
            <div className="text-center">
              <p className="text-lg font-medium text-white">No workflow data yet</p>
              <p className="mt-1 text-sm text-[#888888]">
                Create your first workflow to start tracking analytics
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
