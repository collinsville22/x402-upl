"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletInfoTool = void 0;
const base_js_1 = require("./base.js");
class WalletInfoTool extends base_js_1.BaseTool {
    client;
    constructor(client) {
        super({
            name: 'get_wallet_info',
            description: 'Get current wallet information including balances, spending stats, and payment history. Shows SOL balance, spending limits, and recent payment activity.',
            parameters: {
                include_history: {
                    type: 'boolean',
                    description: 'Include recent payment history (default: false)',
                },
                history_limit: {
                    type: 'number',
                    description: 'Number of recent payments to include (default: 10)',
                },
            },
            required: [],
        });
        this.client = client;
    }
    async execute(args, context) {
        const startTime = performance.now();
        try {
            this.validateArgs(args);
            const balance = await this.client.getBalance('SOL');
            const metrics = this.client.getMetrics();
            const spentThisHour = this.client.getSpentThisHour();
            const remainingBudget = this.client.getRemainingHourlyBudget();
            const result = {
                address: this.client.getWalletAddress(),
                balance: {
                    SOL: balance,
                },
                spending: {
                    spentThisHour,
                    remainingBudget,
                    totalSpent: metrics.totalSpent,
                },
                metrics: {
                    totalEarned: metrics.totalEarned,
                    netProfit: metrics.netProfit,
                    transactionCount: metrics.transactionCount,
                    averageCostPerInference: metrics.averageCostPerInference,
                },
            };
            if (args.include_history) {
                const limit = args.history_limit || 10;
                result.recentPayments = this.client.getPaymentHistory(limit);
            }
            const endTime = performance.now();
            return {
                success: true,
                result,
                latencyMs: endTime - startTime,
                cost: 0,
            };
        }
        catch (error) {
            const endTime = performance.now();
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                latencyMs: endTime - startTime,
            };
        }
    }
}
exports.WalletInfoTool = WalletInfoTool;
//# sourceMappingURL=x402-wallet-info.js.map