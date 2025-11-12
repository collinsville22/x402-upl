'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { facilitatorAPI, Transaction as APITransaction } from '@/lib/api';
import { useWalletStore } from '@/store/wallet';
import { exportToCSV, exportToJSON, formatTransactionsForExport, generateFilename } from '@/lib/export';

interface Transaction {
  id: string;
  serviceName: string;
  amount: number;
  status: 'success' | 'failed' | 'pending';
  timestamp: Date;
  signature: string;
}

type StatusFilter = 'all' | 'success' | 'failed' | 'pending';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const wallet = useWalletStore((state) => state.publicKey);

  useEffect(() => {
    async function fetchTransactions() {
      if (!wallet) {
        setLoading(false);
        return;
      }

      try {
        const apiTransactions = await facilitatorAPI.getTransactions({
          agentId: wallet.toString(),
          limit: 100,
        });

        const formattedTransactions: Transaction[] = apiTransactions.map((tx: APITransaction) => ({
          id: tx.id,
          serviceName: tx.serviceId || 'Unknown Service',
          amount: parseFloat(tx.amount),
          status: tx.status === 'confirmed' ? 'success' : tx.status === 'failed' ? 'failed' : 'pending',
          timestamp: new Date(tx.timestamp),
          signature: tx.signature,
        }));

        setTransactions(formattedTransactions);
      } catch (error) {

      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
    const interval = setInterval(fetchTransactions, 30000);

    return () => clearInterval(interval);
  }, [wallet]);

  useEffect(() => {
    let filtered = transactions;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(tx =>
        tx.signature.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.serviceName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  }, [transactions, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportCSV = () => {
    const exportData = formatTransactionsForExport(
      filteredTransactions.map(tx => ({
        id: tx.id,
        signature: tx.signature,
        amount: tx.amount.toString(),
        token: 'USDC',
        senderAddress: 'N/A',
        recipientAddress: wallet?.toString() || '',
        serviceId: tx.serviceName,
        status: tx.status === 'success' ? 'confirmed' : tx.status,
        timestamp: tx.timestamp.toISOString(),
        settledAt: null
      }))
    );
    exportToCSV(exportData, generateFilename('transactions', 'csv'));
  };

  const handleExportJSON = () => {
    const exportData = formatTransactionsForExport(
      filteredTransactions.map(tx => ({
        id: tx.id,
        signature: tx.signature,
        amount: tx.amount.toString(),
        token: 'USDC',
        senderAddress: 'N/A',
        recipientAddress: wallet?.toString() || '',
        serviceId: tx.serviceName,
        status: tx.status === 'success' ? 'confirmed' : tx.status,
        timestamp: tx.timestamp.toISOString(),
        settledAt: null
      }))
    );
    exportToJSON(exportData, generateFilename('transactions', 'json'));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Transactions</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          View and filter your transaction history
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              statusFilter === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('success')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              statusFilter === 'success'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            Success
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              statusFilter === 'pending'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              statusFilter === 'failed'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            Failed
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search by signature or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 pl-10 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white sm:w-64"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {filteredTransactions.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow dark:bg-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Showing {paginatedTransactions.length} of {filteredTransactions.length} transactions
          </p>
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
        </div>
      )}

      <div className="rounded-lg bg-white shadow dark:bg-slate-800">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-slate-900 dark:text-white">
                Loading transactions...
              </p>
            </div>
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Signature
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {paginatedTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                      {tx.serviceName}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                      ${tx.amount.toFixed(6)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          tx.status === 'success'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : tx.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {format(tx.timestamp, 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <code className="text-xs text-slate-600 dark:text-slate-400">
                        {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                      </code>
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
                No transactions yet
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Transactions will appear here as they occur
              </p>
            </div>
          </div>
        )}

        {filteredTransactions.length > itemsPerPage && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-200 px-6 py-3 dark:border-slate-700">
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Next
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Page {currentPage} of {totalPages}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
