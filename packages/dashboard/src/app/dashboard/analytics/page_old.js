'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AnalyticsPage;
const react_1 = require("react");
const recharts_1 = require("recharts");
const api_1 = require("@/lib/api");
const wallet_1 = require("@/store/wallet");
const date_fns_1 = require("date-fns");
function AnalyticsPage() {
    const [earningsData, setEarningsData] = (0, react_1.useState)([]);
    const [transactionsData, setTransactionsData] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const wallet = (0, wallet_1.useWalletStore)((state) => state.publicKey);
    (0, react_1.useEffect)(() => {
        async function fetchAnalytics() {
            if (!wallet) {
                setLoading(false);
                return;
            }
            try {
                const transactions = await api_1.facilitatorAPI.getTransactions({
                    agentId: wallet.toString(),
                    limit: 1000,
                });
                const monthlyStats = new Map();
                for (let i = 5; i >= 0; i--) {
                    const date = (0, date_fns_1.subMonths)(new Date(), i);
                    const key = (0, date_fns_1.format)(date, 'MMM');
                    monthlyStats.set(key, { earnings: 0, count: 0 });
                }
                transactions.forEach((tx) => {
                    const txDate = new Date(tx.timestamp);
                    const key = (0, date_fns_1.format)(txDate, 'MMM');
                    const stats = monthlyStats.get(key);
                    if (stats && tx.status === 'confirmed') {
                        stats.earnings += parseFloat(tx.amount);
                        stats.count += 1;
                    }
                });
                const chartData = Array.from(monthlyStats.entries()).map(([date, stats]) => ({
                    date,
                    earnings: stats.earnings,
                    count: stats.count,
                }));
                setEarningsData(chartData);
                setTransactionsData(chartData);
            }
            catch (error) {
            }
            finally {
                setLoading(false);
            }
        }
        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 60000);
        return () => clearInterval(interval);
    }, [wallet]);
    return (<div className="space-y-6">
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
            {loading ? (<div className="flex h-full items-center justify-center text-slate-600 dark:text-slate-400">
                Loading...
              </div>) : earningsData.length === 0 ? (<div className="flex h-full items-center justify-center text-slate-600 dark:text-slate-400">
                No earnings data yet
              </div>) : (<recharts_1.ResponsiveContainer width="100%" height="100%">
              <recharts_1.LineChart data={earningsData}>
                <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                <recharts_1.XAxis dataKey="date"/>
                <recharts_1.YAxis />
                <recharts_1.Tooltip />
                <recharts_1.Line type="monotone" dataKey="earnings" stroke="#0ea5e9" strokeWidth={2}/>
              </recharts_1.LineChart>
            </recharts_1.ResponsiveContainer>)}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Transactions Per Month
          </h2>
          <div className="mt-4 h-64">
            {loading ? (<div className="flex h-full items-center justify-center text-slate-600 dark:text-slate-400">
                Loading...
              </div>) : transactionsData.length === 0 ? (<div className="flex h-full items-center justify-center text-slate-600 dark:text-slate-400">
                No transaction data yet
              </div>) : (<recharts_1.ResponsiveContainer width="100%" height="100%">
              <recharts_1.BarChart data={transactionsData}>
                <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                <recharts_1.XAxis dataKey="date"/>
                <recharts_1.YAxis />
                <recharts_1.Tooltip />
                <recharts_1.Bar dataKey="count" fill="#0ea5e9"/>
              </recharts_1.BarChart>
            </recharts_1.ResponsiveContainer>)}
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
    </div>);
}
//# sourceMappingURL=page_old.js.map