"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverCommand = discoverCommand;
const commander_1 = require("commander");
const sdk_1 = require("@x402-upl/sdk");
const config_js_1 = require("../utils/config.js");
const spinner_js_1 = require("../utils/spinner.js");
function discoverCommand() {
    const cmd = new commander_1.Command('discover');
    cmd
        .description('Discover available services')
        .option('-q, --query <query>', 'Search query')
        .option('-c, --category <category>', 'Filter by category')
        .option('--max-price <price>', 'Maximum price per call')
        .option('--min-reputation <score>', 'Minimum reputation score')
        .option('--min-uptime <percentage>', 'Minimum uptime percentage')
        .option('--sort <field>', 'Sort by: price, reputation, value, recent', 'value')
        .option('-l, --limit <number>', 'Limit results', '10')
        .action(async (options) => {
        try {
            const spinner = (0, spinner_js_1.startSpinner)('Searching services...');
            const client = new sdk_1.X402Client({
                network: (0, config_js_1.getNetwork)(),
            });
            const services = await client.discover({
                query: options.query,
                category: options.category,
                maxPrice: options.maxPrice ? parseFloat(options.maxPrice) : undefined,
                minReputation: options.minReputation ? parseInt(options.minReputation) : undefined,
                minUptime: options.minUptime ? parseFloat(options.minUptime) : undefined,
                sortBy: options.sort,
                limit: parseInt(options.limit),
            });
            (0, spinner_js_1.succeedSpinner)(`Found ${services.length} services`);
            if (services.length === 0) {
                return;
            }
            const data = [['Name', 'Category', 'Price', 'Reputation', 'Uptime', 'Rating']];
            for (const service of services) {
                data.push([
                    service.name,
                    service.category,
                    `$${service.pricePerCall.toFixed(6)}`,
                    `${service.reputationScore}/10000`,
                    `${service.uptimePercentage.toFixed(1)}%`,
                    service.averageRating.toFixed(1),
                ]);
            }
        }
        catch (error) {
            (0, spinner_js_1.failSpinner)(`Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    });
    return cmd;
}
//# sourceMappingURL=discover.js.map