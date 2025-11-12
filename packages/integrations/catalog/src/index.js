"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SponsorServiceCatalog = void 0;
const client_1 = require("@x402-upl/integration-dark/client");
const client_2 = require("@x402-upl/integration-triton/client");
const client_3 = require("@x402-upl/integration-gradient/client");
const client_4 = require("@x402-upl/integration-om1/client");
class SponsorServiceCatalog {
    darkClient;
    tritonClient;
    gradientClient;
    om1Client;
    config;
    constructor(config) {
        this.config = config;
        if (config.dark) {
            this.darkClient = new client_1.DarkResearchClient({
                apiKey: config.dark.apiKey,
            });
        }
        if (config.triton) {
            this.tritonClient = new client_2.TritonClient({
                apiKey: config.triton.apiKey,
            });
        }
        if (config.gradient) {
            this.gradientClient = new client_3.GradientClient({
                apiKey: config.gradient.apiKey,
            });
        }
        if (config.om1) {
            this.om1Client = new client_4.OM1Client({
                apiKey: config.om1.apiKey,
            });
        }
    }
    getServiceCatalog() {
        const services = [];
        if (this.darkClient && this.config.dark) {
            services.push({
                id: 'dark-research',
                name: 'Dark Research - AI Research',
                description: 'AI-powered research with deep analysis and fact-checking',
                category: 'Research',
                sponsor: 'dark',
                pricePerCall: this.config.dark.pricePerCall,
                capabilities: ['research', 'fact-check', 'summarize', 'extract-entities'],
                inputSchema: {
                    query: 'string',
                    depth: 'quick | standard | deep',
                    maxResults: 'number',
                },
            }, {
                id: 'dark-document-analysis',
                name: 'Dark Research - Document Analysis',
                description: 'Analyze documents and answer questions with AI',
                category: 'Research',
                sponsor: 'dark',
                pricePerCall: this.config.dark.pricePerCall,
                capabilities: ['analyze', 'question-answering', 'extraction'],
                inputSchema: {
                    documentUrl: 'string',
                    questions: 'string[]',
                },
            }, {
                id: 'dark-trend-analysis',
                name: 'Dark Research - Trend Analysis',
                description: 'Analyze trends and predict future movements',
                category: 'Research',
                sponsor: 'dark',
                pricePerCall: this.config.dark.pricePerCall,
                capabilities: ['trends', 'prediction', 'sentiment'],
                inputSchema: {
                    topic: 'string',
                    timeframe: 'string',
                },
            });
        }
        if (this.tritonClient && this.config.triton) {
            services.push({
                id: 'triton-historical-data',
                name: 'Triton Old Faithful - Historical Blockchain Data',
                description: 'Access historical Solana blockchain data and transactions',
                category: 'Blockchain Data',
                sponsor: 'triton',
                pricePerCall: this.config.triton.pricePerCall,
                capabilities: ['blocks', 'transactions', 'account-history'],
                inputSchema: {
                    slot: 'number',
                    address: 'string',
                    fromSlot: 'number',
                    toSlot: 'number',
                },
            }, {
                id: 'triton-token-transfers',
                name: 'Triton Old Faithful - Token Transfer History',
                description: 'Track token transfers and holder analytics',
                category: 'Blockchain Data',
                sponsor: 'triton',
                pricePerCall: this.config.triton.pricePerCall,
                capabilities: ['token-transfers', 'holders', 'volume-analysis'],
                inputSchema: {
                    mint: 'string',
                    fromSlot: 'number',
                    toSlot: 'number',
                },
            }, {
                id: 'triton-dex-data',
                name: 'Triton Old Faithful - DEX Trading Data',
                description: 'Historical DEX trading data and market analytics',
                category: 'Blockchain Data',
                sponsor: 'triton',
                pricePerCall: this.config.triton.pricePerCall,
                capabilities: ['dex-trades', 'market-data', 'price-history'],
                inputSchema: {
                    market: 'string',
                    dexProgram: 'string',
                    timeframe: 'string',
                },
            });
        }
        if (this.gradientClient && this.config.gradient) {
            services.push({
                id: 'gradient-inference',
                name: 'Gradient Parallax - AI Inference',
                description: 'Run AI model inference on distributed GPU infrastructure',
                category: 'AI & ML',
                sponsor: 'gradient',
                pricePerCall: this.config.gradient.pricePerCall,
                capabilities: ['inference', 'batch-inference', 'llm', 'vision'],
                inputSchema: {
                    model: 'string',
                    input: 'any',
                    parameters: 'object',
                },
            }, {
                id: 'gradient-training',
                name: 'Gradient Parallax - Model Training',
                description: 'Train custom AI models on high-performance GPUs',
                category: 'AI & ML',
                sponsor: 'gradient',
                pricePerCall: this.config.gradient.pricePerCall,
                capabilities: ['training', 'fine-tuning', 'hyperparameter-optimization'],
                inputSchema: {
                    model: 'string',
                    dataset: 'string',
                    hyperparameters: 'object',
                },
            }, {
                id: 'gradient-compute',
                name: 'Gradient Parallax - Distributed Compute',
                description: 'Execute compute-intensive tasks on distributed infrastructure',
                category: 'Computation',
                sponsor: 'gradient',
                pricePerCall: this.config.gradient.pricePerCall,
                capabilities: ['data-processing', 'rendering', 'simulation'],
                inputSchema: {
                    type: 'string',
                    parameters: 'object',
                    resources: 'object',
                },
            });
        }
        if (this.om1Client && this.config.om1) {
            services.push({
                id: 'om1-trading-robot',
                name: 'OM1 Robots - Automated Trading',
                description: 'Deploy autonomous trading robots with custom strategies',
                category: 'Trading',
                sponsor: 'om1',
                pricePerCall: this.config.om1.pricePerCall,
                capabilities: [
                    'market-making',
                    'arbitrage',
                    'grid-trading',
                    'trend-following',
                ],
                inputSchema: {
                    strategy: 'object',
                    markets: 'string[]',
                    capital: 'number',
                },
            }, {
                id: 'om1-signals',
                name: 'OM1 Robots - Trading Signals',
                description: 'Real-time trading signals based on advanced algorithms',
                category: 'Trading',
                sponsor: 'om1',
                pricePerCall: this.config.om1.pricePerCall,
                capabilities: ['signals', 'analysis', 'recommendations'],
                inputSchema: {
                    market: 'string',
                    strategy: 'string',
                    minConfidence: 'number',
                },
            }, {
                id: 'om1-backtest',
                name: 'OM1 Robots - Strategy Backtesting',
                description: 'Backtest trading strategies on historical data',
                category: 'Trading',
                sponsor: 'om1',
                pricePerCall: this.config.om1.pricePerCall,
                capabilities: ['backtest', 'optimization', 'risk-analysis'],
                inputSchema: {
                    strategy: 'object',
                    markets: 'string[]',
                    fromDate: 'string',
                    toDate: 'string',
                },
            });
        }
        return services;
    }
    async executeService(serviceId, params) {
        const [sponsor, capability] = serviceId.split('-');
        switch (sponsor) {
            case 'dark':
                if (!this.darkClient)
                    throw new Error('Dark Research not configured');
                if (capability === 'research') {
                    return await this.darkClient.research(params);
                }
                else if (capability === 'document') {
                    return await this.darkClient.analyzeDocument(params.documentUrl, params.questions);
                }
                else if (capability === 'trend') {
                    return await this.darkClient.trendAnalysis(params.topic, params.timeframe);
                }
                break;
            case 'triton':
                if (!this.tritonClient)
                    throw new Error('Triton not configured');
                if (capability === 'historical') {
                    return await this.tritonClient.getAccountHistory(params);
                }
                else if (capability === 'token') {
                    return await this.tritonClient.getTokenTransfers(params);
                }
                else if (capability === 'dex') {
                    return await this.tritonClient.getDEXTrades(params);
                }
                break;
            case 'gradient':
                if (!this.gradientClient)
                    throw new Error('Gradient not configured');
                if (capability === 'inference') {
                    return await this.gradientClient.inference(params);
                }
                else if (capability === 'training') {
                    return await this.gradientClient.trainModel(params);
                }
                else if (capability === 'compute') {
                    return await this.gradientClient.submitJob(params);
                }
                break;
            case 'om1':
                if (!this.om1Client)
                    throw new Error('OM1 not configured');
                if (capability === 'trading') {
                    return await this.om1Client.createRobot(params);
                }
                else if (capability === 'signals') {
                    return await this.om1Client.getTradeSignals(params.market, params.strategy, params.minConfidence);
                }
                else if (capability === 'backtest') {
                    return await this.om1Client.backtest(params);
                }
                break;
            default:
                throw new Error(`Unknown service: ${serviceId}`);
        }
        throw new Error(`Service execution failed: ${serviceId}`);
    }
    getDarkClient() {
        return this.darkClient;
    }
    getTritonClient() {
        return this.tritonClient;
    }
    getGradientClient() {
        return this.gradientClient;
    }
    getOM1Client() {
        return this.om1Client;
    }
}
exports.SponsorServiceCatalog = SponsorServiceCatalog;
//# sourceMappingURL=index.js.map