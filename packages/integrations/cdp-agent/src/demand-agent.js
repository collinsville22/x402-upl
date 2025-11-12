import { CDPSolanaClient } from './cdp-client.js';
import { ToolRegistry } from './tool-registry.js';
import { AgentBrain } from './agent-brain.js';
import { ExecutionEngine } from './execution-engine.js';
export class DemandSideAgent {
    cdpClient;
    registry;
    brain;
    engine;
    agentAddress;
    constructor(config) {
        this.cdpClient = new CDPSolanaClient(config.cdpNetwork);
        this.registry = new ToolRegistry();
        this.brain = new AgentBrain(config.openaiApiKey, this.registry, config.llmModel || 'gpt-4');
        this.engine = new ExecutionEngine(this.cdpClient, this.registry);
        this.agentAddress = null;
    }
    async initialize() {
        const account = await this.cdpClient.createAccount();
        this.agentAddress = account.address;
        if (this.cdpClient['network'] === 'devnet') {
            await this.cdpClient.requestFaucet(this.agentAddress);
            await this.cdpClient.waitForBalance(this.agentAddress);
        }
        return this.agentAddress;
    }
    registerTool(tool) {
        this.registry.registerTool(tool);
    }
    async discoverTools(query) {
        return this.registry.findToolsByCategory(query);
    }
    listAvailableTools() {
        return this.registry.listTools();
    }
    async executeTask(task) {
        if (!this.agentAddress) {
            throw new Error('Agent not initialized. Call initialize() first.');
        }
        const balance = await this.cdpClient.getBalance(this.agentAddress);
        if (balance < task.maxBudgetLamports) {
            throw new Error(`Insufficient balance: ${balance} < ${task.maxBudgetLamports}`);
        }
        const plan = await this.brain.planToolChain(task);
        const optimizedPlan = await this.brain.optimizePlan(plan);
        const execution = await this.engine.execute(optimizedPlan, {
            agentAddress: this.agentAddress,
            maxBudgetLamports: task.maxBudgetLamports,
        });
        const results = execution.steps.map(step => ({
            step: step.stepNumber,
            result: step.toolResult.data,
        }));
        const analysis = await this.brain.reasonAboutResults(task, optimizedPlan, results);
        return {
            task,
            plan: optimizedPlan,
            execution,
            analysis,
            timestamp: Date.now(),
        };
    }
    async getBalance() {
        if (!this.agentAddress) {
            throw new Error('Agent not initialized');
        }
        return await this.cdpClient.getBalance(this.agentAddress);
    }
    getAddress() {
        return this.agentAddress;
    }
    async close() {
        await this.cdpClient.close();
    }
}
//# sourceMappingURL=demand-agent.js.map