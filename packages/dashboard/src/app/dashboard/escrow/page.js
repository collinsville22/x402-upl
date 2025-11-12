'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EscrowPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const wallet_1 = require("@/store/wallet");
const date_fns_1 = require("date-fns");
function EscrowPage() {
    const router = (0, navigation_1.useRouter)();
    const wallet = (0, wallet_1.useWalletStore)((state) => state.publicKey);
    const [balance, setBalance] = (0, react_1.useState)(null);
    const [history, setHistory] = (0, react_1.useState)([]);
    const [escrowInfo, setEscrowInfo] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [depositAmount, setDepositAmount] = (0, react_1.useState)('0.1');
    const [withdrawAmount, setWithdrawAmount] = (0, react_1.useState)('');
    const [depositing, setDepositing] = (0, react_1.useState)(false);
    const [withdrawing, setWithdrawing] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        async function fetchData() {
            if (!wallet) {
                setLoading(false);
                return;
            }
            try {
                // Fetch escrow info
                const infoResponse = await fetch(`${process.env.NEXT_PUBLIC_REASONING_URL || 'http://localhost:5000'}/escrow/address`);
                if (infoResponse.ok) {
                    const infoData = await infoResponse.json();
                    if (infoData.success) {
                        setEscrowInfo(infoData);
                    }
                }
                // Fetch balance
                const balanceResponse = await fetch(`${process.env.NEXT_PUBLIC_REASONING_URL || 'http://localhost:5000'}/escrow/${wallet.toString()}/balance`);
                if (balanceResponse.ok) {
                    const balanceData = await balanceResponse.json();
                    if (balanceData.success) {
                        setBalance(balanceData.balance);
                    }
                }
                // Fetch history
                const historyResponse = await fetch(`${process.env.NEXT_PUBLIC_REASONING_URL || 'http://localhost:5000'}/escrow/${wallet.toString()}/history?limit=50`);
                if (historyResponse.ok) {
                    const historyData = await historyResponse.json();
                    if (historyData.success) {
                        setHistory(historyData.history);
                    }
                }
            }
            catch (err) {
                console.error('Failed to fetch escrow data:', err);
            }
            finally {
                setLoading(false);
            }
        }
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [wallet]);
    const handleDeposit = async () => {
        if (!wallet || !escrowInfo) {
            setError('Wallet not connected or escrow not initialized');
            return;
        }
        setDepositing(true);
        setError(null);
        try {
            const amount = parseFloat(depositAmount);
            if (isNaN(amount) || amount <= 0) {
                throw new Error('Invalid deposit amount');
            }
            // TODO: Integrate with actual Phantom/Solflare wallet
            // For now, show instructions
            setError('Wallet integration pending. Please use CLI or direct transfer for deposits.');
            // The actual implementation would:
            // 1. Create transaction to send SOL to escrow address
            // 2. Sign with Phantom/Solflare
            // 3. Send transaction
            // 4. Call API to record deposit with signature
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Deposit failed');
        }
        finally {
            setDepositing(false);
        }
    };
    const handleWithdraw = async () => {
        if (!wallet || !balance) {
            setError('Wallet not connected or balance not loaded');
            return;
        }
        setWithdrawing(true);
        setError(null);
        try {
            const amount = parseFloat(withdrawAmount);
            if (isNaN(amount) || amount <= 0) {
                throw new Error('Invalid withdrawal amount');
            }
            if (amount > balance.available) {
                throw new Error('Insufficient available balance');
            }
            const response = await fetch(`${process.env.NEXT_PUBLIC_REASONING_URL || 'http://localhost:5000'}/escrow/${wallet.toString()}/withdraw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount,
                    destination: wallet.toString(),
                }),
            });
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Withdrawal failed');
            }
            // Refresh balance
            const balanceResponse = await fetch(`${process.env.NEXT_PUBLIC_REASONING_URL || 'http://localhost:5000'}/escrow/${wallet.toString()}/balance`);
            if (balanceResponse.ok) {
                const balanceData = await balanceResponse.json();
                if (balanceData.success) {
                    setBalance(balanceData.balance);
                }
            }
            setWithdrawAmount('');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Withdrawal failed');
        }
        finally {
            setWithdrawing(false);
        }
    };
    return (<div className="min-h-screen bg-[#0A0A0A] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="border-b border-[#2A2A2A] pb-6">
          <h1 className="text-3xl font-bold text-white">Escrow Wallet</h1>
          <p className="mt-1 text-[#888888]">
            Manage your autonomous workflow execution balance
          </p>
        </div>

        {loading ? (<div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2A2A2A] border-t-[#00FF88]"></div>
              <p className="mt-4 text-sm text-[#888888]">Loading escrow data...</p>
            </div>
          </div>) : (<>
            {/* Balance Cards */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
                <p className="text-sm text-[#888888]">Available Balance</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {balance?.available.toFixed(4) || '0.0000'}
                </p>
                <p className="mt-1 text-xs text-[#888888]">SOL ready for workflows</p>
              </div>
              <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
                <p className="text-sm text-[#888888]">Reserved Balance</p>
                <p className="mt-2 text-3xl font-bold text-yellow-400">
                  {balance?.reserved.toFixed(4) || '0.0000'}
                </p>
                <p className="mt-1 text-xs text-[#888888]">SOL in active workflows</p>
              </div>
              <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
                <p className="text-sm text-[#888888]">Total Balance</p>
                <p className="mt-2 text-3xl font-bold text-[#00FF88]">
                  {balance?.total.toFixed(4) || '0.0000'}
                </p>
                <p className="mt-1 text-xs text-[#888888]">SOL total</p>
              </div>
            </div>

            {/* Escrow Address */}
            {escrowInfo && (<div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
                <h3 className="text-sm font-semibold text-white">Escrow Address</h3>
                <div className="mt-3 flex items-center gap-3">
                  <code className="flex-1 rounded bg-[#0A0A0A] p-3 font-mono text-sm text-[#00FF88]">
                    {escrowInfo.address}
                  </code>
                  <button onClick={() => navigator.clipboard.writeText(escrowInfo.address)} className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#888888] transition-colors hover:bg-[#1A1A1A] hover:text-white">
                    Copy
                  </button>
                </div>
                <p className="mt-2 text-xs text-[#888888]">
                  Network: {escrowInfo.network} • Bot-controlled autonomous wallet
                </p>
              </div>)}

            {/* Deposit & Withdraw */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Deposit */}
              <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
                <h3 className="text-lg font-semibold text-white">Deposit</h3>
                <p className="mt-2 text-sm text-[#888888]">
                  Add SOL to your escrow wallet for autonomous workflows
                </p>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="depositAmount" className="block text-sm font-medium text-white">
                      Amount (SOL)
                    </label>
                    <input type="number" id="depositAmount" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} step="0.01" min="0.01" className="mt-2 block w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 text-white placeholder-[#555555] transition-colors focus:border-[#00FF88] focus:outline-none focus:ring-1 focus:ring-[#00FF88]" placeholder="0.1"/>
                  </div>
                  <button onClick={handleDeposit} disabled={depositing} className="w-full rounded-lg bg-[#00FF88] px-6 py-3 font-semibold text-[#0A0A0A] transition-all hover:bg-[#00DD77] disabled:opacity-50">
                    {depositing ? 'Depositing...' : 'Deposit SOL'}
                  </button>
                </div>
              </div>

              {/* Withdraw */}
              <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
                <h3 className="text-lg font-semibold text-white">Withdraw</h3>
                <p className="mt-2 text-sm text-[#888888]">
                  Withdraw available SOL back to your wallet
                </p>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="withdrawAmount" className="block text-sm font-medium text-white">
                      Amount (SOL)
                    </label>
                    <input type="number" id="withdrawAmount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} step="0.01" min="0.01" max={balance?.available || 0} className="mt-2 block w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 text-white placeholder-[#555555] transition-colors focus:border-[#00FF88] focus:outline-none focus:ring-1 focus:ring-[#00FF88]" placeholder="0.1"/>
                    {balance && (<p className="mt-2 text-xs text-[#888888]">
                        Available: {balance.available.toFixed(4)} SOL
                      </p>)}
                  </div>
                  <button onClick={handleWithdraw} disabled={withdrawing || !balance || parseFloat(withdrawAmount) > balance.available} className="w-full rounded-lg border border-[#00FF88] px-6 py-3 font-semibold text-[#00FF88] transition-all hover:bg-[#00FF88] hover:text-[#0A0A0A] disabled:opacity-50">
                    {withdrawing ? 'Withdrawing...' : 'Withdraw SOL'}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (<div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>)}

            {/* Transaction History */}
            <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
              <h3 className="text-lg font-semibold text-white">Transaction History</h3>
              {history.length === 0 ? (<p className="mt-4 text-center text-sm text-[#888888]">No transactions yet</p>) : (<div className="mt-4 space-y-3">
                  {history.map((tx) => (<div key={tx.id} className="flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${tx.type === 'deposit'
                        ? 'border-green-500/20 bg-green-500/10 text-green-400'
                        : tx.type === 'withdrawal'
                            ? 'border-red-500/20 bg-red-500/10 text-red-400'
                            : 'border-blue-500/20 bg-blue-500/10 text-blue-400'}`}>
                            {tx.type.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-xs text-[#888888]">
                            {(0, date_fns_1.format)(new Date(tx.timestamp), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="mt-2 font-mono text-xs text-[#888888]">
                          {tx.signature.slice(0, 16)}...{tx.signature.slice(-16)}
                        </p>
                        {tx.workflowId && (<button onClick={() => router.push(`/dashboard/workflows/${tx.workflowId}`)} className="mt-1 text-xs text-[#00FF88] hover:underline">
                            View workflow
                          </button>)}
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${tx.type === 'deposit' || tx.type === 'workflow_refund'
                        ? 'text-green-400'
                        : 'text-white'}`}>
                          {tx.type === 'deposit' || tx.type === 'workflow_refund' ? '+' : '-'}
                          {tx.amount.toFixed(4)}
                        </p>
                        <p className="text-xs text-[#888888]">SOL</p>
                      </div>
                    </div>))}
                </div>)}
            </div>

            {/* Info Box */}
            <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
              <h3 className="text-sm font-semibold text-white">How Escrow Works</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#888888]">
                <li className="flex gap-3">
                  <span className="font-mono text-[#00FF88]">•</span>
                  <span>Deposit SOL to enable autonomous workflow execution</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-[#00FF88]">•</span>
                  <span>Workflows reserve funds upon approval, deduct upon completion</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-[#00FF88]">•</span>
                  <span>Reserved balance returns to available if workflow is cancelled</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-[#00FF88]">•</span>
                  <span>Withdraw available balance anytime back to your wallet</span>
                </li>
              </ul>
            </div>
          </>)}
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map