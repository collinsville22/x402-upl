'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WorkflowDetailPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const Spinner_1 = require("@/components/ui/Spinner");
const api_1 = require("@/lib/api");
function WorkflowDetailPage() {
    const params = (0, navigation_1.useParams)();
    const router = (0, navigation_1.useRouter)();
    const workflowId = params.id;
    const [workflow, setWorkflow] = (0, react_1.useState)(null);
    const [events, setEvents] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [approving, setApproving] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        async function fetchWorkflow() {
            try {
                const data = await api_1.reasoningAPI.getWorkflow(workflowId);
                if (data.success && data.workflow) {
                    setWorkflow(data.workflow);
                }
            }
            catch (err) {
                console.error('Failed to fetch workflow:', err);
            }
            finally {
                setLoading(false);
            }
        }
        fetchWorkflow();
    }, [workflowId]);
    (0, react_1.useEffect)(() => {
        const ws = api_1.reasoningAPI.createWorkflowStream(workflowId);
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
                            if (!prev)
                                return prev;
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
            }
            catch (err) {
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
            const response = await api_1.reasoningAPI.approveWorkflow(workflowId);
            if (response.success) {
                setWorkflow((prev) => (prev ? { ...prev, status: 'executing' } : prev));
            }
        }
        catch (err) {
            console.error('Failed to approve workflow:', err);
        }
        finally {
            setApproving(false);
        }
    };
    if (loading) {
        return (<div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Spinner_1.Spinner size="lg"/>
          <p className="mt-4 text-sm text-x402-text-tertiary">Loading workflow...</p>
        </div>
      </div>);
    }
    if (!workflow) {
        return (<div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-white">Workflow Not Found</p>
          <Button_1.Button variant="secondary" onClick={() => router.push('/workflows')} className="mt-4">
            Back to Workflows
          </Button_1.Button>
        </div>
      </div>);
    }
    const getStatusBadge = () => {
        const variants = {
            planning: 'info',
            awaiting_approval: 'warning',
            executing: 'info',
            completed: 'success',
            failed: 'error',
        };
        return <Badge_1.Badge variant={variants[workflow.status]}>{workflow.status.replace('_', ' ')}</Badge_1.Badge>;
    };
    return (<div className="space-y-6">
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
          <Button_1.Button variant="ghost" onClick={() => router.push('/workflows')}>
            ← Back
          </Button_1.Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Input */}
          <Card_1.Card className="p-6">
            <h2 className="text-lg font-semibold text-white">Task Description</h2>
            <p className="mt-3 whitespace-pre-wrap font-mono text-sm text-x402-text-secondary">
              {workflow.input}
            </p>
          </Card_1.Card>

          {/* Execution Plan */}
          {workflow.plan && (<Card_1.Card className="p-6">
              <h2 className="text-lg font-semibold text-white">Execution Plan</h2>
              <div className="mt-4 space-y-3">
                {workflow.plan.steps.map((step, index) => (<div key={step.id} className="flex items-start gap-4 rounded-lg border border-x402-border bg-x402-black p-4">
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
                  </div>))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-x402-border pt-4">
                <span className="text-sm font-medium text-x402-text-secondary">Total Estimated Cost</span>
                <span className="font-mono text-lg font-semibold text-white">
                  {workflow.plan.totalEstimatedCost.toFixed(6)} SOL
                </span>
              </div>
            </Card_1.Card>)}

          {/* Approval Required */}
          {workflow.status === 'awaiting_approval' && (<Card_1.Card variant="accent" className="p-6">
              <h3 className="text-lg font-semibold text-white">Approval Required</h3>
              <p className="mt-2 text-sm text-x402-text-secondary">
                Review the execution plan above and approve to start the workflow.
              </p>
              <div className="mt-4 flex gap-3">
                <Button_1.Button variant="primary" onClick={handleApprove} loading={approving}>
                  Approve & Execute
                </Button_1.Button>
                <Button_1.Button variant="secondary" onClick={() => router.push('/workflows')}>
                  Cancel
                </Button_1.Button>
              </div>
            </Card_1.Card>)}

          {/* Results */}
          {workflow.status === 'completed' && workflow.result && (<Card_1.Card className="p-6">
              <h2 className="text-lg font-semibold text-white">Results</h2>
              <pre className="mt-4 overflow-x-auto rounded-lg bg-x402-black p-4 font-mono text-xs text-x402-text-secondary">
                {JSON.stringify(workflow.result, null, 2)}
              </pre>
            </Card_1.Card>)}

          {/* Error */}
          {workflow.status === 'failed' && workflow.error && (<Card_1.Card className="border-x402-error/20 bg-x402-error/5 p-6">
              <h2 className="text-lg font-semibold text-x402-error">Execution Failed</h2>
              <p className="mt-3 font-mono text-sm text-x402-error">{workflow.error}</p>
            </Card_1.Card>)}
        </div>

        {/* Sidebar - Real-time Events */}
        <div className="space-y-6">
          <Card_1.Card className="p-6">
            <h3 className="text-sm font-semibold text-white">Real-time Events</h3>
            <div className="mt-4 max-h-[600px] space-y-2 overflow-y-auto">
              {events.length === 0 ? (<p className="text-center text-sm text-x402-text-tertiary">
                  No events yet...
                </p>) : (events.map((event, i) => (<div key={i} className="rounded-lg border border-x402-border bg-x402-black p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-x402-accent">
                        {event.type.replace('workflow.', '').replace('step.', '').replace('_', ' ')}
                      </span>
                      <span className="text-xs text-x402-text-muted">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {event.data && (<p className="mt-2 text-xs text-x402-text-tertiary">
                        {JSON.stringify(event.data).slice(0, 100)}...
                      </p>)}
                  </div>)))}
            </div>
          </Card_1.Card>

          {(workflow.status === 'executing' || workflow.status === 'planning') && (<Card_1.Card className="p-6">
              <div className="flex items-center gap-3">
                <Spinner_1.Spinner size="sm"/>
                <span className="text-sm font-medium text-white">
                  {workflow.status === 'planning' ? 'AI is planning...' : 'Executing workflow...'}
                </span>
              </div>
            </Card_1.Card>)}
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map