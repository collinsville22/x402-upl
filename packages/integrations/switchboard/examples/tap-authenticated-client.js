import { VisaTAPAgent } from '@x402-upl/visa-tap-agent';
import axios from 'axios';
import { Keypair, Connection } from '@solana/web3.js';
import dotenv from 'dotenv';
dotenv.config();
async function main() {
    const marketplaceUrl = process.env.MARKETPLACE_URL || 'http://localhost:3003';
    const solanaRpc = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(solanaRpc, 'confirmed');
    const wallet = Keypair.generate();
    const tapAgent = new VisaTAPAgent({
        registryUrl: process.env.TAP_REGISTRY_URL || 'http://localhost:8001',
        name: 'Switchboard Oracle Consumer',
        domain: 'oracle-consumer.x402.local',
        description: 'Autonomous agent consuming Switchboard oracle data via x402',
        contactEmail: 'agent@oracle-consumer.x402.local',
        algorithm: 'ed25519',
    });
    await tapAgent.register();
    console.log(`TAP Agent registered: ${tapAgent.getTAPIdentity()?.keyId}`);
    console.log('\n--- Listing Available Feeds ---');
    const listHeaders = await tapAgent.signRequest('GET', '/feeds');
    const feedsResponse = await axios.get(`${marketplaceUrl}/feeds`, {
        headers: listHeaders,
    });
    console.log(`Found ${feedsResponse.data.length} feeds:`);
    for (const feed of feedsResponse.data.slice(0, 5)) {
        console.log(`  ${feed.name} - ${feed.pricePerUpdate} ${feed.currency}`);
    }
    const btcFeed = feedsResponse.data.find((f) => f.name === 'BTC/USD');
    if (btcFeed) {
        console.log(`\n--- Simulating ${btcFeed.name} (Free) ---`);
        const simulateBody = { feedId: btcFeed.feedId };
        const simulateHeaders = await tapAgent.signRequest('POST', `/feeds/${btcFeed.feedId}/simulate`, simulateBody);
        const simulateResponse = await axios.post(`${marketplaceUrl}/feeds/${btcFeed.feedId}/simulate`, simulateBody, { headers: simulateHeaders });
        console.log(`Current BTC Price: $${simulateResponse.data.value.toLocaleString()}`);
        console.log(`Timestamp: ${new Date(simulateResponse.data.timestamp).toISOString()}`);
        console.log(`\n--- Requesting Paid Update for ${btcFeed.name} ---`);
        const updateHeaders = await tapAgent.signRequest('POST', `/feeds/${btcFeed.feedId}/update`);
        const updateResponse = await axios.post(`${marketplaceUrl}/feeds/${btcFeed.feedId}/update`, {}, {
            headers: updateHeaders,
            validateStatus: () => true,
        });
        if (updateResponse.status === 402) {
            const paymentReq = updateResponse.data.payment;
            console.log('Payment Required:');
            console.log(`  Amount: ${paymentReq.amount} ${paymentReq.currency}`);
            console.log(`  Recipient: ${paymentReq.recipient}`);
            console.log(`  Request ID: ${paymentReq.requestId}`);
            console.log(`  Expires: ${new Date(paymentReq.expiresAt).toISOString()}`);
            console.log('\n[Simulating CASH payment...]');
            const paymentProof = {
                signature: 'mock_signature_' + Date.now(),
                amount: paymentReq.amount,
                sender: wallet.publicKey.toBase58(),
                recipient: paymentReq.recipient,
                mint: paymentReq.mint,
                timestamp: Date.now(),
                requestId: paymentReq.requestId,
            };
            console.log('\nRetrying with payment proof...');
            const retryHeaders = await tapAgent.signRequest('POST', `/feeds/${btcFeed.feedId}/update`);
            retryHeaders['X-Payment-Proof'] = JSON.stringify(paymentProof);
            const retryResponse = await axios.post(`${marketplaceUrl}/feeds/${btcFeed.feedId}/update`, {}, {
                headers: retryHeaders,
                validateStatus: () => true,
            });
            if (retryResponse.status === 200) {
                console.log('\nUpdate Successful!');
                console.log(`  Price: $${retryResponse.data.value.toLocaleString()}`);
                console.log(`  Signatures: ${retryResponse.data.signatures}`);
                console.log(`  Cost: ${retryResponse.data.cost} SOL`);
                console.log(`  Transaction: ${retryResponse.data.transactionSignature?.slice(0, 20)}...`);
            }
            else {
                console.log('\nPayment verification would fail (mock signature)');
                console.log(`Status: ${retryResponse.status}`);
            }
        }
    }
    console.log('\n--- Creating Custom Feed ---');
    const customFeedRequest = {
        name: 'Custom ETH/EUR Feed',
        description: 'Ethereum to Euro price from multiple sources',
        dataSources: [
            {
                name: 'BINANCE',
                url: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHEUR',
                jsonPath: '$.price',
            },
            {
                name: 'KRAKEN',
                url: 'https://api.kraken.com/0/public/Ticker?pair=ETHEUR',
                jsonPath: '$.result.XETHZEUR.c[0]',
            },
        ],
        aggregation: 'median',
        updateFrequency: 'high',
        pricePerUpdate: 0.00015,
    };
    const createHeaders = await tapAgent.signRequest('POST', '/feeds/custom', customFeedRequest);
    const createResponse = await axios.post(`${marketplaceUrl}/feeds/custom`, customFeedRequest, { headers: createHeaders });
    console.log('\nCustom Feed Created:');
    console.log(`  Name: ${createResponse.data.name}`);
    console.log(`  Feed ID: ${createResponse.data.feedId.slice(0, 20)}...`);
    console.log(`  Price: ${createResponse.data.pricePerUpdate} ${createResponse.data.currency}`);
    console.log('\n--- Batch Simulation ---');
    const batchRequest = {
        feedIds: feedsResponse.data.slice(0, 3).map((f) => f.feedId),
    };
    const batchHeaders = await tapAgent.signRequest('POST', '/feeds/batch/simulate', batchRequest);
    const batchResponse = await axios.post(`${marketplaceUrl}/feeds/batch/simulate`, batchRequest, { headers: batchHeaders });
    console.log(`Simulated ${Object.keys(batchResponse.data).length} feeds:`);
    for (const [feedId, result] of Object.entries(batchResponse.data)) {
        const feed = feedsResponse.data.find((f) => f.feedId === feedId);
        console.log(`  ${feed?.name}: $${result.value.toLocaleString()}`);
    }
    console.log('\n--- Discovering Marketplace Services ---');
    const servicesResponse = await axios.get(`${marketplaceUrl}/marketplace/services?category=crypto-price`);
    console.log(`\nFound ${servicesResponse.data.length} services:`);
    for (const service of servicesResponse.data.slice(0, 5)) {
        console.log(`  ${service.name} - ${service.pricePerCall} per call`);
        console.log(`    Reputation: ${service.reputation}/10000`);
    }
}
main().catch(console.error);
//# sourceMappingURL=tap-authenticated-client.js.map