const FACILITATOR_URL = process.env.NEXT_PUBLIC_FACILITATOR_URL || 'http://localhost:4001';
const REASONING_URL = process.env.NEXT_PUBLIC_REASONING_URL || 'http://localhost:5000';

// Facilitator API
export const facilitatorAPI = {
  async getServices() {
    const response = await fetch(`${FACILITATOR_URL}/api/services`);
    if (!response.ok) throw new Error('Failed to fetch services');
    return response.json();
  },

  async getService(id: string) {
    const response = await fetch(`${FACILITATOR_URL}/api/services/${id}`);
    if (!response.ok) throw new Error('Failed to fetch service');
    return response.json();
  },

  async getServiceStats(id: string) {
    const response = await fetch(`${FACILITATOR_URL}/api/services/${id}/stats`);
    if (!response.ok) throw new Error('Failed to fetch service stats');
    return response.json();
  },

  async getMerchantStats(wallet: string) {
    const response = await fetch(`${FACILITATOR_URL}/api/merchants/${wallet}/stats`);
    if (!response.ok) throw new Error('Failed to fetch merchant stats');
    return response.json();
  },

  async getTransactions() {
    const response = await fetch(`${FACILITATOR_URL}/api/transactions`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  },

  async registerService(data: {
    name: string;
    description: string;
    endpoint: string;
    category: string;
    merchantWallet: string;
    pricing: { model: string; amount: number };
  }) {
    const response = await fetch(`${FACILITATOR_URL}/api/services/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to register service' }));
      throw new Error(error.message || 'Failed to register service');
    }
    return response.json();
  },
};

// Reasoning API
export const reasoningAPI = {
  async createWorkflow(data: { userId: string; input: string; maxCost: number; maxTime?: number }) {
    const response = await fetch(`${REASONING_URL}/workflows/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create workflow');
    return response.json();
  },

  async getWorkflow(id: string) {
    const response = await fetch(`${REASONING_URL}/workflows/${id}`);
    if (!response.ok) throw new Error('Failed to fetch workflow');
    return response.json();
  },

  async approveWorkflow(id: string) {
    const response = await fetch(`${REASONING_URL}/workflows/${id}/approve`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to approve workflow');
    return response.json();
  },

  async getUserWorkflows(userId: string, limit = 100) {
    const response = await fetch(`${REASONING_URL}/users/${userId}/workflows?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch workflows');
    return response.json();
  },

  async getEscrowBalance(userId: string) {
    const response = await fetch(`${REASONING_URL}/escrow/${userId}/balance`);
    if (!response.ok) throw new Error('Failed to fetch escrow balance');
    return response.json();
  },

  async depositEscrow(userId: string, amount: number, signature: string) {
    const response = await fetch(`${REASONING_URL}/escrow/${userId}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, signature }),
    });
    if (!response.ok) throw new Error('Failed to deposit');
    return response.json();
  },

  async withdrawEscrow(userId: string, amount: number) {
    const response = await fetch(`${REASONING_URL}/escrow/${userId}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    if (!response.ok) throw new Error('Failed to withdraw');
    return response.json();
  },

  createWorkflowStream(id: string): WebSocket {
    const wsUrl = REASONING_URL.replace('http', 'ws');
    return new WebSocket(`${wsUrl}/workflows/${id}/stream`);
  },
};
