import { useWalletStore } from '@/store/wallet';
import nacl from 'tweetnacl';

export async function getAuthToken(): Promise<string> {
  const { publicKey, privateKey } = useWalletStore.getState();

  if (!publicKey || !privateKey) {
    throw new Error('Wallet not connected');
  }

  const message = `x402-auth:${Date.now()}`;
  const messageBytes = new TextEncoder().encode(message);

  const { Keypair } = await import('@solana/web3.js');
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(privateKey))
  );

  const signature = nacl.sign.detached(messageBytes, keypair.secretKey);

  return `${publicKey}:${Buffer.from(signature).toString('hex')}:${message}`;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return {
    'Authorization': `Bearer ${token}`
  };
}
