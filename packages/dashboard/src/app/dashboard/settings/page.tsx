'use client';

import { useState, useEffect } from 'react';
import { useWalletStore } from '@/store/wallet';
import { useNetworkStore } from '@/store/network';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { getAuthHeaders } from '@/lib/auth';

export default function SettingsPage() {
  const {
    publicKey,
    agentId,
    did,
    setWallet,
    setAgentId,
    setDid,
    clearWallet,
  } = useWalletStore();

  const {
    network,
    rpcUrl,
    registryApiUrl,
    setNetwork,
    setRpcUrl,
    setRegistryApiUrl,
  } = useNetworkStore();

  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [customRpcUrl, setCustomRpcUrl] = useState(rpcUrl || '');
  const [customRegistryUrl, setCustomRegistryUrl] = useState(registryApiUrl || '');
  const [newKeyName, setNewKeyName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  const FACILITATOR_URL = process.env.NEXT_PUBLIC_FACILITATOR_URL || 'http://localhost:4001';

  const { data: apiKeys, refetch: refetchKeys } = useQuery({
    queryKey: ['api-keys', publicKey],
    queryFn: async () => {
      if (!publicKey) return [];
      const headers = await getAuthHeaders();
      const response = await fetch(`${FACILITATOR_URL}/api/keys`, { headers });
      if (!response.ok) return [];
      const data = await response.json();
      return data.apiKeys || [];
    },
    enabled: !!publicKey
  });

  const { data: webhookConfig } = useQuery({
    queryKey: ['webhook-config', publicKey],
    queryFn: async () => {
      if (!publicKey) return null;
      const headers = await getAuthHeaders();
      const response = await fetch(`${FACILITATOR_URL}/api/webhooks/config`, { headers });
      if (response.ok) {
        const data = await response.json();
        return data.webhookConfig;
      }
      return null;
    },
    enabled: !!publicKey
  });

  useEffect(() => {
    if (webhookConfig) {
      setWebhookUrl(webhookConfig.webhookUrl || '');
    }
  }, [webhookConfig]);

  const handleImportWallet = () => {
    try {
      const secretKey = Uint8Array.from(JSON.parse(privateKeyInput));

      const { Keypair } = require('@solana/web3.js');
      const keypair = Keypair.fromSecretKey(secretKey);

      setWallet(
        JSON.stringify(Array.from(secretKey)),
        keypair.publicKey.toBase58()
      );

      toast.success('Wallet imported successfully');
      setPrivateKeyInput('');
    } catch {
      toast.error('Invalid private key format');
    }
  };

  const handleClearWallet = () => {
    if (confirm('Are you sure you want to clear your wallet?')) {
      clearWallet();
      toast.success('Wallet cleared');
    }
  };

  const handleSaveRpcUrl = () => {
    setRpcUrl(customRpcUrl);
    toast.success('RPC URL updated');
  };

  const handleSaveRegistryUrl = () => {
    setRegistryApiUrl(customRegistryUrl);
    toast.success('Registry URL updated');
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    setIsGenerating(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${FACILITATOR_URL}/api/keys/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          name: newKeyName,
          permissions: ['read', 'write']
        })
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(`API key created! ${data.warning}`);
        setNewKeyName('');
        refetchKeys();
      } else {
        toast.error(data.error || 'Failed to create API key');
      }
    } catch (error) {
      toast.error('Failed to create API key');
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${FACILITATOR_URL}/api/keys/${id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        toast.success('API key revoked');
        refetchKeys();
      } else {
        toast.error('Failed to revoke API key');
      }
    } catch (error) {
      toast.error('Failed to revoke API key');
    }
  };

  const saveWebhookSettings = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Please enter a webhook URL');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const method = webhookConfig ? 'PUT' : 'POST';
      const response = await fetch(`${FACILITATOR_URL}/api/webhooks/config`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          webhookUrl,
          events: ['settlement.completed', 'settlement.failed']
        })
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Webhook settings saved');
        if (data.webhookConfig?.webhookSecret) {
          setWebhookSecret(data.webhookConfig.webhookSecret);
        }
      } else {
        toast.error(data.error || 'Failed to save webhook settings');
      }
    } catch (error) {
      toast.error('Failed to save webhook settings');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Manage your wallet and network configuration
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Network Configuration
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Network
            </label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as any)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="devnet">Devnet</option>
              <option value="testnet">Testnet</option>
              <option value="mainnet-beta">Mainnet Beta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Custom RPC URL
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={customRpcUrl}
                onChange={(e) => setCustomRpcUrl(e.target.value)}
                placeholder="https://api.devnet.solana.com"
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
              <button
                onClick={handleSaveRpcUrl}
                className="rounded-lg bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
              >
                Save
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Registry API URL
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={customRegistryUrl}
                onChange={(e) => setCustomRegistryUrl(e.target.value)}
                placeholder="https://api-dev.x402-upl.network"
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
              <button
                onClick={handleSaveRegistryUrl}
                className="rounded-lg bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Wallet Management
        </h2>

        <div className="mt-4 space-y-4">
          {publicKey ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Connected Wallet
              </label>
              <div className="mt-1 flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-700">
                <code className="text-sm text-slate-900 dark:text-white">{publicKey}</code>
                <button
                  onClick={handleClearWallet}
                  className="ml-4 rounded-lg border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Import Private Key
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="password"
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value)}
                  placeholder="[1,2,3,...]"
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
                <button
                  onClick={handleImportWallet}
                  className="rounded-lg bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
                >
                  Import
                </button>
              </div>
            </div>
          )}

          {agentId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Agent ID
              </label>
              <div className="mt-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-700">
                <code className="text-sm text-slate-900 dark:text-white">{agentId}</code>
              </div>
            </div>
          )}

          {did && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                DID
              </label>
              <div className="mt-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-700">
                <code className="text-sm text-slate-900 dark:text-white">{did}</code>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          API Keys
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Generate API keys for programmatic access to your merchant account
        </p>

        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="API Key Name (e.g., Production Server)"
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
            <button
              onClick={generateApiKey}
              disabled={isGenerating || !publicKey}
              className="rounded-lg bg-primary-500 px-4 py-2 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Generate Key'}
            </button>
          </div>

          {apiKeys && apiKeys.length > 0 && (
            <div className="space-y-3">
              {apiKeys.map((key: any) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-white">{key.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        key.revoked
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {key.revoked ? 'Revoked' : 'Active'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="rounded bg-slate-100 px-2 py-1 text-sm text-slate-900 dark:bg-slate-700 dark:text-white">
                        {key.keyPrefix}...
                      </code>
                      {key.lastUsedAt && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Last used {new Date(key.lastUsedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Created {new Date(key.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {!key.revoked && (
                    <button
                      onClick={() => deleteApiKey(key.id)}
                      className="ml-4 rounded-lg border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Webhook Settings
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Configure webhook endpoints for settlement notifications
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Webhook URL
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-server.com/webhooks/settlement"
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
          {webhookSecret && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Webhook Secret
              </label>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded bg-slate-100 px-3 py-2 text-sm text-slate-900 dark:bg-slate-700 dark:text-white">
                  {webhookSecret}
                </code>
                <button
                  onClick={() => copyToClipboard(webhookSecret)}
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  Copy
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Use this secret to verify webhook signatures
              </p>
            </div>
          )}
          <button
            onClick={saveWebhookSettings}
            disabled={!publicKey || !webhookUrl.trim()}
            className="rounded-lg bg-primary-500 px-4 py-2 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Webhook Settings
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Notification Preferences
        </h2>

        <div className="mt-4 space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">
              Email notifications for settlements
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">
              Email notifications for failed transactions
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">
              Weekly summary emails
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
