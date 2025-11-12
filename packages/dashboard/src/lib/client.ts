import { X402Client, X402ClientConfig } from '@x402-upl/sdk';
import { useWalletStore } from '@/store/wallet';
import { useNetworkStore } from '@/store/network';

export function createClient(): X402Client {
  const wallet = useWalletStore.getState().getKeypair();
  const network = useNetworkStore.getState().network;
  const rpcUrl = useNetworkStore.getState().getDefaultRpcUrl();
  const registryApiUrl = useNetworkStore.getState().getDefaultRegistryApiUrl();

  const config: X402ClientConfig = {
    network,
    rpcUrl,
    registryApiUrl,
    wallet: wallet || undefined,
  };

  return new X402Client(config);
}

export function useClient(): X402Client {
  return createClient();
}
