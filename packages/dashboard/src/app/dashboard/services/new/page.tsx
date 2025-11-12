'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletStore } from '@/store/wallet';
import { useClient } from '@/lib/client';

export default function NewServicePage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.publicKey);
  const client = useClient();

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    category: '',
    pricePerCall: '',
    acceptedTokens: 'USDC',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!wallet) {
      setError('Please connect your wallet first');
      setLoading(false);
      return;
    }

    try {
      await client.registerService({
        ownerWalletAddress: wallet,
        name: formData.name,
        url: formData.url,
        description: formData.description,
        category: formData.category,
        pricePerCall: parseFloat(formData.pricePerCall),
        acceptedTokens: [formData.acceptedTokens],
      });

      router.push('/dashboard/services');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register service');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Register New Service</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Register your service on the x402 marketplace
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-900 dark:text-white">
              Service Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              maxLength={128}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Weather API"
            />
          </div>

          <div>
            <label htmlFor="url" className="block text-sm font-medium text-slate-900 dark:text-white">
              Service URL
            </label>
            <input
              type="url"
              id="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              required
              maxLength={512}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="https://api.example.com"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-900 dark:text-white">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              maxLength={1024}
              rows={4}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Real-time weather data from global weather stations"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-slate-900 dark:text-white">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">Select a category</option>
              <option value="data">Data & Analytics</option>
              <option value="ai">AI & Machine Learning</option>
              <option value="financial">Financial Services</option>
              <option value="social">Social Media</option>
              <option value="weather">Weather & Environment</option>
              <option value="blockchain">Blockchain & Crypto</option>
              <option value="communication">Communication</option>
              <option value="storage">Storage & Database</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="pricePerCall" className="block text-sm font-medium text-slate-900 dark:text-white">
              Price Per Call (USDC)
            </label>
            <input
              type="number"
              id="pricePerCall"
              name="pricePerCall"
              value={formData.pricePerCall}
              onChange={handleChange}
              required
              step="0.000001"
              min="0"
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="0.001"
            />
          </div>

          <div>
            <label htmlFor="acceptedTokens" className="block text-sm font-medium text-slate-900 dark:text-white">
              Accepted Token
            </label>
            <select
              id="acceptedTokens"
              name="acceptedTokens"
              value={formData.acceptedTokens}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="USDC">USDC</option>
              <option value="SOL">SOL</option>
              <option value="CASH">CASH</option>
            </select>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-sky-600 dark:hover:bg-sky-700"
            >
              {loading ? 'Registering...' : 'Register Service'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
