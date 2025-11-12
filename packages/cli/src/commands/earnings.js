"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.earningsCommand = earningsCommand;
const commander_1 = require("commander");
const sdk_1 = require("@x402-upl/sdk");
const config_js_1 = require("../utils/config.js");
const api_js_1 = require("../utils/api.js");
const spinner_js_1 = require("../utils/spinner.js");
function earningsCommand() {
    const cmd = new commander_1.Command('earnings');
    cmd
        .description('View your earnings and stats')
        .option('-s, --services', 'Show per-service breakdown')
        .option('-a, --agent', 'Show agent stats')
        .action(async (options) => {
        try {
            const wallet = (0, config_js_1.getWallet)();
            const config = (0, config_js_1.getConfig)();
            if (!wallet) {
                (0, spinner_js_1.failSpinner)('No wallet configured. Run "x402 register" first');
                process.exit(1);
            }
            if (options.agent || !options.services) {
                if (!config.agentId) {
                    (0, spinner_js_1.failSpinner)('Agent not registered. Run "x402 register" first');
                    process.exit(1);
                }
                const spinner = (0, spinner_js_1.startSpinner)('Fetching agent stats...');
                const client = new sdk_1.X402Client({
                    network: (0, config_js_1.getNetwork)(),
                    wallet,
                });
                const stats = await client.getAgentStats(config.agentId);
                (0, spinner_js_1.succeedSpinner)('Agent Statistics');
                const data = [
                    ['Metric', 'Value'],
                    ['Total Transactions', stats.totalTransactions.toString()],
                    ['Successful Transactions', stats.successfulTransactions.toString()],
                    ['Success Rate', `${stats.successRate.toFixed(2)}%`],
                    ['Total Spent', `$${stats.totalSpent.toFixed(6)} USDC`],
                    ['Reputation Score', `${stats.reputationScore}/10000`],
                ];
            }
            if (options.services) {
                const spinner = (0, spinner_js_1.startSpinner)('Fetching service earnings...');
                const response = await (0, api_js_1.apiRequest)('GET', `/services/earnings/${wallet.publicKey.toBase58()}`);
                if (!response.success || !response.data) {
                    (0, spinner_js_1.failSpinner)(`Failed to fetch earnings: ${response.error}`);
                    process.exit(1);
                }
                (0, spinner_js_1.succeedSpinner)('Service Earnings');
                if (response.data.length === 0) {
                    return;
                }
                const data = [['Service', 'Revenue', 'Calls', 'Success Rate', 'Rating']];
                for (const service of response.data) {
                    data.push([
                        service.serviceName,
                        `$${service.totalRevenue.toFixed(6)}`,
                        service.totalCalls.toString(),
                        `${service.successRate.toFixed(2)}%`,
                        service.averageRating.toFixed(1),
                    ]);
                }
                const totalRevenue = response.data.reduce((sum, s) => sum + s.totalRevenue, 0);
                const totalCalls = response.data.reduce((sum, s) => sum + s.totalCalls, 0);
                data.push(['TOTAL', `$${totalRevenue.toFixed(6)}`, totalCalls.toString(), '', '']);
            }
        }
        catch (error) {
            (0, spinner_js_1.failSpinner)(`Failed to fetch earnings: ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    });
    return cmd;
}
//# sourceMappingURL=earnings.js.map