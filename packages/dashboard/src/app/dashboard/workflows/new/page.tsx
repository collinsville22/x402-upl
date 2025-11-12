'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletStore } from '@/store/wallet';

interface EscrowBalance {
  available: number;
  reserved: number;
  total: number;
}

export default function NewWorkflowPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.publicKey);

  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [maxBudget, setMaxBudget] = useState(1.0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxTime, setMaxTime] = useState(300); // seconds
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escrowBalance, setEscrowBalance] = useState<EscrowBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  // Fetch escrow balance
  useEffect(() => {
    async function fetchBalance() {
      if (!wallet) {
        setLoadingBalance(false);
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_REASONING_URL || 'http://localhost:5000'}/escrow/${wallet.toString()}/balance`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setEscrowBalance(data.balance);
          }
        }
      } catch (err) {
        console.error('Failed to fetch escrow balance:', err);
      } finally {
        setLoadingBalance(false);
      }
    }

    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [wallet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!wallet) {
      setError('Please connect your wallet first');
      setLoading(false);
      return;
    }

    if (escrowBalance && maxBudget > escrowBalance.available) {
      setError(`Insufficient escrow balance. Available: ${escrowBalance.available.toFixed(4)} SOL`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_REASONING_URL || 'http://localhost:5000'}/workflows/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: wallet.toString(),
            input: naturalLanguageInput,
            maxCost: maxBudget,
            maxTime: maxTime * 1000, // convert to ms
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create workflow');
      }

      // Navigate to workflow detail page
      router.push(`/dashboard/workflows/${data.workflow.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="border-b border-[#2A2A2A] pb-6">
          <h1 className="text-3xl font-bold text-white">Create Workflow</h1>
          <p className="mt-2 text-[#888888]">
            Describe what you want to accomplish in natural language. Our AI will plan and execute it autonomously.
          </p>
        </div>

        {/* Escrow Balance Widget */}
        <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-[#888888]">Escrow Balance</h3>
              {loadingBalance ? (
                <p className="mt-1 text-2xl font-bold text-white">Loading...</p>
              ) : escrowBalance ? (
                <>
                  <p className="mt-1 text-2xl font-bold text-white">
                    {escrowBalance.available.toFixed(4)} <span className="text-sm text-[#888888]">SOL</span>
                  </p>
                  {escrowBalance.reserved > 0 && (
                    <p className="mt-1 text-xs text-[#888888]">
                      {escrowBalance.reserved.toFixed(4)} SOL reserved in active workflows
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-[#888888]">
                  {wallet ? 'No escrow wallet found' : 'Connect wallet to view balance'}
                </p>
              )}
            </div>
            <button
              onClick={() => router.push('/dashboard/escrow')}
              className="rounded-lg border border-[#00FF88] px-4 py-2 text-sm font-medium text-[#00FF88] transition-colors hover:bg-[#00FF88] hover:text-[#0A0A0A]"
            >
              Manage Escrow
            </button>
          </div>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Natural Language Input */}
          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
            <label htmlFor="input" className="block text-sm font-medium text-white">
              What do you want to accomplish?
            </label>
            <textarea
              id="input"
              value={naturalLanguageInput}
              onChange={(e) => setNaturalLanguageInput(e.target.value)}
              required
              minLength={10}
              maxLength={5000}
              rows={8}
              className="mt-3 block w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 text-white placeholder-[#555555] transition-colors focus:border-[#00FF88] focus:outline-none focus:ring-1 focus:ring-[#00FF88]"
              placeholder="Example: I need to analyze the top 100 trending tokens on Solana, get detailed market data for each, and generate a comprehensive report ranking them by risk/reward ratio..."
            />
            <p className="mt-2 text-xs text-[#888888]">
              {naturalLanguageInput.length} / 5000 characters
            </p>
          </div>

          {/* Budget Control */}
          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
            <label htmlFor="budget" className="block text-sm font-medium text-white">
              Maximum Budget
            </label>
            <div className="mt-3">
              <input
                type="range"
                id="budget"
                min="0.01"
                max="10"
                step="0.01"
                value={maxBudget}
                onChange={(e) => setMaxBudget(parseFloat(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#2A2A2A] accent-[#00FF88]"
                style={{
                  background: `linear-gradient(to right, #00FF88 0%, #00FF88 ${(maxBudget / 10) * 100}%, #2A2A2A ${(maxBudget / 10) * 100}%, #2A2A2A 100%)`
                }}
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-2xl font-bold text-white">
                  {maxBudget.toFixed(2)} <span className="text-sm text-[#888888]">SOL</span>
                </span>
                <span className="text-xs text-[#888888]">Max: 10.00 SOL</span>
              </div>
              {escrowBalance && maxBudget > escrowBalance.available && (
                <p className="mt-2 text-sm text-red-400">
                  Budget exceeds available escrow balance
                </p>
              )}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111]">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-[#1A1A1A]"
            >
              <span className="text-sm font-medium text-white">Advanced Options</span>
              <svg
                className={`h-5 w-5 text-[#888888] transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAdvanced && (
              <div className="border-t border-[#2A2A2A] p-6">
                <div>
                  <label htmlFor="maxTime" className="block text-sm font-medium text-white">
                    Maximum Execution Time
                  </label>
                  <div className="mt-3 flex gap-3">
                    <input
                      type="number"
                      id="maxTime"
                      value={maxTime}
                      onChange={(e) => setMaxTime(parseInt(e.target.value) || 0)}
                      min="30"
                      max="3600"
                      className="block w-32 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-2 text-white transition-colors focus:border-[#00FF88] focus:outline-none focus:ring-1 focus:ring-[#00FF88]"
                    />
                    <span className="flex items-center text-sm text-[#888888]">seconds</span>
                  </div>
                  <p className="mt-2 text-xs text-[#888888]">
                    Workflow will be cancelled if it exceeds this time limit
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || !wallet || (escrowBalance !== null && maxBudget > escrowBalance.available)}
              className="flex-1 rounded-lg bg-[#00FF88] px-6 py-3 font-semibold text-[#0A0A0A] transition-all hover:bg-[#00DD77] focus:outline-none focus:ring-2 focus:ring-[#00FF88] focus:ring-offset-2 focus:ring-offset-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Creating Workflow...' : 'Create Workflow'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-[#2A2A2A] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#2A2A2A] focus:ring-offset-2 focus:ring-offset-[#0A0A0A]"
            >
              Cancel
            </button>
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
            <h3 className="text-sm font-semibold text-white">How it works</h3>
            <ol className="mt-3 space-y-2 text-sm text-[#888888]">
              <li className="flex gap-3">
                <span className="font-mono text-[#00FF88]">1.</span>
                <span>AI analyzes your request and creates an execution plan</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-[#00FF88]">2.</span>
                <span>You review and approve the plan with cost estimates</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-[#00FF88]">3.</span>
                <span>Workflow executes autonomously using your escrow balance</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-[#00FF88]">4.</span>
                <span>Real-time progress updates via WebSocket streaming</span>
              </li>
            </ol>
          </div>
        </form>
      </div>
    </div>
  );
}
