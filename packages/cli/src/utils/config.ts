import Conf from 'conf';
import { Keypair } from '@solana/web3.js';

export interface X402Config {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  rpcUrl?: string;
  registryApiUrl?: string;
  walletPrivateKey?: string;
  agentId?: string;
  did?: string;
  visaTapCert?: string;
}

const config = new Conf<X402Config>({
  projectName: 'x402-upl',
  defaults: {
    network: 'devnet',
  },
});

export function getConfig(): X402Config {
  return {
    network: config.get('network'),
    rpcUrl: config.get('rpcUrl'),
    registryApiUrl: config.get('registryApiUrl'),
    walletPrivateKey: config.get('walletPrivateKey'),
    agentId: config.get('agentId'),
    did: config.get('did'),
    visaTapCert: config.get('visaTapCert'),
  };
}

export function setConfig(key: keyof X402Config, value: string): void {
  config.set(key, value);
}

export function getNetwork(): 'mainnet-beta' | 'devnet' | 'testnet' {
  return config.get('network') || 'devnet';
}

export function setNetwork(network: 'mainnet-beta' | 'devnet' | 'testnet'): void {
  config.set('network', network);
}

export function getWallet(): Keypair | null {
  const privateKey = config.get('walletPrivateKey');
  if (!privateKey) return null;

  try {
    const secretKey = Uint8Array.from(JSON.parse(privateKey));
    return Keypair.fromSecretKey(secretKey);
  } catch {
    return null;
  }
}

export function setWallet(keypair: Keypair): void {
  const secretKey = Array.from(keypair.secretKey);
  config.set('walletPrivateKey', JSON.stringify(secretKey));
}

export function getRegistryApiUrl(): string {
  const customUrl = config.get('registryApiUrl');
  if (customUrl) return customUrl;

  const network = getNetwork();
  return network === 'mainnet-beta'
    ? 'https://api.x402-upl.network'
    : 'https://api-dev.x402-upl.network';
}

export function clearConfig(): void {
  config.clear();
}

export function isConfigured(): boolean {
  return !!config.get('walletPrivateKey');
}
