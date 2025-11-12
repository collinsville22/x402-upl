import { PhantomCashX402Client } from './phantom-cash-x402-client.js';
import { X402Handler } from './x402-handler.js';
import { ServiceRegistry } from './service-registry.js';
import { AgentBrain } from './agent-brain.js';
import { ExecutionEngine } from './execution-engine.js';
export class PhantomAgent {
    cashClient;
    x402Handler;
    registry;
    brain;
    engine;
    constructor(config) {
        this.cashClient = new PhantomCashX402Client({
            wallet: config.wallet,
            network: config.network || 'mainnet-beta',
            rpcUrl: config.rpcUrl,
            spendingLimitPerHour: config.spendingLimitPerHour,
        });
        this.x402Handler = new X402Handler(this.cashClient);
        this.registry = new ServiceRegistry(config.registryUrl);
        this.brain = new AgentBrain(config.openaiApiKey, this.registry, config.llmModel || 'gpt-4');
        this.engine = new ExecutionEngine(this.x402Handler, this.registry);
    }
    async getWalletAddress() {
        return await this.cashClient.getWalletAddress();
    }
    async getSolBalance() {
        return await this.cashClient.getSolBalance();
    }
    async getCashBalance() {
        return await this.cashClient.getCashBalance();
    }
    getMetrics() {
        return this.cashClient.getMetrics();
    }
    getSpentThisHour() {
        return this.cashClient.getSpentThisHour();
    }
    getRemainingHourlyBudget() {
        return this.cashClient.getRemainingHourlyBudget();
    }
    registerService(service) {
        this.registry.registerService(service);
    }
    async listServices() {
        return this.registry.listServices();
    }
    async searchServices(query) {
        return this.registry.searchServices(query);
    }
    async findServicesByCategory(category) {
        return this.registry.findServicesByCategory(category);
    }
    async executeTask(task) {
        const initialCashBalance = await this.getCashBalance();
        const initialSolBalance = await this.getSolBalance();
        if (initialCashBalance < task.maxBudget) {
            throw new Error(`Insufficient CASH balance: ${initialCashBalance.toFixed(6)} < ${task.maxBudget.toFixed(6)}`);
        }
        const plan = await this.brain.planServiceChain(task);
        const optimizedPlan = await this.brain.optimizePlan(plan);
        const execution = await this.engine.execute(optimizedPlan, {
            maxBudget: task.maxBudget,
        });
        const results = execution.steps.map(step => ({
            step: step.stepNumber,
            result: step.data,
            cost: step.cost,
        }));
        const analysis = await this.brain.analyzeResults(task, optimizedPlan, results);
        const finalCashBalance = await this.getCashBalance();
        const finalSolBalance = await this.getSolBalance();
        return {
            task,
            plan: optimizedPlan,
            execution,
            analysis,
            timestamp: Date.now(),
            walletAddress: await this.getWalletAddress(),
            initialCashBalance,
            finalCashBalance,
            initialSolBalance,
            finalSolBalance,
        };
    }
    getPaymentHistory() {
        return this.x402Handler.getPaymentHistory();
    }
    getTotalSpent() {
        return this.x402Handler.getTotalSpent();
    }
    async verifyTransaction(signature) {
        return this.cashClient.verifyTransaction(signature);
    }
}
//# sourceMappingURL=phantom-agent.js.map