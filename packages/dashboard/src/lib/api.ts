import { getAuthHeaders } from './auth';

const FACILITATOR_URL = process.env.NEXT_PUBLIC_FACILITATOR_URL || 'https://facilitator.x402.network';

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

export class FacilitatorAPI {
  private baseUrl: string;

  constructor(baseUrl: string = FACILITATOR_URL) {
    this.baseUrl = baseUrl;
  }

  async getTransactions(params: {
    serviceId?: string;
    agentId?: string;
    limit?: number;
  }): Promise<Transaction[]> {
    const query = new URLSearchParams();
    if (params.serviceId) query.append('serviceId', params.serviceId);
    if (params.agentId) query.append('agentId', params.agentId);
    if (params.limit) query.append('limit', params.limit.toString());

    const headers = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/transactions?${query}`, {
      headers
    });
    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }

    const data = await response.json();
    return data.transactions;
  }

  async getTransaction(signature: string): Promise<Transaction> {
    const response = await fetch(`${this.baseUrl}/api/transactions/${signature}`);
    if (!response.ok) {
      throw new Error('Transaction not found');
    }

    const data = await response.json();
    return data.transaction;
  }

  async getPendingSettlement(merchantWallet: string): Promise<{
    transactionCount: number;
    totalAmount: number;
    platformFee: number;
    merchantAmount: number;
    transactions: Transaction[];
  }> {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${this.baseUrl}/api/settlement/pending?merchantWallet=${merchantWallet}`,
      { headers }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch pending settlement');
    }

    return response.json();
  }

  async getSettlementHistory(merchantWallet: string, limit: number = 50): Promise<Settlement[]> {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${this.baseUrl}/api/settlement/history?merchantWallet=${merchantWallet}&limit=${limit}`,
      { headers }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch settlement history');
    }

    const data = await response.json();
    return data.settlements;
  }

  async requestSettlement(params: {
    merchantWallet: string;
    serviceId: string;
    settlementType: 'automatic' | 'scheduled' | 'manual';
  }): Promise<{
    settlementId: string;
    amount: number;
    transactionSignature: string;
    status: string;
    timestamp: string;
  }> {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/api/settlement/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Settlement request failed');
    }

    return response.json();
  }

  async getAgentStats(agentId: string): Promise<AgentStats> {
    const transactions = await this.getTransactions({ agentId, limit: 1000 });

    const totalTransactions = transactions.length;
    const successfulTransactions = transactions.filter(tx => tx.status === 'confirmed').length;
    const totalSpent = transactions
      .filter(tx => tx.status === 'confirmed')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    return {
      totalTransactions,
      totalSpent: totalSpent.toString(),
      successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0,
      reputationScore: 5000,
    };
  }

  async getServiceStats(serviceId: string): Promise<ServiceStats> {
    const transactions = await this.getTransactions({ serviceId, limit: 1000 });

    const totalCalls = transactions.length;
    const successfulCalls = transactions.filter(tx => tx.status === 'confirmed').length;
    const totalRevenue = transactions
      .filter(tx => tx.status === 'confirmed')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    return {
      totalCalls,
      totalRevenue: totalRevenue.toString(),
      averageRating: 0,
      successRate: totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0,
    };
  }

  async getMerchantStats(merchantWallet: string): Promise<MerchantStats> {
    const [transactionsResponse, pendingSettlement, services] = await Promise.all([
      this.getTransactions({ limit: 1000 }),
      this.getPendingSettlement(merchantWallet),
      this.getServices()
    ]);

    const merchantTransactions = transactionsResponse.filter(
      tx => tx.recipientAddress === merchantWallet && tx.status === 'confirmed'
    );

    const totalRevenue = merchantTransactions.reduce(
      (sum, tx) => sum + parseFloat(tx.amount),
      0
    );

    const activeServices = services.filter(s => s.wallet === merchantWallet).length;

    return {
      totalRevenue,
      totalTransactions: merchantTransactions.length,
      activeServices,
      averageTransaction: merchantTransactions.length > 0
        ? totalRevenue / merchantTransactions.length
        : 0,
      pendingSettlementAmount: pendingSettlement.merchantAmount
    };
  }

  async getServices(): Promise<Service[]> {
    const response = await fetch(`${this.baseUrl}/api/services`);
    if (!response.ok) {
      throw new Error('Failed to fetch services');
    }

    return response.json();
  }

  async getRecentTransactions(merchantWallet: string, limit: number = 10): Promise<Transaction[]> {
    const transactions = await this.getTransactions({ limit });
    return transactions
      .filter(tx => tx.recipientAddress === merchantWallet)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async searchServices(query: SearchQuery): Promise<{
    services: Service[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams();
    if (query.query) params.append('query', query.query);
    if (query.category) params.append('category', query.category);
    if (query.minPrice) params.append('minPrice', query.minPrice);
    if (query.maxPrice) params.append('maxPrice', query.maxPrice);
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.offset) params.append('offset', query.offset.toString());
    if (query.tokens) {
      query.tokens.forEach(token => params.append('tokens[]', token));
    }

    const response = await fetch(`${this.baseUrl}/api/services/search?${params}`);
    if (!response.ok) {
      throw new Error('Search failed');
    }

    return response.json();
  }

  async getServiceRecommendations(serviceId: string): Promise<Service[]> {
    const response = await fetch(
      `${this.baseUrl}/api/services/${serviceId}/recommendations`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch recommendations');
    }

    const data = await response.json();
    return data.recommendations;
  }

  async getServiceReputation(serviceId: string): Promise<ServiceReputation> {
    const response = await fetch(
      `${this.baseUrl}/api/services/${serviceId}/reputation`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch reputation');
    }

    return response.json();
  }

  async getCategories(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/services/categories`);
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }

    const data = await response.json();
    return data.categories;
  }

  async getTrendingServices(): Promise<Array<Service & { stats: { count: number; revenue: number } }>> {
    const response = await fetch(`${this.baseUrl}/api/services/trending`);
    if (!response.ok) {
      throw new Error('Failed to fetch trending services');
    }

    const data = await response.json();
    return data.trending;
  }

  async rateService(serviceId: string, rating: number, comment?: string, agentId?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/services/${serviceId}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rating, comment, agentId })
    });

    if (!response.ok) {
      throw new Error('Failed to rate service');
    }
  }
}

export const facilitatorAPI = new FacilitatorAPI();
