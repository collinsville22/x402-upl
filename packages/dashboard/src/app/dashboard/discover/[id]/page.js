'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ServiceDetailPage;
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("@/lib/api");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
function ServiceDetailPage() {
    const params = (0, navigation_1.useParams)();
    const router = (0, navigation_1.useRouter)();
    const serviceId = params.id;
    const [activeTab, setActiveTab] = (0, react_1.useState)('overview');
    const [testEndpoint, setTestEndpoint] = (0, react_1.useState)('');
    const [testMethod, setTestMethod] = (0, react_1.useState)('GET');
    const [testBody, setTestBody] = (0, react_1.useState)('{}');
    const [testResponse, setTestResponse] = (0, react_1.useState)(null);
    const [testLoading, setTestLoading] = (0, react_1.useState)(false);
    const { data: services, isLoading: servicesLoading } = (0, react_query_1.useQuery)({
        queryKey: ['all-services'],
        queryFn: async () => {
            return await api_1.facilitatorAPI.getServices();
        },
    });
    const { data: stats, isLoading: statsLoading } = (0, react_query_1.useQuery)({
        queryKey: ['service-stats', serviceId],
        queryFn: async () => {
            return await api_1.facilitatorAPI.getServiceStats(serviceId);
        },
        enabled: !!serviceId,
    });
    const service = services?.find(s => s.id === serviceId);
    const isLoading = servicesLoading || statsLoading;
    const averageRating = stats?.averageRating || 0;
    const handleTestAPI = async () => {
        setTestLoading(true);
        setTestResponse(null);
        try {
            const response = await fetch(testEndpoint, {
                method: testMethod,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: testMethod === 'POST' ? testBody : undefined,
            });
            const data = await response.json();
            setTestResponse(JSON.stringify(data, null, 2));
        }
        catch (error) {
            setTestResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        finally {
            setTestLoading(false);
        }
    };
    if (isLoading) {
        return (<div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2A2A2A] border-t-[#00FF88]"></div>
          <p className="mt-4 text-sm text-[#888888]">Loading service...</p>
        </div>
      </div>);
    }
    if (!service) {
        return (<div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-400">Service Not Found</p>
          <button onClick={() => router.push('/dashboard/discover')} className="mt-4 text-sm text-[#00FF88] hover:underline">
            Back to Discover
          </button>
        </div>
      </div>);
    }
    const averageRating = mockReviews.reduce((acc, r) => acc + r.rating, 0) / mockReviews.length;
    return (<div className="min-h-screen bg-[#0A0A0A] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="border-b border-[#2A2A2A] pb-6">
          <button onClick={() => router.push('/dashboard/discover')} className="mb-4 text-sm text-[#888888] hover:text-white">
            ← Back to Discover
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">{service.name}</h1>
              <p className="mt-2 text-[#CCCCCC]">{service.url}</p>
              {service.category && (<span className="mt-3 inline-flex rounded-lg border border-[#00FF88]/20 bg-[#00FF88]/10 px-3 py-1 text-xs font-semibold text-[#00FF88]">
                  {service.category}
                </span>)}
            </div>
            <div className="text-right">
              <p className="text-sm text-[#888888]">Price per Call</p>
              <p className="mt-1 text-3xl font-bold text-white">
                ${parseFloat(service.pricePerCall).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-4">
          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
            <p className="text-sm text-[#888888]">Total Calls</p>
            <p className="mt-2 text-2xl font-bold text-white">{stats?.totalCalls || 0}</p>
          </div>
          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
            <p className="text-sm text-[#888888]">Success Rate</p>
            <p className="mt-2 text-2xl font-bold text-green-400">
              {stats?.successRate ? stats.successRate.toFixed(1) : '0'}%
            </p>
          </div>
          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
            <p className="text-sm text-[#888888]">Average Rating</p>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-2xl font-bold text-white">{averageRating.toFixed(1)}</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (<svg key={star} className={`h-4 w-4 ${star <= Math.round(averageRating) ? 'text-yellow-400' : 'text-[#2A2A2A]'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>))}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
            <p className="text-sm text-[#888888]">Response Time</p>
            <p className="mt-2 text-2xl font-bold text-white">~120ms</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#2A2A2A]">
          <div className="flex gap-6">
            {[
            { id: 'overview', label: 'Overview' },
            { id: 'docs', label: 'Documentation' },
            { id: 'try', label: 'Try It' },
            { id: 'reviews', label: 'Reviews' },
            { id: 'analytics', label: 'Analytics' },
        ].map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`border-b-2 px-1 pb-4 text-sm font-medium transition-colors ${activeTab === tab.id
                ? 'border-[#00FF88] text-white'
                : 'border-transparent text-[#888888] hover:text-white'}`}>
                {tab.label}
              </button>))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
          {activeTab === 'overview' && (<div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Service Details</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-[#888888]">Service URL</label>
                    <p className="mt-1 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-2 font-mono text-sm text-[#CCCCCC]">
                      {service.url}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-[#888888]">Provider Wallet</label>
                    <p className="mt-1 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-2 font-mono text-sm text-[#CCCCCC]">
                      {service.wallet.slice(0, 16)}...{service.wallet.slice(-16)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-[#888888]">Accepted Tokens</label>
                    <div className="mt-2 flex gap-2">
                      {service.acceptedTokens.map((token) => (<span key={token} className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-1 text-xs font-medium text-white">
                          {token}
                        </span>))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-[#888888]">Category</label>
                    <p className="mt-1 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-2 text-sm text-[#CCCCCC]">
                      {service.category || 'Uncategorized'}
                    </p>
                  </div>
                </div>
              </div>
            </div>)}

          {activeTab === 'docs' && (<div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">API Documentation</h3>
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-6">
                <h4 className="font-semibold text-white">Making Requests</h4>
                <p className="mt-2 text-sm text-[#CCCCCC]">
                  All requests to this service require payment via the X402 protocol.
                </p>
                <pre className="mt-4 overflow-x-auto rounded-lg bg-[#111111] p-4 text-xs text-[#00FF88]">
            {`// Example request with X402 payment
const response = await fetch('${service.url}', {
  headers: {
    'X-Payment-Required': 'true',
    'X-Payment-Token': 'USDC',
    'X-Payment-Amount': '${service.pricePerCall}'
  }
});`}
                </pre>
              </div>
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-6">
                <h4 className="font-semibold text-white">Response Format</h4>
                <pre className="mt-4 overflow-x-auto rounded-lg bg-[#111111] p-4 text-xs text-[#CCCCCC]">
            {`{
  "success": true,
  "data": { ... },
  "payment": {
    "signature": "...",
    "amount": "${service.pricePerCall}"
  }
}`}
                </pre>
              </div>
            </div>)}

          {activeTab === 'try' && (<div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">API Playground</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white">Endpoint</label>
                  <input type="text" value={testEndpoint} onChange={(e) => setTestEndpoint(e.target.value)} placeholder={service.url} className="mt-2 block w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 text-white placeholder-[#555555] focus:border-[#00FF88] focus:outline-none focus:ring-1 focus:ring-[#00FF88]"/>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-white">Method</label>
                    <select value={testMethod} onChange={(e) => setTestMethod(e.target.value)} className="mt-2 block w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 text-white focus:border-[#00FF88] focus:outline-none focus:ring-1 focus:ring-[#00FF88]">
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                    </select>
                  </div>
                </div>
                {testMethod === 'POST' && (<div>
                    <label className="text-sm font-medium text-white">Request Body (JSON)</label>
                    <textarea value={testBody} onChange={(e) => setTestBody(e.target.value)} rows={6} className="mt-2 block w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 font-mono text-sm text-white placeholder-[#555555] focus:border-[#00FF88] focus:outline-none focus:ring-1 focus:ring-[#00FF88]"/>
                  </div>)}
                <button onClick={handleTestAPI} disabled={testLoading || !testEndpoint} className="rounded-lg bg-[#00FF88] px-6 py-3 font-semibold text-[#0A0A0A] transition-all hover:bg-[#00DD77] disabled:opacity-50">
                  {testLoading ? 'Testing...' : 'Send Request'}
                </button>
                {testResponse && (<div>
                    <label className="text-sm font-medium text-white">Response</label>
                    <pre className="mt-2 overflow-x-auto rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-4 text-xs text-[#CCCCCC]">
                      {testResponse}
                    </pre>
                  </div>)}
              </div>
            </div>)}

          {activeTab === 'reviews' && (<div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">User Reviews</h3>
                <button className="rounded-lg bg-[#00FF88] px-4 py-2 text-sm font-semibold text-[#0A0A0A] transition-all hover:bg-[#00DD77]">
                  Write Review
                </button>
              </div>
              <div className="flex h-32 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#0A0A0A]">
                <p className="text-sm text-[#888888]">No reviews yet. Be the first to review this service.</p>
              </div>
            </div>)}

          {activeTab === 'analytics' && (<div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Service Analytics</h3>
              <div className="flex h-32 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#0A0A0A]">
                <p className="text-sm text-[#888888]">Advanced analytics available for service providers.</p>
              </div>
            </div>)}
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map