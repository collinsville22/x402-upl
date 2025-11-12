'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { reasoningAPI } from '@/lib/api';

interface WorkflowEvent {
  type: 'workflow.created' | 'workflow.planning' | 'workflow.awaiting_approval' | 'workflow.approved' | 'workflow.executing' | 'workflow.completed' | 'workflow.failed' | 'step.started' | 'step.completed' | 'step.failed';
  timestamp: string;
  data?: any;
}

interface Workflow {
  id: string;
  userId: string;
  input: string;
  status: 'planning' | 'awaiting_approval' | 'executing' | 'completed' | 'failed';
  plan?: {
    steps: Array<{
      id: string;
      service: string;
      action: string;
      estimatedCost: number;
      dependencies: string[];
    }>;
    totalEstimatedCost: number;
  };
  result?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    async function fetchWorkflow() {
      try {
        const data = await reasoningAPI.getWorkflow(workflowId);
        if (data.success && data.workflow) {
          setWorkflow(data.workflow);
        }
      } catch (err) {
        console.error('Failed to fetch workflow:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkflow();
  }, [workflowId]);

  useEffect(() => {
    const ws = reasoningAPI.createWorkflowStream(workflowId);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'connected') {
          setEvents((prev) => [...prev, data]);

          if (data.type.startsWith('workflow.')) {
            setWorkflow((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                status: data.type.replace('workflow.', ''),
                plan: data.data?.plan || prev.plan,
                result: data.data?.result || prev.result,
                error: data.data?.error || prev.error,
                completedAt: data.data?.completedAt || prev.completedAt,
              };
            });
          }
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [workflowId]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      const response = await reasoningAPI.approveWorkflow(workflowId);
      if (response.success) {
        setWorkflow((prev) => (prev ? { ...prev, status: 'executing' } : prev));
      }
    } catch (err) {
      console.error('Failed to approve workflow:', err);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-x402-text-tertiary">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-white">Workflow Not Found</p>
          <Button variant="secondary" onClick={() => router.push('/workflows')} className="mt-4">
            Back to Workflows
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = () => {
    const variants = {
      planning: 'info',
      awaiting_approval: 'warning',
      executing: 'info',
      completed: 'success',
      failed: 'error',
    };
    return <Badge variant={variants[workflow.status] as any}>{workflow.status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-x402-border pb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tighter text-white">
                Workflow
              </h1>
              {getStatusBadge()}
            </div>
            <p className="mt-2 font-mono text-sm text-x402-text-tertiary">ID: {workflow.id}</p>
          </div>
          <Button variant="ghost" onClick={() => router.push('/workflows')}>
            ← Back
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Input */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white">Task Description</h2>
            <p className="mt-3 whitespace-pre-wrap font-mono text-sm text-x402-text-secondary">
              {workflow.input}
            </p>
          </Card>

          {/* Execution Plan */}
          {workflow.plan && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white">Execution Plan</h2>
              <div className="mt-4 space-y-3">
                {workflow.plan.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-start gap-4 rounded-lg border border-x402-border bg-x402-black p-4"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-x402-accent/10 text-sm font-semibold text-x402-accent">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{step.action}</h3>
                      <p className="mt-1 text-sm text-x402-text-tertiary">Service: {step.service}</p>
                      <p className="mt-1 text-xs text-x402-text-muted">
                        Estimated cost: {step.estimatedCost.toFixed(6)} SOL
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-x402-border pt-4">
                <span className="text-sm font-medium text-x402-text-secondary">Total Estimated Cost</span>
                <span className="font-mono text-lg font-semibold text-white">
                  {workflow.plan.totalEstimatedCost.toFixed(6)} SOL
                </span>
              </div>
            </Card>
          )}

          {/* Approval Required */}
          {workflow.status === 'awaiting_approval' && (
            <Card variant="accent" className="p-6">
              <h3 className="text-lg font-semibold text-white">Approval Required</h3>
              <p className="mt-2 text-sm text-x402-text-secondary">
                Review the execution plan above and approve to start the workflow.
              </p>
              <div className="mt-4 flex gap-3">
                <Button
                  variant="primary"
                  onClick={handleApprove}
                  loading={approving}
                >
                  Approve & Execute
                </Button>
                <Button variant="secondary" onClick={() => router.push('/workflows')}>
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {/* Results */}
          {workflow.status === 'completed' && workflow.result && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white">Results</h2>
              <pre className="mt-4 overflow-x-auto rounded-lg bg-x402-black p-4 font-mono text-xs text-x402-text-secondary">
                {JSON.stringify(workflow.result, null, 2)}
              </pre>
            </Card>
          )}

          {/* Error */}
          {workflow.status === 'failed' && workflow.error && (
            <Card className="border-x402-error/20 bg-x402-error/5 p-6">
              <h2 className="text-lg font-semibold text-x402-error">Execution Failed</h2>
              <p className="mt-3 font-mono text-sm text-x402-error">{workflow.error}</p>
            </Card>
          )}
        </div>

        {/* Sidebar - Real-time Events */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-white">Real-time Events</h3>
            <div className="mt-4 max-h-[600px] space-y-2 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-center text-sm text-x402-text-tertiary">
                  No events yet...
                </p>
              ) : (
                events.map((event, i) => (
                  <div key={i} className="rounded-lg border border-x402-border bg-x402-black p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-x402-accent">
                        {event.type.replace('workflow.', '').replace('step.', '').replace('_', ' ')}
                      </span>
                      <span className="text-xs text-x402-text-muted">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {event.data && (
                      <p className="mt-2 text-xs text-x402-text-tertiary">
                        {JSON.stringify(event.data).slice(0, 100)}...
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {(workflow.status === 'executing' || workflow.status === 'planning') && (
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <Spinner size="sm" />
                <span className="text-sm font-medium text-white">
                  {workflow.status === 'planning' ? 'AI is planning...' : 'Executing workflow...'}
                </span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
