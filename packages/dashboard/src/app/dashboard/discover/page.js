'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DiscoverPageV2;
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("@/lib/api");
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const CATEGORIES = [
    'AI & Machine Learning',
    'Data & Analytics',
    'Financial Services',
    'Blockchain & Crypto',
    'Weather & Environment',
    'Social Media',
    'Communication',
    'Storage & Database',
    'Other',
];
function DiscoverPageV2() {
    const router = (0, navigation_1.useRouter)();
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [categoryFilter, setCategoryFilter] = (0, react_1.useState)('all');
    const [sortBy, setSortBy] = (0, react_1.useState)('popular');
    const [priceRange, setPriceRange] = (0, react_1.useState)([0, 100]);
    const [minRating, setMinRating] = (0, react_1.useState)(0);
    const [selectedTokens, setSelectedTokens] = (0, react_1.useState)([]);
    const [showFilters, setShowFilters] = (0, react_1.useState)(true);
    const { data: allServices, isLoading } = (0, react_query_1.useQuery)({
        queryKey: ['all-services'],
        queryFn: async () => {
            return await api_1.facilitatorAPI.getServices();
        },
        refetchInterval: 60000,
    });
    const availableTokens = (0, react_1.useMemo)(() => {
        if (!allServices)
            return [];
        const tokens = new Set();
        allServices.forEach(s => s.acceptedTokens.forEach(t => tokens.add(t)));
        return Array.from(tokens);
    }, [allServices]);
    const filteredAndSortedServices = (0, react_1.useMemo)(() => {
        if (!allServices)
            return [];
        let filtered = allServices;
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(s => s.category === categoryFilter);
        }
        if (searchQuery) {
            filtered = filtered.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.category?.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        filtered = filtered.filter(s => {
            const price = parseFloat(s.pricePerCall);
            return price >= priceRange[0] && price <= priceRange[1];
        });
        if (selectedTokens.length > 0) {
            filtered = filtered.filter(s => selectedTokens.some(token => s.acceptedTokens.includes(token)));
        }
        const sorted = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'price-low':
                    return parseFloat(a.pricePerCall) - parseFloat(b.pricePerCall);
                case 'price-high':
                    return parseFloat(b.pricePerCall) - parseFloat(a.pricePerCall);
                case 'newest':
                    return b.id.localeCompare(a.id);
                case 'rating':
                    return 0;
                case 'popular':
                default:
                    return 0;
            }
        });
        return sorted;
    }, [allServices, categoryFilter, searchQuery, sortBy, priceRange, selectedTokens]);
    const toggleToken = (token) => {
        setSelectedTokens(prev => prev.includes(token) ? prev.filter(t => t !== token) : [...prev, token]);
    };
    if (isLoading) {
        return (<div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2A2A2A] border-t-[#00FF88]"></div>
          <p className="mt-4 text-sm text-[#888888]">Loading services...</p>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-[#0A0A0A] px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 border-b border-[#2A2A2A] pb-6">
          <h1 className="text-3xl font-bold text-white">Discover Services</h1>
          <p className="mt-1 text-[#888888]">
            Browse and discover X402-enabled services across the network
          </p>
        </div>

        {/* Search and Controls */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <input type="text" placeholder="Search services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-4 py-3 pl-10 text-white placeholder-[#555555] focus:border-[#00FF88] focus:outline-none focus:ring-1 focus:ring-[#00FF88]"/>
            <svg className="absolute left-3 top-3.5 h-5 w-5 text-[#888888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowFilters(!showFilters)} className="rounded-lg border border-[#2A2A2A] bg-[#111111] px-4 py-3 text-sm text-white hover:bg-[#1A1A1A]">
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-lg border border-[#2A2A2A] bg-[#111111] px-4 py-3 text-sm text-white focus:border-[#00FF88] focus:outline-none focus:ring-1 focus:ring-[#00FF88]">
              <option value="popular">Most Popular</option>
              <option value="newest">Newest</option>
              <option value="rating">Highest Rated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          {showFilters && (<div className="w-64 flex-shrink-0 space-y-6">
              {/* Categories */}
              <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
                <h3 className="text-sm font-semibold text-white">Categories</h3>
                <div className="mt-4 space-y-2">
                  <button onClick={() => setCategoryFilter('all')} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${categoryFilter === 'all'
                ? 'bg-[#00FF88]/10 text-[#00FF88]'
                : 'text-[#CCCCCC] hover:bg-[#1A1A1A]'}`}>
                    All Categories
                  </button>
                  {CATEGORIES.map((category) => (<button key={category} onClick={() => setCategoryFilter(category)} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${categoryFilter === category
                    ? 'bg-[#00FF88]/10 text-[#00FF88]'
                    : 'text-[#CCCCCC] hover:bg-[#1A1A1A]'}`}>
                      {category}
                    </button>))}
                </div>
              </div>

              {/* Price Range */}
              <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
                <h3 className="text-sm font-semibold text-white">Price Range</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <input type="range" min="0" max="100" value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])} className="w-full accent-[#00FF88]"/>
                    <div className="mt-2 flex justify-between text-xs text-[#888888]">
                      <span>${priceRange[0]}</span>
                      <span>${priceRange[1]}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
                <h3 className="text-sm font-semibold text-white">Minimum Rating</h3>
                <div className="mt-4 space-y-2">
                  {[4, 3, 2, 1, 0].map((rating) => (<button key={rating} onClick={() => setMinRating(rating)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${minRating === rating
                    ? 'bg-[#00FF88]/10 text-[#00FF88]'
                    : 'text-[#CCCCCC] hover:bg-[#1A1A1A]'}`}>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (<svg key={star} className={`h-4 w-4 ${star <= rating || rating === 0
                        ? minRating === rating
                            ? 'text-[#00FF88]'
                            : 'text-yellow-400'
                        : 'text-[#2A2A2A]'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>))}
                      </div>
                      <span>{rating === 0 ? 'All' : `${rating}+ Stars`}</span>
                    </button>))}
                </div>
              </div>

              {/* Accepted Tokens */}
              <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
                <h3 className="text-sm font-semibold text-white">Accepted Tokens</h3>
                <div className="mt-4 space-y-2">
                  {availableTokens.map((token) => (<label key={token} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#1A1A1A]">
                      <input type="checkbox" checked={selectedTokens.includes(token)} onChange={() => toggleToken(token)} className="h-4 w-4 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#00FF88] focus:ring-[#00FF88]"/>
                      <span className="text-sm text-[#CCCCCC]">{token}</span>
                    </label>))}
                </div>
              </div>

              {/* Clear Filters */}
              <button onClick={() => {
                setCategoryFilter('all');
                setPriceRange([0, 100]);
                setMinRating(0);
                setSelectedTokens([]);
                setSearchQuery('');
            }} className="w-full rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#888888] hover:bg-[#1A1A1A] hover:text-white">
                Clear All Filters
              </button>
            </div>)}

          {/* Services Grid */}
          <div className="flex-1">
            <div className="mb-4 rounded-lg border border-[#2A2A2A] bg-[#111111] p-4">
              <p className="text-sm text-[#888888]">
                {filteredAndSortedServices.length} service
                {filteredAndSortedServices.length !== 1 ? 's' : ''} found
              </p>
            </div>

            {filteredAndSortedServices.length > 0 ? (<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredAndSortedServices.map((service) => (<button key={service.id} onClick={() => router.push(`/dashboard/discover/${service.id}`)} className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6 text-left transition-all hover:border-[#00FF88]/30 hover:bg-[#1A1A1A]">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">
                          {service.name}
                        </h3>
                        {service.category && (<span className="mt-2 inline-flex rounded-lg border border-[#00FF88]/20 bg-[#00FF88]/10 px-2 py-1 text-xs font-medium text-[#00FF88]">
                            {service.category}
                          </span>)}
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm text-[#888888]">
                      {service.url}
                    </p>

                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[#888888]">Price per Call</p>
                        <p className="mt-1 text-lg font-bold text-white">
                          ${parseFloat(service.pricePerCall).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {service.acceptedTokens.slice(0, 3).map((token) => (<span key={token} className="rounded border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1 text-xs text-[#CCCCCC]">
                            {token}
                          </span>))}
                      </div>
                    </div>

                    <div className="mt-4 border-t border-[#2A2A2A] pt-4">
                      <p className="text-xs text-[#888888]">Provider</p>
                      <code className="mt-1 block text-xs text-[#CCCCCC]">
                        {service.wallet.slice(0, 8)}...{service.wallet.slice(-8)}
                      </code>
                    </div>
                  </button>))}
              </div>) : (<div className="flex h-64 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#111111]">
                <div className="text-center">
                  <p className="text-lg font-medium text-white">
                    No services found
                  </p>
                  <p className="mt-1 text-sm text-[#888888]">
                    Try adjusting your search or filters
                  </p>
                </div>
              </div>)}
          </div>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map