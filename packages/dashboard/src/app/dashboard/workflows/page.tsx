'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletStore } from '@/store/wallet';
import { format } from 'date-fns';

interface WorkflowSummary {
  id: string;
  naturalLanguageInput: string;
  status: 'planning' | 'awaiting_approval' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled';
  totalCost: number;
  createdAt: string;
  completedAt?: string;
}

export default function WorkflowsPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.publicKey);

  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchWorkflows() {
      if (!wallet) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_REASONING_URL || 'http://localhost:5000'}/users/${wallet.toString()}/workflows?limit=50`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setWorkflows(data.workflows);
          }
        }
      } catch (err) {
        console.error('Failed to fetch workflows:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkflows();
    const interval = setInterval(fetchWorkflows, 30000);
    return () => clearInterval(interval);
  }, [wallet]);

  const filteredWorkflows = filter === 'all'
    ? workflows
    : workflows.filter(w => w.status === filter);

  const statusColors = {
    planning: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    awaiting_approval: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    approved: 'text-green-400 bg-green-500/10 border-green-500/20',
    executing: 'text-[#00FF88] bg-[#00FF88]/10 border-[#00FF88]/20',
    completed: 'text-green-400 bg-green-500/10 border-green-500/20',
    failed: 'text-red-400 bg-red-500/10 border-red-500/20',
    cancelled: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Workflows</h1>
            <p className="mt-1 text-[#888888]">
              Autonomous AI workflows executing on your behalf
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/workflows/new')}
            className="rounded-lg bg-[#00FF88] px-6 py-3 font-semibold text-[#0A0A0A] transition-all hover:bg-[#00DD77]"
          >
            Create Workflow
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'awaiting_approval', 'executing', 'completed', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                filter === status
                  ? 'border-[#00FF88] bg-[#00FF88]/10 text-[#00FF88]'
                  : 'border-[#2A2A2A] bg-[#111111] text-[#888888] hover:bg-[#1A1A1A]'
              }`}
            >
              {status.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {/* Workflows List */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2A2A2A] border-t-[#00FF88]"></div>
              <p className="mt-4 text-sm text-[#888888]">Loading workflows...</p>
            </div>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#111111]">
            <div className="text-center">
              <p className="text-lg font-medium text-white">
                {filter === 'all' ? 'No workflows yet' : `No ${filter.replace('_', ' ')} workflows`}
              </p>
              <p className="mt-1 text-sm text-[#888888]">
                Create your first AI-powered workflow to get started
              </p>
              {filter === 'all' && (
                <button
                  onClick={() => router.push('/dashboard/workflows/new')}
                  className="mt-4 rounded-lg bg-[#00FF88] px-6 py-2 text-sm font-semibold text-[#0A0A0A] transition-all hover:bg-[#00DD77]"
                >
                  Create Workflow
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredWorkflows.map((workflow) => {
              const statusColor = statusColors[workflow.status] || statusColors.planning;

              return (
                <button
                  key={workflow.id}
                  onClick={() => router.push(`/dashboard/workflows/${workflow.id}`)}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] p-6 text-left transition-all hover:border-[#00FF88]/30 hover:bg-[#1A1A1A]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg border px-3 py-1 text-xs font-semibold ${statusColor}`}>
                          {workflow.status.replace('_', ' ').toUpperCase()}
                        </div>
                        <span className="text-xs text-[#888888]">
                          {format(new Date(workflow.createdAt), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-[#CCCCCC]">
                        {workflow.naturalLanguageInput}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-lg font-bold text-white">
                        {workflow.totalCost.toFixed(6)}
                      </p>
                      <p className="text-xs text-[#888888]">SOL spent</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Stats Summary */}
        {workflows.length > 0 && (
          <div className="grid gap-6 md:grid-cols-4">
            <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
              <p className="text-sm text-[#888888]">Total Workflows</p>
              <p className="mt-2 text-2xl font-bold text-white">{workflows.length}</p>
            </div>
            <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
              <p className="text-sm text-[#888888]">Completed</p>
              <p className="mt-2 text-2xl font-bold text-green-400">
                {workflows.filter(w => w.status === 'completed').length}
              </p>
            </div>
            <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
              <p className="text-sm text-[#888888]">In Progress</p>
              <p className="mt-2 text-2xl font-bold text-[#00FF88]">
                {workflows.filter(w => w.status === 'executing' || w.status === 'awaiting_approval').length}
              </p>
            </div>
            <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
              <p className="text-sm text-[#888888]">Total Spent</p>
              <p className="mt-2 text-2xl font-bold text-white">
                {workflows.reduce((sum, w) => sum + w.totalCost, 0).toFixed(4)} <span className="text-sm text-[#888888]">SOL</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
