'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ServiceAnalyticsPage;
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("@/lib/api");
const navigation_1 = require("next/navigation");
const recharts_1 = require("recharts");
const date_fns_1 = require("date-fns");
function ServiceAnalyticsPage() {
    const params = (0, navigation_1.useParams)();
    const router = (0, navigation_1.useRouter)();
    const serviceId = params.id;
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
    const { data: transactions, isLoading: txLoading } = (0, react_query_1.useQuery)({
        queryKey: ['service-transactions', serviceId],
        queryFn: async () => {
            return await api_1.facilitatorAPI.getTransactions({ serviceId, limit: 1000 });
        },
        enabled: !!serviceId,
    });
    const service = services?.find(s => s.id === serviceId);
    const isLoading = servicesLoading || statsLoading || txLoading;
    const chartData = [];
    if (transactions) {
        const monthlyStats = new Map();
        for (let i = 5; i >= 0; i--) {
            const date = (0, date_fns_1.subMonths)(new Date(), i);
            const key = (0, date_fns_1.format)(date, 'MMM');
            monthlyStats.set(key, { revenue: 0, calls: 0 });
        }
        transactions.forEach((tx) => {
            if (tx.status === 'confirmed') {
                const txDate = new Date(tx.timestamp);
                const key = (0, date_fns_1.format)(txDate, 'MMM');
                const stats = monthlyStats.get(key);
                if (stats) {
                    stats.revenue += parseFloat(tx.amount);
                    stats.calls += 1;
                }
            }
        });
        monthlyStats.forEach((stats, date) => {
            chartData.push({
                date,
                revenue: stats.revenue,
                calls: stats.calls,
            });
        });
    }
    if (isLoading) {
        return (<div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"/>
      </div>);
    }
    if (!service) {
        return (<div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-slate-900 dark:text-white">
            Service Not Found
          </p>
          <button onClick={() => router.push('/dashboard/services')} className="mt-4 rounded-lg bg-primary-500 px-4 py-2 text-white hover:bg-primary-600">
            Back to Services
          </button>
        </div>
      </div>);
    }
    return (<div className="space-y-6">
      <div>
        <button onClick={() => router.push(`/dashboard/services/${serviceId}`)} className="mb-4 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          ← Back to Service
        </button>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          {service.name} Analytics
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Performance metrics and trends
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
          <p className="text-sm text-slate-600 dark:text-slate-400">Avg Revenue/Call</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            ${stats?.totalCalls && stats?.totalRevenue
            ? (parseFloat(stats.totalRevenue) / stats.totalCalls).toFixed(2)
            : '0.00'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Revenue Over Time
          </h2>
          <div className="mt-4 h-64">
            {chartData.length > 0 ? (<recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.LineChart data={chartData}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                  <recharts_1.XAxis dataKey="date"/>
                  <recharts_1.YAxis />
                  <recharts_1.Tooltip />
                  <recharts_1.Line type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2}/>
                </recharts_1.LineChart>
              </recharts_1.ResponsiveContainer>) : (<div className="flex h-full items-center justify-center text-slate-600 dark:text-slate-400">
                No revenue data yet
              </div>)}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Calls Per Month
          </h2>
          <div className="mt-4 h-64">
            {chartData.length > 0 ? (<recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.BarChart data={chartData}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                  <recharts_1.XAxis dataKey="date"/>
                  <recharts_1.YAxis />
                  <recharts_1.Tooltip />
                  <recharts_1.Bar dataKey="calls" fill="#0ea5e9"/>
                </recharts_1.BarChart>
              </recharts_1.ResponsiveContainer>) : (<div className="flex h-full items-center justify-center text-slate-600 dark:text-slate-400">
                No call data yet
              </div>)}
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Transaction Status Breakdown
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900">
            <p className="text-sm text-green-700 dark:text-green-300">Confirmed</p>
            <p className="mt-2 text-2xl font-bold text-green-900 dark:text-green-100">
              {transactions?.filter(tx => tx.status === 'confirmed').length || 0}
            </p>
          </div>
          <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">Pending</p>
            <p className="mt-2 text-2xl font-bold text-yellow-900 dark:text-yellow-100">
              {transactions?.filter(tx => tx.status === 'pending').length || 0}
            </p>
          </div>
          <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900">
            <p className="text-sm text-red-700 dark:text-red-300">Failed</p>
            <p className="mt-2 text-2xl font-bold text-red-900 dark:text-red-100">
              {transactions?.filter(tx => tx.status === 'failed').length || 0}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Top Consumers
        </h2>
        <div className="mt-4">
          {transactions && transactions.length > 0 ? (<div className="space-y-3">
              {Object.entries(transactions.reduce((acc, tx) => {
                if (tx.status === 'confirmed') {
                    acc[tx.senderAddress] = (acc[tx.senderAddress] || 0) + parseFloat(tx.amount);
                }
                return acc;
            }, {}))
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([address, amount]) => (<div key={address} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <code className="text-sm text-slate-600 dark:text-slate-400">
                      {address.slice(0, 8)}...{address.slice(-8)}
                    </code>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      ${amount.toFixed(2)} USDC
                    </span>
                  </div>))}
            </div>) : (<div className="flex h-32 items-center justify-center text-slate-600 dark:text-slate-400">
              No consumer data yet
            </div>)}
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map