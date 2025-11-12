import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { prisma } from '../db/client.js';
import crypto from 'crypto';
export async function verifyWalletSignature(request, reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
            error: 'Missing or invalid authorization header',
            message: 'Expected: Authorization: Bearer <wallet>:<signature>:<message>'
        });
    }
    const token = authHeader.substring(7);
    const parts = token.split(':');
    if (parts.length !== 3) {
        return reply.status(401).send({
            error: 'Invalid authorization format',
            message: 'Expected: <wallet>:<signature>:<message>'
        });
    }
    const [walletAddress, signatureHex, message] = parts;
    try {
        const publicKey = new PublicKey(walletAddress);
        const signature = Buffer.from(signatureHex, 'hex');
        const messageBytes = Buffer.from(message, 'utf8');
        const verified = nacl.sign.detached.verify(messageBytes, signature, publicKey.toBytes());
        if (!verified) {
            return reply.status(401).send({
                error: 'Invalid signature',
                message: 'Signature verification failed'
            });
        }
        const timestamp = parseInt(message.split(':')[1] || '0');
        const now = Date.now();
        if (Math.abs(now - timestamp) > 300000) {
            return reply.status(401).send({
                error: 'Signature expired',
                message: 'Signature must be less than 5 minutes old'
            });
        }
        request.wallet = walletAddress;
    }
    catch (error) {
        return reply.status(401).send({
            error: 'Authentication failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
export async function verifyApiKey(request, reply) {
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) {
        return reply.status(401).send({
            error: 'Missing API key',
            message: 'Include X-API-Key header'
        });
    }
    if (!apiKey.startsWith('x402_')) {
        return reply.status(401).send({
            error: 'Invalid API key format',
            message: 'API key must start with x402_'
        });
    }
    try {
        const keyHash = hashApiKey(apiKey);
        const apiKeyRecord = await prisma.apiKey.findUnique({
            where: { keyHash }
        });
        if (!apiKeyRecord) {
            return reply.status(401).send({
                error: 'Invalid API key',
                message: 'API key not found or revoked'
            });
        }
        if (apiKeyRecord.revoked) {
            return reply.status(401).send({
                error: 'API key revoked',
                message: 'This API key has been revoked'
            });
        }
        if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
            return reply.status(401).send({
                error: 'API key expired',
                message: 'This API key has expired'
            });
        }
        await prisma.apiKey.update({
            where: { id: apiKeyRecord.id },
            data: { lastUsedAt: new Date() }
        });
        request.wallet = apiKeyRecord.merchantWallet;
        request.permissions = apiKeyRecord.permissions;
    }
    catch (error) {
        request.log.error('API key verification error:', error);
        return reply.status(500).send({
            error: 'Authentication error',
            message: 'Internal server error'
        });
    }
}
export async function optionalAuth(request, reply) {
    const authHeader = request.headers.authorization;
    const apiKey = request.headers['x-api-key'];
    if (apiKey) {
        try {
            await verifyApiKey(request, reply);
        }
        catch (error) {
        }
    }
    else if (authHeader) {
        try {
            await verifyWalletSignature(request, reply);
        }
        catch (error) {
        }
    }
}
export function requirePermission(permission) {
    return async (request, reply) => {
        const authReq = request;
        if (!authReq.permissions || !authReq.permissions.includes(permission)) {
            return reply.status(403).send({
                error: 'Insufficient permissions',
                message: `Required permission: ${permission}`,
                currentPermissions: authReq.permissions || []
            });
        }
    };
}
export function hashApiKey(apiKey) {
    const salt = process.env.API_KEY_SALT || 'x402-default-salt-change-in-production';
    return crypto
        .createHmac('sha256', salt)
        .update(apiKey)
        .digest('hex');
}
export function generateApiKey() {
    const randomBytes = crypto.randomBytes(32);
    return 'x402_' + randomBytes.toString('base64')
        .replace(/\+/g, '')
        .replace(/\//g, '')
        .replace(/=/g, '')
        .substring(0, 40);
}
export async function requireWalletOwnership(request, reply, resourceWallet) {
    const authReq = request;
    if (!authReq.wallet) {
        reply.status(401).send({
            error: 'Authentication required',
            message: 'Must be authenticated to access this resource'
        });
        return false;
    }
    if (authReq.wallet !== resourceWallet) {
        const adminWallets = (process.env.ADMIN_WALLET_ADDRESSES || '').split(',');
        if (!adminWallets.includes(authReq.wallet)) {
            reply.status(403).send({
                error: 'Access denied',
                message: 'You do not have permission to access this resource'
            });
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=auth.js.map