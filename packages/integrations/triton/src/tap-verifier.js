import { createVerify } from 'crypto';
import axios from 'axios';
import { RedisSignatureStore, InMemorySignatureStore } from '@x402-upl/core';
export class TAPVerifier {
    registryUrl;
    identityCache = new Map();
    nonceStore;
    cacheTimeout = 3600000;
    constructor(registryUrl = 'http://localhost:8001', redisUrl) {
        this.registryUrl = registryUrl;
        if (redisUrl) {
            this.nonceStore = new RedisSignatureStore(redisUrl, 'tap:nonces:');
        }
        else {
            this.nonceStore = new InMemorySignatureStore();
        }
        this.startNonceCleanup();
    }
    async verifySignature(method, path, headers, body) {
        const signatureHeader = headers['signature'] || headers['Signature'];
        if (!signatureHeader) {
            return { valid: false, error: 'No signature header present' };
        }
        const signature = this.parseSignature(signatureHeader);
        if (!signature) {
            return { valid: false, error: 'Invalid signature format' };
        }
        if (signature.expires && Date.now() > signature.expires * 1000) {
            return { valid: false, error: 'Signature expired' };
        }
        if (signature.nonce && await this.nonceStore.has(signature.nonce)) {
            return { valid: false, error: 'Nonce already used (replay attack)' };
        }
        const identity = await this.getIdentity(signature.keyId);
        if (!identity) {
            return { valid: false, error: 'Unknown key ID' };
        }
        if (identity.algorithm !== signature.algorithm) {
            return { valid: false, error: 'Algorithm mismatch' };
        }
        const signatureBase = this.buildSignatureBase(method, path, headers, signature.headers, signature.created, signature.nonce, body);
        const isValid = this.verifySignatureData(signatureBase, signature.signature, identity.publicKey, signature.algorithm);
        if (isValid && signature.nonce) {
            await this.nonceStore.add(signature.nonce, 86400);
        }
        return {
            valid: isValid,
            identity: isValid ? identity : undefined,
            error: isValid ? undefined : 'Signature verification failed',
        };
    }
    parseSignature(header) {
        try {
            const parts = {};
            header.split(',').forEach(part => {
                const [key, ...valueParts] = part.trim().split('=');
                const value = valueParts.join('=').replace(/^"|"$/g, '');
                parts[key] = value;
            });
            if (!parts.keyid || !parts.algorithm || !parts.signature || !parts.headers || !parts.created) {
                return null;
            }
            return {
                keyId: parts.keyid,
                algorithm: parts.algorithm,
                signature: parts.signature,
                headers: parts.headers.split(' '),
                created: parseInt(parts.created, 10),
                expires: parts.expires ? parseInt(parts.expires, 10) : undefined,
                nonce: parts.nonce,
                tag: parts.tag,
            };
        }
        catch (error) {
            return null;
        }
    }
    buildSignatureBase(method, path, headers, signedHeaders, created, nonce, body) {
        const lines = [];
        for (const headerName of signedHeaders) {
            const lowerName = headerName.toLowerCase();
            if (lowerName === '@method') {
                lines.push(`"@method": ${method}`);
            }
            else if (lowerName === '@path') {
                lines.push(`"@path": ${path}`);
            }
            else if (lowerName === '@authority') {
                const authority = headers['host'] || headers['Host'];
                lines.push(`"@authority": ${authority}`);
            }
            else if (lowerName === 'content-digest' && body) {
                const digest = headers['content-digest'] || headers['Content-Digest'];
                lines.push(`"content-digest": ${digest}`);
            }
            else {
                const value = headers[lowerName] || headers[headerName];
                if (value) {
                    lines.push(`"${lowerName}": ${value}`);
                }
            }
        }
        lines.push(`"@signature-params": (${signedHeaders.join(' ')});created=${created}${nonce ? `;nonce="${nonce}"` : ''}`);
        return lines.join('\n');
    }
    verifySignatureData(data, signature, publicKey, algorithm) {
        try {
            if (algorithm === 'ed25519') {
                const { verify } = require('crypto');
                const verifier = verify(null, Buffer.from(data), {
                    key: this.formatPublicKey(publicKey, 'ed25519'),
                    format: 'pem',
                });
                return verifier.verify(Buffer.from(signature, 'base64'));
            }
            else if (algorithm === 'rsa-pss-sha256') {
                const verifier = createVerify('SHA256');
                verifier.update(data);
                return verifier.verify({
                    key: this.formatPublicKey(publicKey, 'rsa'),
                    format: 'pem',
                    padding: require('crypto').constants.RSA_PKCS1_PSS_PADDING,
                }, signature, 'base64');
            }
            return false;
        }
        catch (error) {
            return false;
        }
    }
    formatPublicKey(key, type) {
        if (key.includes('BEGIN PUBLIC KEY')) {
            return key;
        }
        if (type === 'ed25519') {
            return `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
        }
        else {
            return `-----BEGIN RSA PUBLIC KEY-----\n${key}\n-----END RSA PUBLIC KEY-----`;
        }
    }
    async getIdentity(keyId) {
        const cached = this.identityCache.get(keyId);
        if (cached) {
            return cached;
        }
        try {
            const response = await axios.get(`${this.registryUrl}/agents/key/${keyId}`);
            const identity = response.data;
            this.identityCache.set(keyId, identity);
            setTimeout(() => {
                this.identityCache.delete(keyId);
            }, this.cacheTimeout);
            return identity;
        }
        catch (error) {
            return null;
        }
    }
    startNonceCleanup() {
        setInterval(async () => {
            await this.nonceStore.clear();
        }, 3600000);
    }
    async clearCache() {
        this.identityCache.clear();
        await this.nonceStore.clear();
    }
    async disconnect() {
        if ('disconnect' in this.nonceStore && typeof this.nonceStore.disconnect === 'function') {
            await this.nonceStore.disconnect();
        }
    }
}
//# sourceMappingURL=tap-verifier.js.map