import axios from 'axios';
import * as ed25519 from '@noble/ed25519';
import * as crypto from 'crypto';
export class TAPClient {
    runtime;
    httpClient;
    constructor(runtime) {
        this.runtime = runtime;
        this.httpClient = axios.create();
    }
    async signRequest(url, method = 'POST') {
        const tapPrivateKey = this.runtime.getSetting('X402_TAP_PRIVATE_KEY');
        const tapKeyId = this.runtime.getSetting('X402_TAP_KEY_ID');
        const did = this.runtime.getSetting('X402_DID');
        const visaTapCert = this.runtime.getSetting('X402_VISA_TAP_CERT');
        if (!tapPrivateKey || !tapKeyId) {
            return {};
        }
        const urlObj = new URL(url);
        const components = {
            authority: urlObj.host,
            path: urlObj.pathname + urlObj.search,
        };
        const now = Math.floor(Date.now() / 1000);
        const params = {
            created: now,
            expires: now + 300,
            keyId: tapKeyId,
            alg: 'ed25519',
            nonce: this.generateNonce(),
            tag: 'agent-payer-auth',
        };
        const signatureBase = this.createSignatureBase(components, params);
        const message = new TextEncoder().encode(signatureBase);
        const privateKey = Buffer.from(tapPrivateKey, 'base64');
        const signature = await ed25519.sign(message, privateKey);
        const signatureB64 = Buffer.from(signature).toString('base64');
        const signatureInput = `sig2=("@authority" "@path"); created=${params.created}; expires=${params.expires}; keyid="${params.keyId}"; alg="${params.alg}"; nonce="${params.nonce}"; tag="${params.tag}"`;
        const headers = {
            'Signature-Input': signatureInput,
            'Signature': `sig2=:${signatureB64}:`,
        };
        if (did) {
            headers['X-Agent-DID'] = did;
        }
        if (visaTapCert) {
            headers['X-Agent-Cert'] = visaTapCert;
        }
        return headers;
    }
    createSignatureBase(components, params) {
        const lines = [];
        lines.push(`"@authority": ${components.authority}`);
        lines.push(`"@path": ${components.path}`);
        const signatureParamsValue = `("@authority" "@path"); created=${params.created}; expires=${params.expires}; keyid="${params.keyId}"; alg="${params.alg}"; nonce="${params.nonce}"; tag="${params.tag}"`;
        lines.push(`"@signature-params": ${signatureParamsValue}`);
        return lines.join('\n');
    }
    generateNonce() {
        const bytes = crypto.randomBytes(16);
        return bytes.toString('hex');
    }
    async request(method, url, data, params) {
        const tapEnabled = this.runtime.getSetting('X402_ENABLE_TAP') === 'true';
        const headers = tapEnabled ? await this.signRequest(url, method) : {};
        const response = await this.httpClient.request({
            method,
            url,
            data,
            params,
            headers,
        });
        return response.data;
    }
}
//# sourceMappingURL=tap-client.js.map