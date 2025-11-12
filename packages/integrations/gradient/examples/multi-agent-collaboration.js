"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const index_js_1 = require("../src/index.js");
const fs = __importStar(require("fs"));
async function createAgent(name, systemPrompt, wallet) {
    return new index_js_1.X402ParallaxAgent({
        parallax: {
            schedulerUrl: process.env.PARALLAX_SCHEDULER_URL || 'http://localhost:3001',
            model: 'Qwen/Qwen3-0.6B',
            nodes: [
                { nodeId: 'node-0', host: 'localhost', port: 3000 },
                { nodeId: 'node-1', host: 'localhost', port: 3001 },
            ],
            isLocalNetwork: true,
        },
        solana: {
            rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
            wallet,
            usdcMint: process.env.USDC_MINT,
        },
        x402: {
            registryUrl: process.env.X402_REGISTRY_URL || 'http://localhost:4000',
            spendingLimitPerHour: 100,
            reserveMinimum: 50,
        },
        agent: {
            name,
            systemPrompt,
            tools: [],
            maxIterations: 10,
            budget: 25,
        },
    });
}
async function main() {
    const walletPath = process.env.X402_WALLET_PATH || './wallet.json';
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    const wallet = web3_js_1.Keypair.fromSecretKey(new Uint8Array(walletData));
    const coordinator = await createAgent('coordinator', `You are a coordinator agent. Your job is to break down complex tasks into subtasks and orchestrate other agents.
    Use Parallax for reasoning and the x402 network to find specialized agents.`, wallet);
    const researcher = await createAgent('researcher', `You are a research specialist agent. You gather data, analyze information, and provide insights.
    Use distributed inference for analysis and discover data sources via x402.`, wallet);
    const analyst = await createAgent('analyst', `You are a data analyst agent. You process research data and generate statistical insights.
    Optimize for cost-effective inference services.`, wallet);
    console.log('Initializing agents...');
    await Promise.all([
        coordinator.initialize(),
        researcher.initialize(),
        analyst.initialize(),
    ]);
    console.log('All agents initialized\n');
    console.log('=== COORDINATOR AGENT ===');
    const coordinatorTask = `Break down this task: "Analyze the economics of decentralized AI networks"
  Define 2-3 subtasks that other agents can execute.`;
    const coordinatorResult = await coordinator.run(coordinatorTask);
    console.log('Coordinator output:', coordinatorResult.answer);
    console.log('Cost:', coordinatorResult.totalCost, 'USDC\n');
    console.log('=== RESEARCHER AGENT ===');
    const researchTask = `Research decentralized AI networks and their economic models.
  Find and compare services from the x402 network.
  Provide a data summary.`;
    const researchResult = await researcher.run(researchTask);
    console.log('Research output:', researchResult.answer);
    console.log('Cost:', researchResult.totalCost, 'USDC\n');
    console.log('=== ANALYST AGENT ===');
    const analysisTask = `Given the research on decentralized AI networks,
  analyze the pricing models and cost efficiency.
  Calculate average costs and identify best value options.`;
    const analysisResult = await analyst.run(analysisTask);
    console.log('Analysis output:', analysisResult.answer);
    console.log('Cost:', analysisResult.totalCost, 'USDC\n');
    console.log('=== TOTAL ECONOMICS ===');
    const totalCost = coordinatorResult.totalCost + researchResult.totalCost + analysisResult.totalCost;
    console.log('Total Spent:', totalCost, 'USDC');
    console.log('Total Iterations:', coordinatorResult.iterations + researchResult.iterations + analysisResult.iterations);
    await Promise.all([
        coordinator.shutdown(),
        researcher.shutdown(),
        analyst.shutdown(),
    ]);
    console.log('\nAll agents shutdown');
}
main().catch(console.error);
//# sourceMappingURL=multi-agent-collaboration.js.map