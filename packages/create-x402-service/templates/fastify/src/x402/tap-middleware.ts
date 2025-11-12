import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import axios from 'axios';
import * as ed25519 from '@noble/ed25519';
import pino from 'pino';

const logger = pino({ name: 'x402-tap' });

export interface TAPConfig {
  registryUrl: string;
  requireTAP: boolean;
  cachePublicKeys: boolean;
  cacheTTL: number;
}

export interface TAPSignatureParams {
  keyId: string;
  algorithm: string;
  created: number;
  expires: number;
  nonce: string;
}

export interface TAPVerificationResult {
  verified: boolean;
  keyId?: string;
  did?: string;
  cert?: string;
  wallet?: string;
  reason?: string;
}

const publicKeyCache = new Map<string, { publicKey: string; timestamp: number }>();

export function createTAPMiddleware(config: TAPConfig) {
  return async (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
    const signatureInput = request.headers['signature-input'] as string | undefined;
    const signature = request.headers['signature'] as string | undefined;

    if (!signatureInput || !signature) {
      if (config.requireTAP) {
        return reply.code(401).send({ error: 'Missing TAP signature headers' });
      }
      return done();
    }

    try {
      const params = parseSignatureInput(signatureInput);

      if (Date.now() / 1000 > params.expires) {
        return reply.code(401).send({ error: 'Signature expired' });
      }

      const publicKey = await getPublicKey(params.keyId, config.registryUrl, config.cachePublicKeys, config.cacheTTL);

      if (!publicKey) {
        return reply.code(401).send({ error: 'Public key not found' });
      }

      const signatureBase = createSignatureBase(request, params);
      const signatureBytes = Buffer.from(signature.replace('sig2=:', '').replace(':', ''), 'base64');
      const messageBytes = Buffer.from(signatureBase, 'utf-8');
      const publicKeyBytes = Buffer.from(publicKey, 'base64');

      const isValid = await ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);

      if (!isValid) {
        return reply.code(401).send({ error: 'Invalid signature' });
      }

      request.headers['x-tap-verified'] = 'true';
      request.headers['x-tap-key-id'] = params.keyId;

      const did = request.headers['x-agent-did'] as string | undefined;
      const cert = request.headers['x-agent-cert'] as string | undefined;
      const wallet = request.headers['x-agent-wallet'] as string | undefined;

      if (did) request.headers['x-tap-did'] = did;
      if (cert) request.headers['x-tap-cert'] = cert;
      if (wallet) request.headers['x-tap-wallet'] = wallet;

      done();
    } catch (error) {
      logger.error({ error }, 'TAP signature verification failed');
      return reply.code(401).send({
        error: error instanceof Error ? error.message : 'Verification error'
      });
    }
  };
}

function parseSignatureInput(signatureInput: string): TAPSignatureParams {
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

function createSignatureBase(request: FastifyRequest, params: TAPSignatureParams): string {
  const authority = request.hostname;
  const path = request.url;
  const method = request.method;

  const lines = [
    `"@method": ${method}`,
    `"@authority": ${authority}`,
    `"@path": ${path}`,
    `"@signature-params": created=${params.created};expires=${params.expires};keyid="${params.keyId}";alg="${params.algorithm}";nonce="${params.nonce}"`,
  ];

  return lines.join('\n');
}

async function getPublicKey(
  keyId: string,
  registryUrl: string,
  useCache: boolean,
  cacheTTL: number
): Promise<string | null> {
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
  } catch (error) {
    logger.warn({ keyId, error }, 'Failed to fetch public key from registry');
    return null;
  }
}

export function clearPublicKeyCache(): void {
  publicKeyCache.clear();
}
