"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TAPClient = void 0;
const rfc9421_js_1 = require("./rfc9421.js");
const axios_1 = __importDefault(require("axios"));
class TAPClient {
    config;
    httpClient;
    agentIdentity;
    constructor(config, agentIdentity) {
        this.config = config;
        this.agentIdentity = agentIdentity;
        this.httpClient = axios_1.default.create();
    }
    async signRequest(url, method = 'GET') {
        const urlObj = new URL(url);
        const components = {
            authority: urlObj.host,
            path: urlObj.pathname + urlObj.search,
        };
        const now = Math.floor(Date.now() / 1000);
        const params = {
            created: now,
            expires: now + 300,
            keyId: this.config.keyId,
            alg: this.config.algorithm,
            nonce: rfc9421_js_1.RFC9421Signature.generateNonce(),
            tag: 'agent-payer-auth',
        };
        let result;
        if (this.config.algorithm === 'ed25519') {
            if (!(this.config.privateKey instanceof Uint8Array)) {
                throw new Error('Ed25519 requires Uint8Array private key');
            }
            result = await rfc9421_js_1.RFC9421Signature.signEd25519(components, params, this.config.privateKey);
        }
        else {
            if (typeof this.config.privateKey !== 'string') {
                throw new Error('RSA-PSS requires PEM string private key');
            }
            result = await rfc9421_js_1.RFC9421Signature.signRsaPss(components, params, this.config.privateKey);
        }
        return {
            'Signature-Input': result.signatureInput,
            'Signature': result.signature,
        };
    }
    async request(method, url, data, params) {
        const headers = await this.signRequest(url, method);
        if (this.agentIdentity) {
            headers['X-Agent-DID'] = this.agentIdentity.did;
            headers['X-Agent-Cert'] = this.agentIdentity.visaTapCert;
            headers['X-Agent-Wallet'] = this.agentIdentity.walletAddress;
        }
        const response = await this.httpClient.request({
            method,
            url,
            data,
            params,
            headers,
        });
        return response.data;
    }
    async registerAgent(walletAddress, stake) {
        if (!this.config.registryUrl) {
            throw new Error('Registry URL required for agent registration');
        }
        const registrationData = {
            did: this.config.did || `did:x402:${this.config.keyId}`,
            walletAddress,
            visaTapCert: this.config.visaTapCert || this.config.keyId,
            publicKey: this.getPublicKeyString(),
            algorithm: this.config.algorithm,
            stake: stake || 0,
        };
        const response = await this.request('POST', `${this.config.registryUrl}/agents/register`, registrationData);
        this.agentIdentity = response.agent;
        return response.agent;
    }
    async discoverAgents(filters) {
        if (!this.config.registryUrl) {
            throw new Error('Registry URL required for agent discovery');
        }
        const response = await this.request('GET', `${this.config.registryUrl}/agents/discover`, undefined, filters);
        return response.agents;
    }
    getAgentIdentity() {
        return this.agentIdentity;
    }
    getPublicKeyString() {
        if (this.config.algorithm === 'ed25519' && this.config.privateKey instanceof Uint8Array) {
            return Buffer.from(this.config.privateKey).toString('base64');
        }
        return 'public-key-placeholder';
    }
}
exports.TAPClient = TAPClient;
//# sourceMappingURL=tap-client.js.map