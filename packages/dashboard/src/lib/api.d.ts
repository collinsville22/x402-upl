export interface Transaction {
    id: string;
    signature: string;
    amount: string;
    token: string;
    senderAddress: string;
    recipientAddress: string;
    serviceId?: string;
    agentId?: string;
    status: string;
    timestamp: string;
    settledAt?: string;
}
export interface Settlement {
    id: string;
    totalAmount: string;
    platformFee: string;
    merchantAmount: string;
    transactionCount: number;
    status: string;
    transactionSignature?: string;
    requestedAt: string;
    completedAt?: string;
}
export interface AgentStats {
    totalTransactions: number;
    totalSpent: string;
    successRate: number;
    reputationScore: number;
}
export interface ServiceStats {
    totalCalls: number;
    totalRevenue: string;
    averageRating: number;
    successRate: number;
}
export interface MerchantStats {
    totalRevenue: number;
    totalTransactions: number;
    activeServices: number;
    averageTransaction: number;
    pendingSettlementAmount: number;
}
export interface Service {
    id: string;
    wallet: string;
    name: string;
    url: string;
    category: string | null;
    pricePerCall: string;
    acceptedTokens: string[];
}
export interface SearchQuery {
    query?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    tokens?: string[];
    sortBy?: 'price' | 'popularity' | 'rating' | 'recent';
    limit?: number;
    offset?: number;
}
export interface ServiceReputation {
    reputationScore: number;
    successRate: number;
    failureRate: number;
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
}
export declare class FacilitatorAPI {
    private baseUrl;
    constructor(baseUrl?: string);
    getTransactions(params: {
        serviceId?: string;
        agentId?: string;
        limit?: number;
    }): Promise<Transaction[]>;
    getTransaction(signature: string): Promise<Transaction>;
    getPendingSettlement(merchantWallet: string): Promise<{
        transactionCount: number;
        totalAmount: number;
        platformFee: number;
        merchantAmount: number;
        transactions: Transaction[];
    }>;
    getSettlementHistory(merchantWallet: string, limit?: number): Promise<Settlement[]>;
    requestSettlement(params: {
        merchantWallet: string;
        serviceId: string;
        settlementType: 'automatic' | 'scheduled' | 'manual';
    }): Promise<{
        settlementId: string;
        amount: number;
        transactionSignature: string;
        status: string;
        timestamp: string;
    }>;
    getAgentStats(agentId: string): Promise<AgentStats>;
    getServiceStats(serviceId: string): Promise<ServiceStats>;
    getMerchantStats(merchantWallet: string): Promise<MerchantStats>;
    getServices(): Promise<Service[]>;
    getRecentTransactions(merchantWallet: string, limit?: number): Promise<Transaction[]>;
    searchServices(query: SearchQuery): Promise<{
        services: Service[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getServiceRecommendations(serviceId: string): Promise<Service[]>;
    getServiceReputation(serviceId: string): Promise<ServiceReputation>;
    getCategories(): Promise<string[]>;
    getTrendingServices(): Promise<Array<Service & {
        stats: {
            count: number;
            revenue: number;
        };
    }>>;
    rateService(serviceId: string, rating: number, comment?: string, agentId?: string): Promise<void>;
}
export declare const facilitatorAPI: FacilitatorAPI;
//# sourceMappingURL=api.d.ts.map