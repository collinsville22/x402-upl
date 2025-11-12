export declare const facilitatorAPI: {
    getServices(): Promise<unknown>;
    getService(id: string): Promise<unknown>;
    getServiceStats(id: string): Promise<unknown>;
    getMerchantStats(wallet: string): Promise<unknown>;
    getTransactions(): Promise<unknown>;
    registerService(data: {
        name: string;
        description: string;
        endpoint: string;
        category: string;
        merchantWallet: string;
        pricing: {
            model: string;
            amount: number;
        };
    }): Promise<unknown>;
};
export declare const reasoningAPI: {
    createWorkflow(data: {
        userId: string;
        input: string;
        maxCost: number;
        maxTime?: number;
    }): Promise<unknown>;
    getWorkflow(id: string): Promise<unknown>;
    approveWorkflow(id: string): Promise<unknown>;
    getUserWorkflows(userId: string, limit?: number): Promise<unknown>;
    getEscrowBalance(userId: string): Promise<unknown>;
    depositEscrow(userId: string, amount: number, signature: string): Promise<unknown>;
    withdrawEscrow(userId: string, amount: number): Promise<unknown>;
    createWorkflowStream(id: string): WebSocket;
};
//# sourceMappingURL=api.d.ts.map