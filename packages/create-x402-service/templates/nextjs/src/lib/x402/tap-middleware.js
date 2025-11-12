import axios from 'axios';
import * as ed25519 from '@noble/ed25519';
import pino from 'pino';
const logger = pino({ name: 'x402-tap' });
const publicKeyCache = new Map();
export async function verifyTAPSignature(request, config) {
    const signatureInput = request.headers.get('signature-input');
    const signature = request.headers.get('signature');
    if (!signatureInput || !signature) {
        if (config.requireTAP) {
            return { verified: false, reason: 'Missing TAP signature headers' };
        }
        return { verified: true };
    }
    try {
        const params = parseSignatureInput(signatureInput);
        if (Date.now() / 1000 > params.expires) {
            return { verified: false, reason: 'Signature expired' };
        }
        const publicKey = await getPublicKey(params.keyId, config.registryUrl, config.cachePublicKeys, config.cacheTTL);
        if (!publicKey) {
            return { verified: false, reason: 'Public key not found' };
        }
        const signatureBase = await createSignatureBase(request, params);
        const signatureBytes = Buffer.from(signature.replace('sig2=:', '').replace(':', ''), 'base64');
        const messageBytes = Buffer.from(signatureBase, 'utf-8');
        const publicKeyBytes = Buffer.from(publicKey, 'base64');
        const isValid = await ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
        if (!isValid) {
            return { verified: false, reason: 'Invalid signature' };
        }
        return {
            verified: true,
            keyId: params.keyId,
            did: request.headers.get('x-agent-did') || undefined,
            cert: request.headers.get('x-agent-cert') || undefined,
            wallet: request.headers.get('x-agent-wallet') || undefined,
        };
    }
    catch (error) {
        logger.error({ error }, 'TAP signature verification failed');
        return { verified: false, reason: error instanceof Error ? error.message : 'Verification error' };
    }
}
function parseSignatureInput(signatureInput) {
    const match = signatureInput.match(/sig2=\((.*?)\);created=(\d+);expires=(\d+);keyid="(.*?)";alg="(.*?)";nonce="(.*?)"/);
    if (!match) {
        throw new Error('Invalid signature-input format');
    }
    return {
        keyId: match[4],
        algorithm: match[5],
        created: parseInt(match[2], 10),
        expires: parseInt(match[3], 10),
        nonce: match[6],
    };
}
async function createSignatureBase(request, params) {
    const url = new URL(request.url);
    const authority = url.host;
    const path = url.pathname + url.search;
    const method = request.method;
    const lines = [
        `"@method": ${method}`,
        `"@authority": ${authority}`,
        `"@path": ${path}`,
        `"@signature-params": created=${params.created};expires=${params.expires};keyid="${params.keyId}";alg="${params.algorithm}";nonce="${params.nonce}"`,
    ];
    return lines.join('\n');
}
async function getPublicKey(keyId, registryUrl, useCache, cacheTTL) {
    if (useCache) {
        const cached = publicKeyCache.get(keyId);
        if (cached && Date.now() - cached.timestamp < cacheTTL) {
            return cached.publicKey;
        }
    }
    try {
        const response = await axios.get(`${registryUrl}/agents/${keyId}/public-key`, {
            timeout: 5000,
        });
        const publicKey = response.data.publicKey;
        if (useCache) {
            publicKeyCache.set(keyId, { publicKey, timestamp: Date.now() });
        }
        return publicKey;
    }
    catch (error) {
        logger.warn({ keyId, error }, 'Failed to fetch public key from registry');
        return null;
    }
}
export function clearPublicKeyCache() {
    publicKeyCache.clear();
}
//# sourceMappingURL=tap-middleware.js.map