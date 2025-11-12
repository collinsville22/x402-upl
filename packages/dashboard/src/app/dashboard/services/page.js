'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ServicesPage;
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("@/lib/api");
const wallet_1 = require("@/store/wallet");
const link_1 = __importDefault(require("next/link"));
function ServicesPage() {
    const wallet = (0, wallet_1.useWalletStore)((state) => state.publicKey);
    const { data: allServices, isLoading: servicesLoading } = (0, react_query_1.useQuery)({
        queryKey: ['all-services'],
        queryFn: async () => {
            return await api_1.facilitatorAPI.getServices();
        },
        refetchInterval: 60000,
    });
    const { data: stats, isLoading: statsLoading } = (0, react_query_1.useQuery)({
        queryKey: ['service-stats', wallet],
        queryFn: async () => {
            if (!wallet || !allServices)
                return {};
            const merchantServices = allServices.filter(s => s.wallet === wallet);
            const statsPromises = merchantServices.map(service => api_1.facilitatorAPI.getServiceStats(service.id));
            const serviceStats = await Promise.all(statsPromises);
            return merchantServices.reduce((acc, service, idx) => {
                acc[service.id] = serviceStats[idx];
                return acc;
            }, {});
        },
        enabled: !!wallet && !!allServices,
    });
    const services = allServices?.filter(s => s.wallet === wallet) || [];
    const isLoading = servicesLoading || statsLoading;
    if (isLoading) {
        return (<div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"/>
      </div>);
    }
    return (<div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Services</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Manage your x402-enabled services
          </p>
        </div>
        <link_1.default href="/dashboard/services/new" className="rounded-lg bg-primary-500 px-4 py-2 text-white hover:bg-primary-600">
          Register Service
        </link_1.default>
      </div>

      {services && services.length > 0 ? (<div className="space-y-4">
          {services.map((service) => {
                const serviceStats = stats?.[service.id];
                return (<div key={service.id} className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {service.name}
                      </h3>
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                        Active
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {service.url}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Category</p>
                        <p className="mt-1 font-medium text-slate-900 dark:text-white">
                          {service.category || 'Uncategorized'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Price per Call</p>
                        <p className="mt-1 font-medium text-slate-900 dark:text-white">
                          ${parseFloat(service.pricePerCall).toFixed(2)} USDC
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Total Calls</p>
                        <p className="mt-1 font-medium text-slate-900 dark:text-white">
                          {serviceStats?.totalCalls || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Revenue</p>
                        <p className="mt-1 font-medium text-slate-900 dark:text-white">
                          ${serviceStats?.totalRevenue ? parseFloat(serviceStats.totalRevenue).toFixed(2) : '0.00'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs text-slate-600 dark:text-slate-400">Accepted Tokens</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {service.acceptedTokens.map((token) => (<span key={token} className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            {token}
                          </span>))}
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    <link_1.default href={`/dashboard/services/${service.id}`} className="rounded-lg border border-slate-300 px-3 py-1 text-center text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                      Manage
                    </link_1.default>
                    <link_1.default href={`/dashboard/services/${service.id}/analytics`} className="rounded-lg border border-slate-300 px-3 py-1 text-center text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                      Analytics
                    </link_1.default>
                  </div>
                </div>
              </div>);
            })}
        </div>) : (<div className="flex h-64 items-center justify-center rounded-lg bg-white dark:bg-slate-800">
          <div className="text-center">
            <p className="text-lg font-medium text-slate-900 dark:text-white">
              No services registered
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Register your first service to get started
            </p>
          </div>
        </div>)}
    </div>);
}
//# sourceMappingURL=page.js.map