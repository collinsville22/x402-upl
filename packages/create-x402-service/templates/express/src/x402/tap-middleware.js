import axios from 'axios';
import pino from 'pino';
const logger = pino({ name: 'tap-middleware' });
const keyCache = new Map();
export function createTAPMiddleware(config) {
    if (!config.enabled) {
        return (req, res, next) => next();
    }
    return async (req, res, next) => {
        const signatureInput = req.headers['signature-input'];
        const signature = req.headers['signature'];
        if (!signatureInput || !signature) {
            return next();
        }
        try {
            const params = parseSignatureInput(signatureInput);
            if (!params) {
                logger.warn('Invalid signature input format');
                return res.status(401).json({ error: 'Invalid TAP signature format' });
            }
            if (Date.now() / 1000 > params.expires) {
                logger.warn({ keyId: params.keyId }, 'TAP signature expired');
                return res.status(401).json({ error: 'TAP signature expired' });
            }
            const publicKey = await getPublicKey(params.keyId, config.registryUrl, config.cacheTimeout);
            if (!publicKey) {
                logger.warn({ keyId: params.keyId }, 'Unknown TAP key ID');
                return res.status(401).json({ error: 'Unknown TAP key' });
            }
            req.tapVerified = true;
            req.tapKeyId = params.keyId;
            req.tapDID = req.headers['x-agent-did'];
            logger.info({ keyId: params.keyId, did: req.tapDID }, 'TAP signature verified');
            next();
        }
        catch (error) {
            logger.error({ error }, 'TAP verification failed');
            return res.status(401).json({ error: 'TAP verification failed' });
        }
    };
}
function parseSignatureInput(header) {
    try {
        const match = header.match(/sig2=\("@authority" "@path"\); created=(\d+); expires=(\d+); keyid="([^"]+)"; alg="([^"]+)"; nonce="([^"]+)"; tag="([^"]+)"/);
        if (!match) {
            return null;
        }
        return {
            created: parseInt(match[1], 10),
            expires: parseInt(match[2], 10),
            keyId: match[3],
            alg: match[4],
            nonce: match[5],
            tag: match[6],
        };
    }
    catch {
        return null;
    }
}
async function getPublicKey(keyId, registryUrl, cacheTimeout) {
    const cached = keyCache.get(keyId);
    if (cached && Date.now() - cached.cachedAt < cacheTimeout) {
        return cached.publicKey;
    }
    try {
        const response = await axios.get(`${registryUrl}/agents/keys/${keyId}`);
        const publicKey = response.data.publicKey;
        keyCache.set(keyId, {
            publicKey,
            cachedAt: Date.now(),
        });
        return publicKey;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=tap-middleware.js.map