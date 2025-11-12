'use client';

import { useQuery } from '@tanstack/react-query';
import { facilitatorAPI } from '@/lib/api';
import { useState, useMemo } from 'react';
import Link from 'next/link';

type CategoryFilter = 'all' | string;

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'price-low' | 'price-high'>('popular');

  const { data: allServices, isLoading } = useQuery({
    queryKey: ['all-services'],
    queryFn: async () => {
      return await facilitatorAPI.getServices();
    },
    refetchInterval: 60000,
  });

  const filteredAndSortedServices = useMemo(() => {
    if (!allServices) return [];

    let filtered = allServices;

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(s => s.category === categoryFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return parseFloat(a.pricePerCall) - parseFloat(b.pricePerCall);
        case 'price-high':
          return parseFloat(b.pricePerCall) - parseFloat(a.pricePerCall);
        case 'newest':
          return b.id.localeCompare(a.id);
        case 'popular':
        default:
          return 0;
      }
    });

    return sorted;
  }, [allServices, categoryFilter, searchQuery, sortBy]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Discover Services</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Browse and discover x402-enabled services
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 pl-10 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="all">All Categories</option>
              {/* Category filter temporarily disabled - needs API endpoint */}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {filteredAndSortedServices.length} service{filteredAndSortedServices.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {filteredAndSortedServices.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedServices.map((service) => (
            <div
              key={service.id}
              className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg dark:bg-slate-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {service.name}
                  </h3>
                  {service.category && (
                    <span className="mt-2 inline-flex rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                      {service.category}
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                {service.url}
              </p>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Price per Call</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                    ${parseFloat(service.pricePerCall).toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Accepted Tokens</p>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                    {service.acceptedTokens.length}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Link
                  href={service.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-lg bg-primary-500 px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary-600"
                >
                  Visit Service
                </Link>
                <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                  Details
                </button>
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400">Provider</p>
                <code className="mt-1 block text-xs text-slate-900 dark:text-white">
                  {service.wallet.slice(0, 8)}...{service.wallet.slice(-8)}
                </code>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-lg bg-white dark:bg-slate-800">
          <div className="text-center">
            <p className="text-lg font-medium text-slate-900 dark:text-white">
              No services found
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Try adjusting your search or filters
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
