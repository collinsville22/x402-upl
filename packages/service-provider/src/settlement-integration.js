import crypto from 'crypto';
export class SettlementIntegration {
    config;
    pendingTransactions = new Map();
    lastSettlementAt = null;
    constructor(config) {
        this.config = config;
        this.startDailySettlementCheck();
    }
    async handlePaymentVerified(receipt) {
        this.pendingTransactions.set(receipt.signature, receipt);
        await this.recordTransaction(receipt);
        const pendingAmount = this.calculatePendingAmount();
        if (pendingAmount >= this.config.minimumAmount || this.shouldSettleDaily()) {
            await this.requestSettlement();
        }
    }
    async recordTransaction(receipt) {
        try {
            const response = await fetch(`${this.config.facilitatorUrl}/api/transactions/record`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    signature: receipt.signature,
                    amount: receipt.amount.toString(),
                    token: receipt.token,
                    senderAddress: receipt.sender,
                    recipientAddress: this.config.merchantWallet,
                    serviceId: this.config.serviceId,
                    status: 'confirmed',
                    timestamp: receipt.timestamp
                })
            });
            if (!response.ok) {
                throw new Error(`Failed to record transaction: ${response.statusText}`);
            }
        }
        catch (error) {
            throw error;
        }
    }
    async requestSettlement() {
        const transactions = Array.from(this.pendingTransactions.keys());
        if (transactions.length === 0) {
            throw new Error('No pending transactions to settle');
        }
        try {
            const response = await fetch(`${this.config.facilitatorUrl}/api/settlement/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    merchantWallet: this.config.merchantWallet,
                    serviceId: this.config.serviceId,
                    settlementType: 'automatic'
                })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Settlement request failed');
            }
            const settlement = await response.json();
            this.pendingTransactions.clear();
            this.lastSettlementAt = new Date();
            return settlement;
        }
        catch (error) {
            throw error;
        }
    }
    async handleSettlementWebhook(payload, signature) {
        if (!this.verifyWebhookSignature(payload, signature)) {
            return false;
        }
        if (payload.event === 'settlement.completed') {
            return true;
        }
        return false;
    }
    verifyWebhookSignature(payload, signature) {
        const expectedSignature = crypto
            .createHmac('sha256', this.config.webhookSecret)
            .update(JSON.stringify(payload))
            .digest('hex');
        try {
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
        }
        catch {
            return false;
        }
    }
    calculatePendingAmount() {
        return Array.from(this.pendingTransactions.values()).reduce((sum, tx) => sum + tx.amount, 0);
    }
    shouldSettleDaily() {
        if (!this.lastSettlementAt) {
            return true;
        }
        const hoursSinceLastSettlement = (Date.now() - this.lastSettlementAt.getTime()) / (1000 * 60 * 60);
        return hoursSinceLastSettlement >= 24;
    }
    startDailySettlementCheck() {
        setInterval(() => {
            if (this.shouldSettleDaily() && this.pendingTransactions.size > 0) {
                this.requestSettlement().catch(() => { });
            }
        }, 60 * 60 * 1000);
    }
    async getPendingAmount() {
        try {
            const response = await fetch(`${this.config.facilitatorUrl}/api/settlement/pending?merchantWallet=${this.config.merchantWallet}`);
            if (!response.ok) {
                throw new Error('Failed to fetch pending amount');
            }
            const data = await response.json();
            return data.merchantAmount || 0;
        }
        catch (error) {
            return 0;
        }
    }
    async getSettlementHistory(limit = 50) {
        try {
            const response = await fetch(`${this.config.facilitatorUrl}/api/settlement/history?merchantWallet=${this.config.merchantWallet}&limit=${limit}`);
            if (!response.ok) {
                throw new Error('Failed to fetch settlement history');
            }
            const data = await response.json();
            return data.settlements || [];
        }
        catch (error) {
            return [];
        }
    }
    getPendingTransactionCount() {
        return this.pendingTransactions.size;
    }
    getLastSettlementTime() {
        return this.lastSettlementAt;
    }
}
//# sourceMappingURL=settlement-integration.js.map