import * as ed25519 from '@noble/ed25519';
import * as crypto from 'crypto';

export type SignatureAlgorithm = 'ed25519' | 'rsa-pss-sha256';

export interface SignatureParams {
  created: number;
  expires: number;
  keyId: string;
  alg: SignatureAlgorithm;
  nonce: string;
  tag: 'agent-browser-auth' | 'agent-payer-auth';
}

export interface SignatureComponents {
  authority: string;
  path: string;
}

export interface SignatureResult {
  signatureInput: string;
  signature: string;
}

export class RFC9421Signature {
  static createSignatureBase(
    components: SignatureComponents,
    params: SignatureParams
  ): string {
    const lines: string[] = [];

    lines.push(`"@authority": ${components.authority}`);
    lines.push(`"@path": ${components.path}`);

    const signatureParamsValue = `("@authority" "@path"); created=${params.created}; expires=${params.expires}; keyid="${params.keyId}"; alg="${params.alg}"; nonce="${params.nonce}"; tag="${params.tag}"`;
    lines.push(`"@signature-params": ${signatureParamsValue}`);

    return lines.join('\n');
  }

  static async signEd25519(
    components: SignatureComponents,
    params: SignatureParams,
    privateKey: Uint8Array
  ): Promise<SignatureResult> {
    if (privateKey.length !== 32) {
      throw new Error('Ed25519 private key must be 32 bytes');
    }

    const signatureBase = this.createSignatureBase(components, params);
    const message = new TextEncoder().encode(signatureBase);

    const signature = await ed25519.sign(message, privateKey);
    const signatureB64 = Buffer.from(signature).toString('base64');

    const signatureInput = `sig2=("@authority" "@path"); created=${params.created}; expires=${params.expires}; keyid="${params.keyId}"; alg="${params.alg}"; nonce="${params.nonce}"; tag="${params.tag}"`;

    return {
      signatureInput,
      signature: `sig2=:${signatureB64}:`,
    };
  }

  static async signRsaPss(
    components: SignatureComponents,
    params: SignatureParams,
    privateKeyPem: string
  ): Promise<SignatureResult> {
    const signatureBase = this.createSignatureBase(components, params);

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureBase);
    sign.end();

    const signature = sign.sign(
      {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN,
      },
      'base64'
    );

    const signatureInput = `sig2=("@authority" "@path"); created=${params.created}; expires=${params.expires}; keyid="${params.keyId}"; alg="${params.alg}"; nonce="${params.nonce}"; tag="${params.tag}"`;

    return {
      signatureInput,
      signature: `sig2=:${signature}:`,
    };
  }

  static generateNonce(): string {
    const bytes = crypto.randomBytes(16);
    return bytes.toString('hex');
  }

  static generateEd25519KeyPair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = ed25519.getPublicKey(privateKey);
    return { privateKey, publicKey };
  }

  static generateRsaKeyPair(): { privateKey: string; publicKey: string } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return { privateKey, publicKey };
  }
}
