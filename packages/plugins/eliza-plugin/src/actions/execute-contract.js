import { Keypair, Connection, Transaction, SystemProgram, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';
import axios from 'axios';
export const executeContractAction = {
    name: 'EXECUTE_CONTRACT',
    similes: ['FUND_CONTRACT', 'START_WORK', 'PAY_ESCROW'],
    description: 'Fund escrow and initiate contract execution on x402 marketplace',
    validate: async (runtime, message) => {
        const config = runtime.getSetting('X402_REGISTRY_URL');
        const wallet = runtime.getSetting('X402_WALLET_PRIVATE_KEY');
        const rpcUrl = runtime.getSetting('X402_RPC_URL');
        return !!config && !!wallet && !!rpcUrl;
    },
    handler: async (runtime, message, state, options, callback) => {
        const registryUrl = runtime.getSetting('X402_REGISTRY_URL');
        const walletKey = runtime.getSetting('X402_WALLET_PRIVATE_KEY');
        const rpcUrl = runtime.getSetting('X402_RPC_URL');
        const wallet = Keypair.fromSecretKey(Buffer.from(walletKey, 'base64'));
        const connection = new Connection(rpcUrl, 'confirmed');
        const contractId = options?.contractId || state.contractId;
        if (!contractId) {
            await callback({
                text: 'Contract ID required.',
                content: { error: 'Missing contractId' },
            });
            return;
        }
        try {
            const contractResponse = await axios.get(`${registryUrl}/contracts/${contractId}`);
            const contract = contractResponse.data.contract;
            if (!contract) {
                await callback({
                    text: `Contract ${contractId} not found.`,
                    content: { error: 'Contract not found' },
                });
                return;
            }
            if (contract.buyerWallet !== wallet.publicKey.toBase58()) {
                await callback({
                    text: 'You are not the buyer for this contract.',
                    content: { error: 'Unauthorized' },
                });
                return;
            }
            if (contract.status !== 'created') {
                await callback({
                    text: `Contract status is ${contract.status}, cannot fund.`,
                    content: { error: 'Invalid status' },
                });
                return;
            }
            const escrowResponse = await axios.get(`${registryUrl}/escrow/address`);
            const escrowAddress = escrowResponse.data.address;
            const lamports = Math.floor(contract.price * 1_000_000_000);
            const transaction = new Transaction().add(SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: new PublicKey(escrowAddress),
                lamports,
            }));
            const signature = await sendAndConfirmTransaction(connection, transaction, [wallet], { commitment: 'confirmed' });
            await axios.patch(`${registryUrl}/contracts/${contractId}`, {
                status: 'funded',
                escrowSignature: signature,
            });
            await callback({
                text: `Contract funded. Escrow: ${contract.price} SOL. Transaction: ${signature}. Work can now begin.`,
                content: {
                    contract: { ...contract, status: 'funded', escrowSignature: signature },
                },
            });
        }
        catch (error) {
            runtime.logger.error('Failed to execute contract:', error);
            await callback({
                text: 'Failed to fund contract escrow.',
                content: { error: error instanceof Error ? error.message : 'Unknown error' },
            });
        }
    },
    examples: [
        [
            {
                user: '{{user1}}',
                content: { text: 'Fund the contract escrow to start work' },
            },
            {
                user: '{{agent}}',
                content: {
                    text: 'Funding contract escrow...',
                    action: 'EXECUTE_CONTRACT',
                },
            },
            {
                user: '{{agent}}',
                content: {
                    text: 'Contract funded. Escrow: 0.5 SOL. Work can now begin.',
                },
            },
        ],
    ],
};
//# sourceMappingURL=execute-contract.js.map