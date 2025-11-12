'use client';

import { useQuery } from '@tanstack/react-query';
import { facilitatorAPI } from '@/lib/api';
import Link from 'next/link';

export default function TrendingPage() {
  const { data: trending, isLoading } = useQuery({
    queryKey: ['trending-services'],
    queryFn: async () => {
      return await facilitatorAPI.getTrendingServices();
    },
    refetchInterval: 300000,
  });

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
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Trending Services</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Most popular services in the last 7 days
        </p>
      </div>

      {trending && trending.length > 0 ? (
        <div className="space-y-4">
          {trending.map((service, index) => (
            <div
              key={service.id}
              className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg dark:bg-slate-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
                    <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {service.name}
                    </h3>
                    {service.category && (
                      <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {service.category}
                      </span>
                    )}
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {service.url}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Price per Call</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                    ${parseFloat(service.pricePerCall).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Calls (7 days)</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                    {service.stats.count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Revenue (7 days)</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                    ${service.stats.revenue.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Avg per Call</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                    ${(service.stats.revenue / service.stats.count).toFixed(2)}
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
                <Link
                  href={`/dashboard/services/${service.id}`}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-lg bg-white dark:bg-slate-800">
          <div className="text-center">
            <p className="text-lg font-medium text-slate-900 dark:text-white">
              No trending services yet
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Check back later for trending services
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
