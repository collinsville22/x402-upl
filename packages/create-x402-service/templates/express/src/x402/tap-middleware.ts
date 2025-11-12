import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import pino from 'pino';

const logger = pino({ name: 'tap-middleware' });

export interface TAPConfig {
  enabled: boolean;
  registryUrl: string;
  cacheTimeout: number;
}

interface TAPParams {
  created: number;
  expires: number;
  keyId: string;
  alg: string;
  nonce: string;
  tag: string;
}

const keyCache = new Map<string, { publicKey: string; cachedAt: number }>();

export function createTAPMiddleware(config: TAPConfig) {
  if (!config.enabled) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const signatureInput = req.headers['signature-input'] as string;
    const signature = req.headers['signature'] as string;

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
      req.tapDID = req.headers['x-agent-did'] as string;

      logger.info(
        { keyId: params.keyId, did: req.tapDID },
        'TAP signature verified'
      );

      next();
    } catch (error) {
      logger.error({ error }, 'TAP verification failed');
      return res.status(401).json({ error: 'TAP verification failed' });
    }
  };
}

function parseSignatureInput(header: string): TAPParams | null {
  try {
    const match = header.match(
      /sig2=\("@authority" "@path"\); created=(\d+); expires=(\d+); keyid="([^"]+)"; alg="([^"]+)"; nonce="([^"]+)"; tag="([^"]+)"/
    );

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
  } catch {
    return null;
  }
}

async function getPublicKey(
  keyId: string,
  registryUrl: string,
  cacheTimeout: number
): Promise<string | null> {
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
  } catch {
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      tapVerified?: boolean;
      tapKeyId?: string;
      tapDID?: string;
    }
  }
}
