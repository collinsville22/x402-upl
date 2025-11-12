'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { useWalletStore } from '@/store/wallet';
import { useEscrowStore } from '@/store/escrow';
import { reasoningAPI } from '@/lib/api';

const EXAMPLES = [
  'Deploy a new SPL token on Solana with 1M supply',
  'Analyze market sentiment for $SOL over the last 24 hours',
  'Swap 1 SOL for USDC using Jupiter',
  'Get real-time price data for top 10 tokens',
  'Execute a complex DeFi strategy across multiple protocols',
];

export default function NewWorkflowPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.publicKey);
  const balance = useEscrowStore((state) => state.balance);

  const [input, setInput] = useState('');
  const [maxBudget, setMaxBudget] = useState(0.1);
  const [maxTime, setMaxTime] = useState(300);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!wallet) {
      setError('Please connect your wallet first');
      return;
    }

    if (!input.trim() || input.length < 10) {
      setError('Please provide a detailed description (at least 10 characters)');
      return;
    }

    if (maxBudget > balance.available) {
      setError('Budget exceeds available escrow balance');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await reasoningAPI.createWorkflow({
        userId: wallet.toString(),
        input: input.trim(),
        maxCost: maxBudget,
        maxTime: maxTime * 1000,
      });

      if (response.success && response.workflowId) {
        router.push(`/workflows/${response.workflowId}`);
      } else {
        setError(response.error || 'Failed to create workflow');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow');
    } finally {
      setLoading(false);
    }
  };

  const charCount = input.length;
  const charMin = 10;
  const charMax = 5000;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-x402-border pb-6">
        <h1 className="text-3xl font-bold tracking-tighter text-white">
          Create Workflow
        </h1>
        <p className="mt-1 text-x402-text-secondary">
          Describe what you want to accomplish in natural language
        </p>
      </div>

      {/* Main Form */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Natural Language Input */}
          <Card className="p-6">
            <label className="mb-2 block text-sm font-semibold text-white">
              What do you want to accomplish?
            </label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Example: Deploy a new SPL token on Solana with 1M supply and liquidity pool on Raydium..."
              className="min-h-[200px] font-mono text-sm"
              error={error}
            />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-x402-text-tertiary">
                Use @ to mention specific integrations (e.g., @coinbase, @switchboard)
              </span>
              <span
                className={
                  charCount < charMin
                    ? 'text-x402-error'
                    : charCount > charMax
                    ? 'text-x402-error'
                    : 'text-x402-text-tertiary'
                }
              >
                {charCount} / {charMax}
              </span>
            </div>
          </Card>

          {/* Examples */}
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-white">Try an example:</h3>
            <div className="mt-4 space-y-2">
              {EXAMPLES.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setInput(example)}
                  className="w-full rounded-lg border border-x402-border bg-x402-surface px-4 py-3 text-left text-sm text-x402-text-secondary transition-all hover:border-x402-accent/30 hover:bg-x402-surface-hover hover:text-white"
                >
                  {example}
                </button>
              ))}
            </div>
          </Card>

          {/* Advanced Options */}
          <Card className="p-6">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between text-sm font-semibold text-white"
            >
              Advanced Options
              <svg
                className={`h-5 w-5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showAdvanced && (
              <div className="mt-6 space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-x402-text-secondary">
                    Max Execution Time: {maxTime}s
                  </label>
                  <input
                    type="range"
                    min="60"
                    max="3600"
                    step="60"
                    value={maxTime}
                    onChange={(e) => setMaxTime(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="mt-1 flex justify-between text-xs text-x402-text-tertiary">
                    <span>1 min</span>
                    <span>1 hour</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Budget Control */}
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-white">Budget</h3>
            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-x402-text-secondary">
                Max Cost: {maxBudget.toFixed(4)} SOL
              </label>
              <input
                type="range"
                min="0.01"
                max={Math.min(10, balance.available || 0.1)}
                step="0.01"
                value={maxBudget}
                onChange={(e) => setMaxBudget(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-1 flex justify-between text-xs text-x402-text-tertiary">
                <span>0.01 SOL</span>
                <span>{Math.min(10, balance.available || 0.1).toFixed(2)} SOL</span>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-x402-border bg-x402-black p-4">
              <div className="flex justify-between text-sm">
                <span className="text-x402-text-tertiary">Available Balance</span>
                <span className="font-mono font-semibold text-white">
                  {balance.available.toFixed(4)} SOL
                </span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-x402-text-tertiary">Reserved</span>
                <span className="font-mono font-semibold text-x402-text-tertiary">
                  {balance.reserved.toFixed(4)} SOL
                </span>
              </div>
            </div>

            {balance.available < 0.01 && (
              <div className="mt-4 rounded-lg border border-x402-warning/20 bg-x402-warning/10 p-3 text-xs text-x402-warning">
                Low balance. Deposit SOL to your escrow to create workflows.
              </div>
            )}
          </Card>

          {/* Estimated Cost Breakdown */}
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-white">Cost Estimate</h3>
            <p className="mt-2 text-xs text-x402-text-tertiary">
              Actual costs will be calculated after AI planning
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-x402-text-tertiary">Service Calls</span>
                <span className="text-white">~${(maxBudget * 0.7 * 180).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-x402-text-tertiary">Platform Fee (5%)</span>
                <span className="text-white">~${(maxBudget * 0.05 * 180).toFixed(2)}</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-x402-border pt-2 text-sm font-semibold">
                <span className="text-white">Total (Max)</span>
                <span className="text-white">{maxBudget.toFixed(4)} SOL</span>
              </div>
            </div>
          </Card>

          {/* Submit Button */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            loading={loading}
            disabled={!input.trim() || charCount < charMin || charCount > charMax || !wallet}
            className="w-full"
          >
            {loading ? 'Creating Workflow...' : 'Create Workflow'}
          </Button>
        </div>
      </div>
    </div>
  );
}
