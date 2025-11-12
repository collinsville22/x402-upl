'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWalletStore } from '@/store/wallet';

interface ExecutionStep {
  id: string;
  type: 'service_call' | 'data_transform' | 'conditional';
  serviceName: string;
  action: string;
  estimatedCost: number;
  estimatedTime: number;
  dependencies: string[];
}

interface StepResult {
  stepId: string;
  success: boolean;
  output?: any;
  cost: number;
  time: number;
  error?: string;
  attempts: number;
}

interface Workflow {
  id: string;
  userId: string;
  naturalLanguageInput: string;
  status: 'planning' | 'awaiting_approval' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled';
  executionPlan?: {
    steps: ExecutionStep[];
    dag: Record<string, string[]>;
    totalEstimatedCost: number;
    totalEstimatedTime: number;
  };
  currentStep?: number;
  stepResults?: Record<string, StepResult>;
  totalCost: number;
  totalTime: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: {
    code: string;
    message: string;
    stepId?: string;
  };
}

interface WorkflowEvent {
  workflowId: string;
  type: string;
  data: any;
  timestamp: number;
}

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const wallet = useWalletStore((state) => state.publicKey);
  const id = params.id as string;

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [approving, setApproving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch workflow data
  useEffect(() => {
    async function fetchWorkflow() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_REASONING_URL || 'http://localhost:5000'}/workflows/${id}`
        );

        if (!response.ok) {
          throw new Error('Workflow not found');
        }

        const data = await response.json();
        if (data.success) {
          setWorkflow(data.workflow);
        } else {
          throw new Error(data.error || 'Failed to load workflow');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workflow');
      } finally {
        setLoading(false);
      }
    }

    fetchWorkflow();
  }, [id]);

  // Setup WebSocket for real-time updates
  useEffect(() => {
    if (!workflow) return;

    const wsUrl = `${(process.env.NEXT_PUBLIC_REASONING_URL || 'http://localhost:5000')
      .replace('http', 'ws')}/workflows/${id}/stream`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'connected') {
          setEvents((prev) => [...prev, data]);

          // Update workflow status based on events
          if (data.type.startsWith('workflow.')) {
            fetchWorkflowUpdate();
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

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [workflow, id]);

  async function fetchWorkflowUpdate() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_REASONING_URL || 'http://localhost:5000'}/workflows/${id}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setWorkflow(data.workflow);
        }
      }
    } catch (err) {
      console.error('Failed to update workflow:', err);
    }
  }

  async function handleApprove() {
    setApproving(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_REASONING_URL || 'http://localhost:5000'}/workflows/${id}/approve`,
        { method: 'POST' }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to approve workflow');
      }

      await fetchWorkflowUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve workflow');
    } finally {
      setApproving(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_REASONING_URL || 'http://localhost:5000'}/workflows/${id}/cancel`,
        { method: 'POST' }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to cancel workflow');
      }

      await fetchWorkflowUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel workflow');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2A2A2A] border-t-[#00FF88]"></div>
          <p className="mt-4 text-sm text-[#888888]">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-400">{error || 'Workflow not found'}</p>
          <button
            onClick={() => router.push('/dashboard/workflows')}
            className="mt-4 text-sm text-[#00FF88] hover:underline"
          >
            Back to workflows
          </button>
        </div>
      </div>
    );
  }

  const statusColors = {
    planning: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    awaiting_approval: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    approved: 'text-green-400 bg-green-500/10 border-green-500/20',
    executing: 'text-[#00FF88] bg-[#00FF88]/10 border-[#00FF88]/20',
    completed: 'text-green-400 bg-green-500/10 border-green-500/20',
    failed: 'text-red-400 bg-red-500/10 border-red-500/20',
    cancelled: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  };

  const statusColor = statusColors[workflow.status] || statusColors.planning;

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Workflow Details</h1>
            <p className="mt-1 text-sm text-[#888888]">ID: {workflow.id}</p>
          </div>
          <div className={`rounded-lg border px-4 py-2 text-sm font-semibold ${statusColor}`}>
            {workflow.status.replace('_', ' ').toUpperCase()}
          </div>
        </div>

        {/* Original Request */}
        <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
          <h2 className="text-lg font-semibold text-white">Original Request</h2>
          <p className="mt-3 text-sm text-[#CCCCCC] leading-relaxed">{workflow.naturalLanguageInput}</p>
        </div>

        {/* Cost & Time Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
            <p className="text-sm text-[#888888]">Estimated Cost</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {workflow.executionPlan?.totalEstimatedCost.toFixed(6) || '0.000000'}{' '}
              <span className="text-sm text-[#888888]">SOL</span>
            </p>
          </div>
          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
            <p className="text-sm text-[#888888]">Actual Cost</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {workflow.totalCost.toFixed(6)} <span className="text-sm text-[#888888]">SOL</span>
            </p>
          </div>
          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
            <p className="text-sm text-[#888888]">Execution Time</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {Math.round(workflow.totalTime / 1000)} <span className="text-sm text-[#888888]">sec</span>
            </p>
          </div>
        </div>

        {/* Approval Required State */}
        {workflow.status === 'awaiting_approval' && workflow.executionPlan && (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-6">
            <h2 className="text-lg font-semibold text-yellow-400">Plan Ready for Approval</h2>
            <p className="mt-2 text-sm text-yellow-300">
              The AI has created an execution plan with {workflow.executionPlan.steps.length} steps. Review and approve to start execution.
            </p>
            <div className="mt-4 flex gap-4">
              <button
                onClick={handleApprove}
                disabled={approving}
                className="rounded-lg bg-[#00FF88] px-6 py-2 font-semibold text-[#0A0A0A] transition-all hover:bg-[#00DD77] disabled:opacity-50"
              >
                {approving ? 'Approving...' : 'Approve & Execute'}
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="rounded-lg border border-[#2A2A2A] px-6 py-2 font-semibold text-white transition-colors hover:bg-[#1A1A1A] disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {/* Execution Plan */}
        {workflow.executionPlan && (
          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
            <h2 className="text-lg font-semibold text-white">Execution Plan</h2>
            <div className="mt-4 space-y-3">
              {workflow.executionPlan.steps.map((step, index) => {
                const result = workflow.stepResults?.[step.id];
                const isCurrentStep = workflow.currentStep === index;

                let stepStatus = 'pending';
                if (result) {
                  stepStatus = result.success ? 'completed' : 'failed';
                } else if (isCurrentStep) {
                  stepStatus = 'executing';
                }

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-4 rounded-lg border p-4 transition-all ${
                      stepStatus === 'completed'
                        ? 'border-green-500/20 bg-green-500/5'
                        : stepStatus === 'failed'
                        ? 'border-red-500/20 bg-red-500/5'
                        : stepStatus === 'executing'
                        ? 'border-[#00FF88]/20 bg-[#00FF88]/5'
                        : 'border-[#2A2A2A] bg-[#0A0A0A]'
                    }`}
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#2A2A2A] bg-[#111111]">
                      {stepStatus === 'completed' ? (
                        <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : stepStatus === 'failed' ? (
                        <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : stepStatus === 'executing' ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2A2A2A] border-t-[#00FF88]"></div>
                      ) : (
                        <span className="text-xs text-[#888888]">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{step.serviceName}</p>
                      <p className="text-xs text-[#888888]">{step.action}</p>
                      {result?.error && (
                        <p className="mt-1 text-xs text-red-400">{result.error}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">
                        {result?.cost.toFixed(6) || step.estimatedCost.toFixed(6)} SOL
                      </p>
                      <p className="text-xs text-[#888888]">
                        {result ? `${Math.round(result.time)}ms` : `~${step.estimatedTime}ms`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Real-time Events */}
        {events.length > 0 && (
          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
            <h2 className="text-lg font-semibold text-white">Real-time Events</h2>
            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {events.map((event, index) => (
                <div key={index} className="rounded border border-[#2A2A2A] bg-[#0A0A0A] p-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#00FF88]">{event.type}</span>
                    <span className="text-[#888888]">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {event.data && (
                    <pre className="mt-2 text-[#CCCCCC]">{JSON.stringify(event.data, null, 2)}</pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {workflow.error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6">
            <h3 className="font-semibold text-red-400">Workflow Error</h3>
            <p className="mt-2 text-sm text-red-300">{workflow.error.message}</p>
            {workflow.error.stepId && (
              <p className="mt-1 text-xs text-red-400">Step ID: {workflow.error.stepId}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/dashboard/workflows')}
            className="rounded-lg border border-[#2A2A2A] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#1A1A1A]"
          >
            Back to Workflows
          </button>
          {(workflow.status === 'executing' || workflow.status === 'awaiting_approval') && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="rounded-lg border border-red-500/20 px-6 py-3 font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Workflow'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
