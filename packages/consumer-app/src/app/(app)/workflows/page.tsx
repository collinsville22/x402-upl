'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useWalletStore } from '@/store/wallet';
import { reasoningAPI } from '@/lib/api';
import { format } from 'date-fns';

interface Workflow {
  id: string;
  input: string;
  status: 'planning' | 'awaiting_approval' | 'executing' | 'completed' | 'failed';
  totalCost?: number;
  createdAt: string;
  completedAt?: string;
}

type StatusFilter = 'all' | 'planning' | 'awaiting_approval' | 'executing' | 'completed' | 'failed';

export default function WorkflowsPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.publicKey);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    async function fetchWorkflows() {
      if (!wallet) {
        setLoading(false);
        return;
      }

      try {
        const data = await reasoningAPI.getUserWorkflows(wallet.toString());
        if (data.success && data.workflows) {
          setWorkflows(data.workflows);
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

  const filteredWorkflows = workflows.filter((w) =>
    statusFilter === 'all' ? true : w.status === statusFilter
  );

  const statusCounts = {
    all: workflows.length,
    planning: workflows.filter((w) => w.status === 'planning').length,
    awaiting_approval: workflows.filter((w) => w.status === 'awaiting_approval').length,
    executing: workflows.filter((w) => w.status === 'executing').length,
    completed: workflows.filter((w) => w.status === 'completed').length,
    failed: workflows.filter((w) => w.status === 'failed').length,
  };

  const getStatusBadge = (status: Workflow['status']) => {
    const variants = {
      planning: 'info',
      awaiting_approval: 'warning',
      executing: 'info',
      completed: 'success',
      failed: 'error',
    };
    return <Badge variant={variants[status] as any}>{status.replace('_', ' ')}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-x402-text-tertiary">Loading workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-x402-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Workflows</h1>
          <p className="mt-1 text-x402-text-secondary">
            Manage and monitor your AI-powered workflows
          </p>
        </div>
        <Button variant="primary" onClick={() => router.push('/workflows/new')}>
          Create Workflow
        </Button>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(Object.keys(statusCounts) as StatusFilter[]).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'border-x402-accent bg-x402-accent-muted text-x402-accent'
                : 'border-x402-border bg-x402-surface text-x402-text-tertiary hover:bg-x402-surface-hover hover:text-white'
            }`}
          >
            {status.replace('_', ' ')} ({statusCounts[status]})
          </button>
        ))}
      </div>

      {/* Workflows List */}
      {filteredWorkflows.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <div className="mx-auto h-24 w-24 rounded-full bg-x402-accent/10 flex items-center justify-center">
              <svg
                className="h-12 w-12 text-x402-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">
              {statusFilter === 'all' ? 'No workflows yet' : `No ${statusFilter.replace('_', ' ')} workflows`}
            </h3>
            <p className="mt-2 text-sm text-x402-text-tertiary">
              {statusFilter === 'all'
                ? 'Create your first workflow to get started'
                : 'Try selecting a different status filter'}
            </p>
            {statusFilter === 'all' && (
              <Button
                variant="primary"
                onClick={() => router.push('/workflows/new')}
                className="mt-6"
              >
                Create Your First Workflow
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredWorkflows.map((workflow) => (
            <Card
              key={workflow.id}
              variant="hover"
              onClick={() => router.push(`/workflows/${workflow.id}`)}
              className="p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">
                      {workflow.input.slice(0, 80)}
                      {workflow.input.length > 80 ? '...' : ''}
                    </h3>
                    {getStatusBadge(workflow.status)}
                  </div>
                  <p className="mt-2 font-mono text-xs text-x402-text-muted">
                    ID: {workflow.id}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-sm text-x402-text-tertiary">
                    <span>Created {format(new Date(workflow.createdAt), 'MMM d, yyyy h:mm a')}</span>
                    {workflow.completedAt && (
                      <span>
                        Completed {format(new Date(workflow.completedAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    )}
                    {workflow.totalCost !== undefined && (
                      <span className="font-mono">
                        Cost: {workflow.totalCost.toFixed(6)} SOL
                      </span>
                    )}
                  </div>
                </div>
                <svg
                  className="h-5 w-5 flex-shrink-0 text-x402-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
