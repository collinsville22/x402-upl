"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCommand = verifyCommand;
const commander_1 = require("commander");
const web3_js_1 = require("@solana/web3.js");
const spinner_js_1 = require("../utils/spinner.js");
function verifyCommand() {
    return new commander_1.Command('verify')
        .description('Verify a Solana transaction')
        .argument('<signature>', 'Transaction signature')
        .option('-n, --network <network>', 'Network (devnet|mainnet-beta|testnet)', 'devnet')
        .option('-a, --amount <amount>', 'Expected amount in SOL')
        .option('-r, --recipient <address>', 'Expected recipient address')
        .action(async (signature, options) => {
        const spinner = (0, spinner_js_1.startSpinner)('Verifying transaction...');
        try {
            const rpcUrls = {
                'mainnet-beta': 'https://api.mainnet-beta.solana.com',
                'devnet': 'https://api.devnet.solana.com',
                'testnet': 'https://api.testnet.solana.com'
            };
            const connection = new web3_js_1.Connection(rpcUrls[options.network] || rpcUrls.devnet, 'confirmed');
            const tx = await connection.getTransaction(signature, {
                commitment: 'confirmed',
            });
            if (!tx || !tx.meta) {
                (0, spinner_js_1.stopSpinner)(spinner, 'error');
                console.error('Transaction not found or not confirmed');
                process.exit(1);
            }
            (0, spinner_js_1.stopSpinner)(spinner, 'success');
            console.log('\nTransaction verified!');
            console.log('Signature:', signature);
            console.log('Block time:', new Date(tx.blockTime * 1000).toISOString());
            console.log('Slot:', tx.slot);
            console.log('Fee:', tx.meta.fee / web3_js_1.LAMPORTS_PER_SOL, 'SOL');
            if (tx.meta.err) {
                console.log('Status: FAILED');
                console.log('Error:', tx.meta.err);
            }
            else {
                console.log('Status: SUCCESS');
            }
            console.log('\nBalance changes:');
            tx.transaction.message.accountKeys.forEach((key, index) => {
                const preBalance = tx.meta.preBalances[index];
                const postBalance = tx.meta.postBalances[index];
                const change = (postBalance - preBalance) / web3_js_1.LAMPORTS_PER_SOL;
                if (change !== 0) {
                    console.log(`  ${key.toBase58()}: ${change > 0 ? '+' : ''}${change} SOL`);
                    if (options.recipient && key.toBase58() === options.recipient) {
                        if (options.amount) {
                            const expectedAmount = parseFloat(options.amount);
                            if (Math.abs(change - expectedAmount) < 0.000001) {
                                console.log('    ✓ Amount matches expected:', expectedAmount, 'SOL');
                            }
                            else {
                                console.log('    ✗ Amount mismatch. Expected:', expectedAmount, 'SOL');
                            }
                        }
                        else {
                            console.log('    ✓ Recipient address matches');
                        }
                    }
                }
            });
            if (tx.meta.logMessages) {
                console.log('\nLog messages:');
                tx.meta.logMessages.slice(0, 5).forEach(msg => {
                    console.log(`  ${msg}`);
                });
                if (tx.meta.logMessages.length > 5) {
                    console.log(`  ... ${tx.meta.logMessages.length - 5} more messages`);
                }
            }
            console.log('\nExplorer URL:');
            console.log(`  https://explorer.solana.com/tx/${signature}?cluster=${options.network}`);
        }
        catch (error) {
            (0, spinner_js_1.stopSpinner)(spinner, 'error');
            console.error('Verification failed:', error.message);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=verify.js.map