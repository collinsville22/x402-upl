'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TransactionsPage;
const Card_1 = require("@/components/ui/Card");
function TransactionsPage() {
    return (<div className="space-y-6">
      <div className="border-b border-x402-border pb-6">
        <h1 className="text-3xl font-bold tracking-tighter text-white">Transactions</h1>
        <p className="mt-1 text-x402-text-secondary">
          View your transaction history
        </p>
      </div>

      <Card_1.Card className="p-12">
        <div className="text-center">
          <p className="text-lg font-medium text-white">No transactions yet</p>
          <p className="mt-1 text-sm text-x402-text-tertiary">
            Transaction history will appear here
          </p>
        </div>
      </Card_1.Card>
    </div>);
}
//# sourceMappingURL=page.js.map