'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { facilitatorAPI } from '@/lib/api';
import { useWalletStore } from '@/store/wallet';
import { format } from 'date-fns';
import { useState } from 'react';
import { exportToCSV, exportToJSON, formatSettlementsForExport, generateFilename } from '@/lib/export';

export default function SettlementsPage() {
  const wallet = useWalletStore((state) => state.publicKey);
  const [requestingSettlement, setRequestingSettlement] = useState(false);

  const { data: settlementHistory, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['settlement-history', wallet],
    queryFn: async () => {
      if (!wallet) return [];
      return await facilitatorAPI.getSettlementHistory(wallet, 50);
    },
    enabled: !!wallet,
    refetchInterval: 30000,
  });

  const { data: pendingSettlement, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['pending-settlement', wallet],
    queryFn: async () => {
      if (!wallet) return null;
      return await facilitatorAPI.getPendingSettlement(wallet);
    },
    enabled: !!wallet,
    refetchInterval: 30000,
  });

  const settlementMutation = useMutation({
    mutationFn: async (params: { merchantWallet: string; serviceId: string }) => {
      return await facilitatorAPI.requestSettlement({
        ...params,
        settlementType: 'manual',
      });
    },
    onSuccess: () => {
      refetchHistory();
      refetchPending();
      setRequestingSettlement(false);
    },
    onError: (error) => {
      setRequestingSettlement(false);
      alert(`Settlement request failed: ${error.message}`);
    },
  });

  const handleRequestSettlement = async () => {
    if (!wallet || !pendingSettlement || pendingSettlement.transactionCount === 0) return;

    setRequestingSettlement(true);
    settlementMutation.mutate({
      merchantWallet: wallet,
      serviceId: 'default',
    });
  };

  const handleExportCSV = () => {
    if (!settlementHistory) return;
    const exportData = formatSettlementsForExport(settlementHistory);
    exportToCSV(exportData, generateFilename('settlements', 'csv'));
  };

  const handleExportJSON = () => {
    if (!settlementHistory) return;
    const exportData = formatSettlementsForExport(settlementHistory);
    exportToJSON(exportData, generateFilename('settlements', 'json'));
  };

  if (!wallet) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-slate-900 dark:text-white">
            No Wallet Connected
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Connect your wallet to view settlements
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settlements</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Manage your payment settlements and view history
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Pending Settlement
          </h2>
          <button
            onClick={handleRequestSettlement}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            disabled={
              pendingLoading ||
              requestingSettlement ||
              !pendingSettlement ||
              pendingSettlement.transactionCount === 0
            }
          >
            {requestingSettlement ? 'Processing...' : 'Request Settlement'}
          </button>
        </div>

        {pendingLoading ? (
          <div className="mt-4 flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : pendingSettlement && pendingSettlement.transactionCount > 0 ? (
          <div className="mt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400">Transactions</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {pendingSettlement.transactionCount}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Amount</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  ${pendingSettlement.totalAmount.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400">Platform Fee</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  ${pendingSettlement.platformFee.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg bg-primary-50 p-4 dark:bg-primary-900">
                <p className="text-sm text-primary-700 dark:text-primary-300">You Receive</p>
                <p className="mt-1 text-2xl font-bold text-primary-900 dark:text-primary-100">
                  ${pendingSettlement.merchantAmount.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Pending Transactions ({pendingSettlement.transactions.length})
              </h3>
              <div className="mt-3 space-y-2">
                {pendingSettlement.transactions.slice(0, 10).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        ${parseFloat(tx.amount).toFixed(2)} USDC
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {format(new Date(tx.timestamp), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <code className="text-xs text-slate-600 dark:text-slate-400">
                      {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                    </code>
                  </div>
                ))}
                {pendingSettlement.transactions.length > 10 && (
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                    and {pendingSettlement.transactions.length - 10} more...
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-center text-slate-600 dark:text-slate-400">
            No pending settlements
          </p>
        )}
      </div>

      <div className="rounded-lg bg-white shadow dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 p-6 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Settlement History
          </h2>
          {settlementHistory && settlementHistory.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Export CSV
              </button>
              <button
                onClick={handleExportJSON}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Export JSON
              </button>
            </div>
          )}
        </div>

        {historyLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : settlementHistory && settlementHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Transactions
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Platform Fee
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Amount Received
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Transaction
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {settlementHistory.map((settlement) => (
                  <tr key={settlement.id}>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {format(new Date(settlement.requestedAt), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                      {settlement.transactionCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                      ${parseFloat(settlement.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                      ${parseFloat(settlement.platformFee).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                      ${parseFloat(settlement.merchantAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          settlement.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : settlement.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}
                      >
                        {settlement.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {settlement.transactionSignature ? (
                        <code className="text-xs text-slate-600 dark:text-slate-400">
                          {settlement.transactionSignature.slice(0, 8)}...
                          {settlement.transactionSignature.slice(-8)}
                        </code>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-slate-900 dark:text-white">
                No settlement history
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Settlement history will appear here after your first settlement
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
