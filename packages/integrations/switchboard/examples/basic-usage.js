import { OracleDataMarketplace } from '../src/marketplace.js';
import dotenv from 'dotenv';
dotenv.config();
async function main() {
    const marketplace = new OracleDataMarketplace(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', process.env.SWITCHBOARD_QUEUE_KEY || 'A43DyUGA7s8eXPxqEjJY5CfCZaKdYxCmCKe5wGMuYiCe', process.env.PAYMENT_RECIPIENT, process.env.X402_REGISTRY_URL || 'http://localhost:3001', 'devnet');
    await marketplace.initialize();
    console.log('Switchboard Oracle Marketplace initialized');
    const feeds = marketplace.listFeeds();
    console.log(`\nAvailable feeds: ${feeds.length}`);
    for (const feed of feeds) {
        console.log(`\n${feed.name}`);
        console.log(`  Feed ID: ${feed.feedId}`);
        console.log(`  Category: ${feed.category}`);
        console.log(`  Price: ${feed.pricePerUpdate} ${feed.currency}`);
        console.log(`  Update Frequency: ${feed.updateFrequency}`);
    }
    const btcFeed = feeds.find(f => f.name === 'BTC/USD');
    if (btcFeed) {
        console.log('\n--- Simulating BTC/USD Feed ---');
        const result = await marketplace.simulateFeed(btcFeed.feedId);
        console.log(`Current BTC Price: $${result.value.toLocaleString()}`);
        console.log(`Timestamp: ${new Date(result.timestamp).toISOString()}`);
        console.log(`Feed ID: ${result.feedId}`);
    }
    console.log('\n--- Batch Simulation ---');
    const feedIds = feeds.slice(0, 3).map(f => f.feedId);
    const batchResults = await marketplace.batchSimulateFeeds(feedIds);
    for (const [feedId, result] of batchResults.entries()) {
        const feed = feeds.find(f => f.feedId === feedId);
        console.log(`${feed?.name}: $${result.value.toLocaleString()}`);
    }
    console.log('\n--- Discovering Marketplace Services ---');
    const services = await marketplace.discoverMarketplaceServices('crypto-price', 0.001);
    console.log(`Found ${services.length} services in marketplace:`);
    for (const service of services.slice(0, 5)) {
        console.log(`  ${service.name} - ${service.pricePerCall} per call`);
        console.log(`    Reputation: ${service.reputation}/10000`);
        console.log(`    Total Calls: ${service.totalCalls}`);
    }
}
main().catch(console.error);
//# sourceMappingURL=basic-usage.js.map