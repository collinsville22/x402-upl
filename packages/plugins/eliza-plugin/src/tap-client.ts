import { IAgentRuntime } from '@ai16z/eliza';
import axios, { AxiosInstance } from 'axios';
import * as ed25519 from '@noble/ed25519';
import * as crypto from 'crypto';

export interface TAPSignatureParams {
  created: number;
  expires: number;
  keyId: string;
  alg: string;
  nonce: string;
  tag: string;
}

export class TAPClient {
  private runtime: IAgentRuntime;
  private httpClient: AxiosInstance;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
    this.httpClient = axios.create();
  }

  private async signRequest(url: string, method: 'GET' | 'POST' = 'POST'): Promise<Record<string, string>> {
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
    const params: TAPSignatureParams = {
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

    const headers: Record<string, string> = {
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

  private createSignatureBase(
    components: { authority: string; path: string },
    params: TAPSignatureParams
  ): string {
    const lines: string[] = [];

    lines.push(`"@authority": ${components.authority}`);
    lines.push(`"@path": ${components.path}`);

    const signatureParamsValue = `("@authority" "@path"); created=${params.created}; expires=${params.expires}; keyid="${params.keyId}"; alg="${params.alg}"; nonce="${params.nonce}"; tag="${params.tag}"`;
    lines.push(`"@signature-params": ${signatureParamsValue}`);

    return lines.join('\n');
  }

  private generateNonce(): string {
    const bytes = crypto.randomBytes(16);
    return bytes.toString('hex');
  }

  async request<T = any>(
    method: 'GET' | 'POST',
    url: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
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
