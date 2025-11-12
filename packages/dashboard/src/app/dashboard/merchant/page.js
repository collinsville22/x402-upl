'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MerchantDashboardPage;
const react_1 = require("react");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("@/lib/api");
const wallet_1 = require("@/store/wallet");
const date_fns_1 = require("date-fns");
const sonner_1 = require("sonner");
function StatCard({ title, value, subtitle, }) {
    return (<div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
          {subtitle && (<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>)}
        </div>
      </div>
    </div>);
}
function MerchantDashboardPage() {
    const wallet = (0, wallet_1.useWalletStore)((state) => state.publicKey);
    const [requestingSettlement, setRequestingSettlement] = (0, react_1.useState)(false);
    const { data: stats, isLoading: statsLoading } = (0, react_query_1.useQuery)({
        queryKey: ['merchant-stats', wallet],
        queryFn: async () => {
            if (!wallet)
                return null;
            return await api_1.facilitatorAPI.getMerchantStats(wallet);
        },
        enabled: !!wallet,
        refetchInterval: 30000,
    });
    const { data: recentTransactions, isLoading: txLoading } = (0, react_query_1.useQuery)({
        queryKey: ['recent-transactions', wallet],
        queryFn: async () => {
            if (!wallet)
                return [];
            return await api_1.facilitatorAPI.getRecentTransactions(wallet, 10);
        },
        enabled: !!wallet,
        refetchInterval: 30000,
    });
    const { data: pendingSettlement, isLoading: settlementLoading, refetch: refetchPending } = (0, react_query_1.useQuery)({
        queryKey: ['pending-settlement', wallet],
        queryFn: async () => {
            if (!wallet)
                return null;
            return await api_1.facilitatorAPI.getPendingSettlement(wallet);
        },
        enabled: !!wallet,
        refetchInterval: 30000,
    });
    if (!wallet) {
        return (<div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-slate-900 dark:text-white">
            No Wallet Connected
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Connect your wallet to view merchant dashboard
          </p>
        </div>
      </div>);
    }
    if (statsLoading) {
        return (<div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"/>
      </div>);
    }
    return (<div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Merchant Dashboard</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Overview of your payment settlement activity
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue" value={`$${stats?.totalRevenue.toFixed(2) || '0.00'}`} subtitle="USDC"/>

        <StatCard title="Total Transactions" value={stats?.totalTransactions.toString() || '0'}/>

        <StatCard title="Active Services" value={stats?.activeServices.toString() || '0'}/>

        <StatCard title="Average Transaction" value={`$${stats?.averageTransaction.toFixed(2) || '0.00'}`} subtitle="USDC"/>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Pending Settlement
            </h2>
            <button onClick={async () => {
            if (!wallet || !pendingSettlement)
                return;
            try {
                setRequestingSettlement(true);
                await api_1.facilitatorAPI.requestSettlement({
                    merchantWallet: wallet,
                    serviceId: 'default',
                    settlementType: 'manual'
                });
                sonner_1.toast.success('Settlement requested successfully');
                refetchPending();
            }
            catch (error) {
                sonner_1.toast.error(error instanceof Error ? error.message : 'Settlement request failed');
            }
            finally {
                setRequestingSettlement(false);
            }
        }} disabled={requestingSettlement || settlementLoading || !pendingSettlement || pendingSettlement.transactionCount === 0} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50">
              {requestingSettlement ? 'Requesting...' : 'Request Settlement'}
            </button>
          </div>
          {settlementLoading ? (<div className="mt-4 flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"/>
            </div>) : pendingSettlement && pendingSettlement.transactionCount > 0 ? (<div className="mt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Transactions</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {pendingSettlement.transactionCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total Amount</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  ${pendingSettlement.totalAmount.toFixed(2)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Platform Fee (2%)</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  ${pendingSettlement.platformFee.toFixed(2)} USDC
                </span>
              </div>
              <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">You Receive</span>
                  <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                    ${pendingSettlement.merchantAmount.toFixed(2)} USDC
                  </span>
                </div>
              </div>
            </div>) : (<p className="mt-4 text-center text-slate-600 dark:text-slate-400">
              No pending settlements
            </p>)}
        </div>

        <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Recent Transactions
          </h2>
          {txLoading ? (<div className="mt-4 flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"/>
            </div>) : recentTransactions && recentTransactions.length > 0 ? (<div className="mt-4 space-y-3">
              {recentTransactions.slice(0, 5).map((tx) => (<div key={tx.id} className="flex items-center justify-between border-b border-slate-200 pb-3 last:border-0 dark:border-slate-700">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      ${parseFloat(tx.amount).toFixed(2)} USDC
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(0, date_fns_1.format)(new Date(tx.timestamp), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${tx.status === 'confirmed'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                    {tx.status}
                  </span>
                </div>))}
            </div>) : (<p className="mt-4 text-center text-slate-600 dark:text-slate-400">
              No recent transactions
            </p>)}
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map