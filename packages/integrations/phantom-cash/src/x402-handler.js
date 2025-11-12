import { PhantomCashX402Error } from './phantom-cash-x402-client.js';
export class X402Handler {
    client;
    constructor(client) {
        this.client = client;
    }
    async callService(call) {
        try {
            let result;
            switch (call.method) {
                case 'GET':
                    result = await this.client.get(call.url, call.params);
                    break;
                case 'POST':
                    result = await this.client.post(call.url, call.body, call.params);
                    break;
                default:
                    return {
                        success: false,
                        error: `Unsupported HTTP method: ${call.method}`,
                        errorCode: 'UNSUPPORTED_METHOD',
                    };
            }
            return {
                success: true,
                data: result,
            };
        }
        catch (error) {
            if (error instanceof PhantomCashX402Error) {
                return {
                    success: false,
                    error: error.message,
                    errorCode: error.code,
                };
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                errorCode: 'UNKNOWN_ERROR',
            };
        }
    }
    getPaymentHistory() {
        return this.client.getPaymentHistory().map((record) => ({
            signature: record.signature,
            amount: record.amount,
            currency: record.asset,
            timestamp: record.timestamp,
        }));
    }
    getTotalSpent() {
        return this.client.getMetrics().totalSpent;
    }
    getMetrics() {
        return this.client.getMetrics();
    }
    async getWalletAddress() {
        return this.client.getWalletAddress();
    }
    async getCashBalance() {
        return this.client.getCashBalance();
    }
    async getSolBalance() {
        return this.client.getSolBalance();
    }
    getSpentThisHour() {
        return this.client.getSpentThisHour();
    }
    getRemainingHourlyBudget() {
        return this.client.getRemainingHourlyBudget();
    }
}
//# sourceMappingURL=x402-handler.js.map