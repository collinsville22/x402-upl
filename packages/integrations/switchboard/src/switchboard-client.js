import { Connection, PublicKey } from '@solana/web3.js';
import * as sb from '@switchboard-xyz/on-demand';
import { CrossbarClient } from '@switchboard-xyz/common';
import { OracleJob } from '@switchboard-xyz/common';
export class SwitchboardOracleClient {
    connection;
    crossbar;
    queue;
    luts = new Map();
    network;
    constructor(rpcUrl, queueKey, network = 'mainnet-beta') {
        this.connection = new Connection(rpcUrl, 'confirmed');
        this.queue = new sb.Queue(new PublicKey(queueKey));
        this.crossbar = new CrossbarClient('https://crossbar.switchboard.xyz');
        this.network = network;
    }
    async initialize() {
        try {
            const lut = await this.queue.loadLookupTable();
            this.luts.set('queue', lut);
        }
        catch (error) {
            console.error('Failed to load lookup table:', error);
        }
    }
    async createFeedFromJob(job) {
        const oracleJob = this.buildOracleJob(job);
        const jobData = OracleJob.encodeDelimited(oracleJob).finish();
        const feedHash = sb.FeedHash.compute(jobData);
        return feedHash.toString('hex');
    }
    buildOracleJob(job) {
        return OracleJob.fromObject({
            name: job.name,
            tasks: job.tasks.map(task => {
                const taskObj = {};
                if (task.httpTask) {
                    taskObj.httpTask = {
                        url: task.httpTask.url,
                        method: this.mapHttpMethod(task.httpTask.method),
                        headers: task.httpTask.headers || [],
                        body: task.httpTask.body,
                    };
                }
                if (task.jsonParseTask) {
                    taskObj.jsonParseTask = {
                        path: task.jsonParseTask.path,
                    };
                }
                if (task.medianTask) {
                    taskObj.medianTask = {
                        tasks: task.medianTask.tasks.map(t => this.buildOracleJob({ name: '', tasks: [t] }).tasks[0]),
                    };
                }
                if (task.multiplyTask) {
                    taskObj.multiplyTask = {
                        scalar: task.multiplyTask.scalar,
                    };
                }
                if (task.divideTask) {
                    taskObj.divideTask = {
                        scalar: task.divideTask.scalar,
                    };
                }
                if (task.cacheTask) {
                    taskObj.cacheTask = {
                        cacheItems: [{ variableName: task.cacheTask.variableName }],
                    };
                }
                return taskObj;
            }),
        });
    }
    mapHttpMethod(method) {
        const methodMap = {
            'GET': 1,
            'POST': 2,
            'PUT': 3,
            'DELETE': 4,
        };
        return methodMap[method || 'GET'] || 1;
    }
    async simulateFeed(feedHash, variables) {
        try {
            const result = await this.crossbar.simulateFeed([feedHash], this.network, variables);
            return {
                feedId: feedHash,
                value: parseFloat(result.results[0].value.toString()),
                timestamp: result.results[0].timestamp,
                slot: 0,
                signatures: 0,
                cost: 0,
            };
        }
        catch (error) {
            throw new Error(`Feed simulation failed: ${error}`);
        }
    }
    async fetchFeedUpdate(request, payer) {
        const feedHash = Buffer.from(request.feedId.replace('0x', ''), 'hex');
        const oraclePubkey = sb.OracleQuote.getCanonicalPubkey(feedHash);
        try {
            const [quoteFetchIx, quoteStoreIx] = await this.queue.fetchManagedUpdateIxs({
                feeds: [request.feedId],
                payer: payer.publicKey,
                numSignatures: request.numSignatures || 3,
                gateway: 'https://gateway.switchboard.xyz',
            });
            const tx = await sb.asV0Tx({
                connection: this.connection,
                ixs: [quoteFetchIx, quoteStoreIx],
                payer: payer.publicKey,
                lookupTables: Array.from(this.luts.values()),
                computeUnitPrice: 20_000,
                computeUnitLimitMultiple: 1.2,
            });
            const signature = await this.connection.sendTransaction(tx, [payer], {
                skipPreflight: false,
                maxRetries: 3,
            });
            await this.connection.confirmTransaction(signature, 'confirmed');
            const quoteAccount = await this.connection.getAccountInfo(oraclePubkey);
            if (!quoteAccount) {
                throw new Error('Failed to fetch quote account');
            }
            const price = await this.simulateFeed(request.feedId);
            return {
                feedId: request.feedId,
                value: price.value,
                timestamp: Date.now(),
                slot: 0,
                signatures: request.numSignatures || 3,
                cost: 0.000008,
                transactionSignature: signature,
            };
        }
        catch (error) {
            throw new Error(`Feed update failed: ${error}`);
        }
    }
    async createCustomFeed(config) {
        const tasks = [];
        for (const source of config.dataSources) {
            tasks.push({
                httpTask: {
                    url: source.url,
                    headers: source.headers || [],
                },
            });
            tasks.push({
                jsonParseTask: {
                    path: source.jsonPath,
                },
            });
            tasks.push({
                cacheTask: {
                    variableName: `SOURCE_${source.name}`,
                },
            });
        }
        if (config.dataSources.length > 1) {
            if (config.aggregation === 'median') {
                tasks.push({
                    medianTask: {
                        tasks: config.dataSources.map(s => ({
                            cacheTask: { variableName: `SOURCE_${s.name}` },
                        })),
                    },
                });
            }
        }
        for (const transform of config.transformations || []) {
            if (transform.type === 'multiply') {
                tasks.push({
                    multiplyTask: { scalar: transform.value },
                });
            }
            else if (transform.type === 'divide') {
                tasks.push({
                    divideTask: { scalar: transform.value },
                });
            }
        }
        const job = {
            name: config.name,
            tasks,
        };
        const feedHash = await this.createFeedFromJob(job);
        const frequencies = {
            realtime: 0.001,
            high: 0.0005,
            medium: 0.0002,
            low: 0.0001,
        };
        return {
            feedId: `0x${feedHash}`,
            feedHash: `0x${feedHash}`,
            name: config.name,
            description: config.description,
            category: 'custom',
            job,
            pricePerUpdate: config.pricePerUpdate || frequencies[config.updateFrequency],
            currency: 'CASH',
            updateFrequency: config.updateFrequency,
            minSignatures: 3,
            maxStaleness: 25,
            owner: '',
        };
    }
    async batchSimulateFeeds(feedHashes) {
        const results = [];
        for (const feedHash of feedHashes) {
            try {
                const result = await this.simulateFeed(feedHash);
                results.push(result);
            }
            catch (error) {
                console.error(`Failed to simulate feed ${feedHash}:`, error);
            }
        }
        return results;
    }
    getOraclePubkey(feedHash) {
        const hash = Buffer.from(feedHash.replace('0x', ''), 'hex');
        return sb.OracleQuote.getCanonicalPubkey(hash);
    }
}
//# sourceMappingURL=switchboard-client.js.map