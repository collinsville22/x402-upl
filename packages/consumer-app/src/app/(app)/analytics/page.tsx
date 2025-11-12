'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useWalletStore } from '@/store/wallet';
import { reasoningAPI } from '@/lib/api';

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
        const response = await reasoningAPI.getUserWorkflows(wallet.toString(), 100);

        if (response.success && response.workflows) {
          const workflows = response.workflows;

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
        ...spendingTrends.map((t) => `${t.date},${t.amount}`),
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="spinner" />
          <p className="mt-4 text-sm text-x402-text-tertiary">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-x402-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Analytics</h1>
          <p className="mt-1 text-x402-text-secondary">
            Track your workflow performance and spending patterns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleExport('csv')}>
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport('json')}>
            Export JSON
          </Button>
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
                ? 'border-x402-accent bg-x402-accent-muted text-x402-accent'
                : 'border-x402-border bg-x402-surface text-x402-text-tertiary hover:bg-x402-surface-hover hover:text-white'
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
            <Card className="p-6">
              <h3 className="text-sm font-medium text-x402-text-tertiary">Total Workflows</h3>
              <p className="mt-2 text-3xl font-bold text-white">{workflowStats.totalWorkflows}</p>
            </Card>
            <Card className="p-6">
              <h3 className="text-sm font-medium text-x402-text-tertiary">Completed</h3>
              <p className="mt-2 text-3xl font-bold text-green-400">
                {workflowStats.completedWorkflows}
              </p>
              <p className="mt-1 text-xs text-x402-text-tertiary">
                {workflowStats.totalWorkflows > 0
                  ? ((workflowStats.completedWorkflows / workflowStats.totalWorkflows) * 100).toFixed(1)
                  : 0}
                % success rate
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-sm font-medium text-x402-text-tertiary">Total Spent</h3>
              <p className="mt-2 text-3xl font-bold text-white">
                {workflowStats.totalSpent.toFixed(4)}{' '}
                <span className="text-sm text-x402-text-tertiary">SOL</span>
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-sm font-medium text-x402-text-tertiary">Average Cost</h3>
              <p className="mt-2 text-3xl font-bold text-white">
                {workflowStats.averageCost.toFixed(4)}{' '}
                <span className="text-sm text-x402-text-tertiary">SOL</span>
              </p>
            </Card>
          </div>

          {/* Spending Trends Chart */}
          {spendingTrends.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white">Spending Trends</h3>
              <div className="mt-6 flex h-64 items-end gap-2">
                {spendingTrends.map((trend, i) => {
                  const maxAmount = Math.max(...spendingTrends.map((t) => t.amount));
                  const height = maxAmount > 0 ? (trend.amount / maxAmount) * 100 : 0;

                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-2">
                      <div className="relative w-full">
                        <div
                          className="w-full rounded-t bg-x402-accent"
                          style={{
                            height: `${height}%`,
                            minHeight: trend.amount > 0 ? '4px' : '0',
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-xs text-x402-text-tertiary">
                          {new Date(trend.date).getDate()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-between text-xs text-x402-text-tertiary">
                <span>{spendingTrends[0]?.date}</span>
                <span>{spendingTrends[spendingTrends.length - 1]?.date}</span>
              </div>
            </Card>
          )}

          {/* Performance Breakdown */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white">Workflow Status</h3>
              <div className="mt-6 space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-x402-text-tertiary">Completed</span>
                    <span className="text-green-400">{workflowStats.completedWorkflows}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-x402-border">
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
                    <span className="text-x402-text-tertiary">Failed</span>
                    <span className="text-red-400">{workflowStats.failedWorkflows}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-x402-border">
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
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white">Cost Efficiency</h3>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-x402-text-tertiary">Most Expensive</span>
                  <span className="font-mono text-sm text-white">
                    {Math.max(...spendingTrends.map((t) => t.amount), 0).toFixed(4)} SOL
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-x402-text-tertiary">Least Expensive</span>
                  <span className="font-mono text-sm text-white">
                    {Math.min(
                      ...spendingTrends.filter((t) => t.amount > 0).map((t) => t.amount),
                      0
                    ).toFixed(4)}{' '}
                    SOL
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-x402-text-tertiary">Median Cost</span>
                  <span className="font-mono text-sm text-white">
                    {workflowStats.averageCost.toFixed(4)} SOL
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-lg font-medium text-white">No workflow data yet</p>
            <p className="mt-1 text-sm text-x402-text-tertiary">
              Create your first workflow to start tracking analytics
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
