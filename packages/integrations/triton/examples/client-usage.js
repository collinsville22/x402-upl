import { Keypair, Connection } from '@solana/web3.js';
import { VisaTAPAgent } from '@x402-upl/visa-tap-agent';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
async function main() {
    const proxyUrl = 'http://localhost:3002';
    const solanaRpc = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const wallet = Keypair.generate();
    const tapAgent = new VisaTAPAgent({
        registryUrl: 'http://localhost:8001',
        name: 'Old Faithful Test Client',
        domain: 'test-client.x402.local',
        description: 'Test client for Old Faithful x402 integration',
        contactEmail: 'test@x402.local',
        algorithm: 'ed25519',
    });
    await tapAgent.register();
    console.log(`TAP Agent registered: ${tapAgent.getTAPIdentity()?.keyId}`);
    const rpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBlock',
        params: [100000, { maxSupportedTransactionVersion: 0 }],
    };
    try {
        const headers = await tapAgent.signRequest('POST', '/', rpcRequest);
        const response = await axios.post(proxyUrl, rpcRequest, {
            headers,
            validateStatus: () => true,
        });
        if (response.status === 402) {
            console.log('Payment required:');
            console.log(`Amount: ${response.data.error.data.amount} CASH`);
            console.log(`Recipient: ${response.data.error.data.recipient}`);
            console.log(`Request ID: ${response.data.error.data.requestId}`);
            const connection = new Connection(solanaRpc, 'confirmed');
            console.log('Simulating CASH payment...');
            const paymentProof = {
                signature: 'mock_signature_' + Date.now(),
                amount: response.data.error.data.amount,
                sender: wallet.publicKey.toBase58(),
                recipient: response.data.error.data.recipient,
                mint: response.data.error.data.mint,
                timestamp: Date.now(),
                requestId: response.data.error.data.requestId,
            };
            const retryHeaders = await tapAgent.signRequest('POST', '/', rpcRequest);
            retryHeaders['X-Payment-Proof'] = JSON.stringify(paymentProof);
            const retryResponse = await axios.post(proxyUrl, rpcRequest, {
                headers: retryHeaders,
            });
            console.log('Block data received:');
            console.log(`Block height: ${retryResponse.data.result?.blockHeight}`);
            console.log(`Transactions: ${retryResponse.data.result?.transactions?.length || 0}`);
        }
        else if (response.status === 200) {
            console.log('Request successful (no payment required)');
            console.log(response.data);
        }
        else {
            console.error('Error:', response.data);
        }
    }
    catch (error) {
        console.error('Request failed:', error.message);
    }
}
main().catch(console.error);
//# sourceMappingURL=client-usage.js.map