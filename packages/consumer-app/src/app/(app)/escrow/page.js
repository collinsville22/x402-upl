'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EscrowPage;
const react_1 = require("react");
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
const Input_1 = require("@/components/ui/Input");
const Badge_1 = require("@/components/ui/Badge");
const wallet_1 = require("@/store/wallet");
const escrow_1 = require("@/store/escrow");
const api_1 = require("@/lib/api");
const date_fns_1 = require("date-fns");
function EscrowPage() {
    const wallet = (0, wallet_1.useWalletStore)((state) => state.publicKey);
    const balance = (0, escrow_1.useEscrowStore)((state) => state.balance);
    const setBalance = (0, escrow_1.useEscrowStore)((state) => state.setBalance);
    const setLoading = (0, escrow_1.useEscrowStore)((state) => state.setLoading);
    const [depositAmount, setDepositAmount] = (0, react_1.useState)('');
    const [withdrawAmount, setWithdrawAmount] = (0, react_1.useState)('');
    const [depositLoading, setDepositLoading] = (0, react_1.useState)(false);
    const [withdrawLoading, setWithdrawLoading] = (0, react_1.useState)(false);
    const [transactions, setTransactions] = (0, react_1.useState)([]);
    const [showDeposit, setShowDeposit] = (0, react_1.useState)(false);
    const [showWithdraw, setShowWithdraw] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        async function fetchBalance() {
            if (!wallet)
                return;
            setLoading(true);
            try {
                const data = await api_1.reasoningAPI.getEscrowBalance(wallet.toString());
                if (data.success) {
                    setBalance(data.balance);
                    if (data.transactions) {
                        setTransactions(data.transactions);
                    }
                }
            }
            catch (err) {
                console.error('Failed to fetch escrow balance:', err);
            }
            finally {
                setLoading(false);
            }
        }
        fetchBalance();
        const interval = setInterval(fetchBalance, 30000);
        return () => clearInterval(interval);
    }, [wallet, setBalance, setLoading]);
    const handleDeposit = async () => {
        if (!wallet || !depositAmount)
            return;
        const amount = parseFloat(depositAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        setDepositLoading(true);
        try {
            // In production, this would trigger Phantom wallet
            const mockSignature = 'mock_signature_' + Date.now();
            const response = await api_1.reasoningAPI.depositEscrow(wallet.toString(), amount, mockSignature);
            if (response.success) {
                setBalance(response.balance);
                setDepositAmount('');
                setShowDeposit(false);
                alert('Deposit successful!');
            }
        }
        catch (err) {
            console.error('Failed to deposit:', err);
            alert('Deposit failed. Please try again.');
        }
        finally {
            setDepositLoading(false);
        }
    };
    const handleWithdraw = async () => {
        if (!wallet || !withdrawAmount)
            return;
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        if (amount > balance.available) {
            alert('Insufficient available balance');
            return;
        }
        setWithdrawLoading(true);
        try {
            const response = await api_1.reasoningAPI.withdrawEscrow(wallet.toString(), amount);
            if (response.success) {
                setBalance(response.balance);
                setWithdrawAmount('');
                setShowWithdraw(false);
                alert('Withdrawal successful!');
            }
        }
        catch (err) {
            console.error('Failed to withdraw:', err);
            alert('Withdrawal failed. Please try again.');
        }
        finally {
            setWithdrawLoading(false);
        }
    };
    const getTransactionBadge = (type) => {
        const variants = {
            deposit: 'success',
            withdraw: 'warning',
            workflow_payment: 'info',
            workflow_refund: 'success',
        };
        return (<Badge_1.Badge variant={variants[type]}>
        {type.replace('_', ' ')}
      </Badge_1.Badge>);
    };
    return (<div className="space-y-6">
      {/* Header */}
      <div className="border-b border-x402-border pb-6">
        <h1 className="text-3xl font-bold tracking-tighter text-white">Escrow Management</h1>
        <p className="mt-1 text-x402-text-secondary">
          Manage your workflow payment balance
        </p>
      </div>

      {/* Balance Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card_1.Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Available Balance</h3>
          <p className="mt-2 text-4xl font-bold text-white">
            {balance.available.toFixed(4)}
            <span className="ml-2 text-xl text-x402-text-tertiary">SOL</span>
          </p>
        </Card_1.Card>

        <Card_1.Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Reserved</h3>
          <p className="mt-2 text-4xl font-bold text-white">
            {balance.reserved.toFixed(4)}
            <span className="ml-2 text-xl text-x402-text-tertiary">SOL</span>
          </p>
          <p className="mt-2 text-xs text-x402-text-muted">
            Locked for active workflows
          </p>
        </Card_1.Card>

        <Card_1.Card className="p-6">
          <h3 className="text-sm font-medium text-x402-text-tertiary">Total Balance</h3>
          <p className="mt-2 text-4xl font-bold text-white">
            {balance.total.toFixed(4)}
            <span className="ml-2 text-xl text-x402-text-tertiary">SOL</span>
          </p>
        </Card_1.Card>
      </div>

      {/* Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Deposit */}
        <Card_1.Card className="p-6">
          <h2 className="text-lg font-semibold text-white">Deposit</h2>
          <p className="mt-1 text-sm text-x402-text-tertiary">
            Add SOL to your escrow balance
          </p>

          {!showDeposit ? (<Button_1.Button variant="primary" onClick={() => setShowDeposit(true)} className="mt-4 w-full">
              Deposit SOL
            </Button_1.Button>) : (<div className="mt-4 space-y-4">
              <Input_1.Input type="number" step="0.01" min="0.01" placeholder="Amount in SOL" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}/>
              <div className="flex gap-3">
                <Button_1.Button variant="primary" onClick={handleDeposit} loading={depositLoading} disabled={!depositAmount} className="flex-1">
                  Confirm Deposit
                </Button_1.Button>
                <Button_1.Button variant="secondary" onClick={() => {
                setShowDeposit(false);
                setDepositAmount('');
            }}>
                  Cancel
                </Button_1.Button>
              </div>
              <p className="text-xs text-x402-text-muted">
                * In production, this would trigger your Phantom/Solflare wallet
              </p>
            </div>)}
        </Card_1.Card>

        {/* Withdraw */}
        <Card_1.Card className="p-6">
          <h2 className="text-lg font-semibold text-white">Withdraw</h2>
          <p className="mt-1 text-sm text-x402-text-tertiary">
            Withdraw SOL from your escrow balance
          </p>

          {!showWithdraw ? (<Button_1.Button variant="secondary" onClick={() => setShowWithdraw(true)} disabled={balance.available === 0} className="mt-4 w-full">
              Withdraw SOL
            </Button_1.Button>) : (<div className="mt-4 space-y-4">
              <Input_1.Input type="number" step="0.01" min="0.01" max={balance.available} placeholder="Amount in SOL" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}/>
              <p className="text-xs text-x402-text-muted">
                Available: {balance.available.toFixed(4)} SOL
              </p>
              <div className="flex gap-3">
                <Button_1.Button variant="primary" onClick={handleWithdraw} loading={withdrawLoading} disabled={!withdrawAmount} className="flex-1">
                  Confirm Withdrawal
                </Button_1.Button>
                <Button_1.Button variant="secondary" onClick={() => {
                setShowWithdraw(false);
                setWithdrawAmount('');
            }}>
                  Cancel
                </Button_1.Button>
              </div>
            </div>)}
        </Card_1.Card>
      </div>

      {/* Transaction History */}
      <Card_1.Card className="p-6">
        <h2 className="text-lg font-semibold text-white">Transaction History</h2>
        {transactions.length === 0 ? (<p className="mt-4 text-center text-sm text-x402-text-tertiary">
            No transactions yet
          </p>) : (<div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-x402-border text-left text-sm">
                  <th className="pb-3 font-medium text-x402-text-tertiary">Date</th>
                  <th className="pb-3 font-medium text-x402-text-tertiary">Type</th>
                  <th className="pb-3 font-medium text-x402-text-tertiary">Amount</th>
                  <th className="pb-3 font-medium text-x402-text-tertiary">Workflow</th>
                  <th className="pb-3 font-medium text-x402-text-tertiary">Signature</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (<tr key={tx.id} className="border-b border-x402-border text-sm">
                    <td className="py-4 text-x402-text-secondary">
                      {(0, date_fns_1.format)(new Date(tx.timestamp), 'MMM d, h:mm a')}
                    </td>
                    <td className="py-4">{getTransactionBadge(tx.type)}</td>
                    <td className="py-4 font-mono text-white">
                      {tx.type === 'withdraw' || tx.type === 'workflow_payment' ? '-' : '+'}
                      {tx.amount.toFixed(4)} SOL
                    </td>
                    <td className="py-4">
                      {tx.workflowId ? (<a href={`/workflows/${tx.workflowId}`} className="text-x402-accent hover:underline">
                          {tx.workflowId.slice(0, 8)}...
                        </a>) : (<span className="text-x402-text-muted">—</span>)}
                    </td>
                    <td className="py-4 font-mono text-xs text-x402-text-muted">
                      {tx.signature ? `${tx.signature.slice(0, 12)}...` : '—'}
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>)}
      </Card_1.Card>
    </div>);
}
//# sourceMappingURL=page.js.map