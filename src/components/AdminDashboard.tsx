import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Calendar,
  Filter,
  GitCompare,
  Heart,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {
  AdminAnalyticsResponse,
  AnalyticsEventType,
  AuthUser,
  MarketplaceId,
} from '../types';
import { queryAdminAnalyticsLocal } from '../utils/localAnalyticsStore';

interface AdminDashboardProps {
  user: AuthUser;
  authToken?: string | null;
  onLogout: () => void;
}

const MARKETPLACE_BAR_COLORS: Record<MarketplaceId, string> = {
  amazon: 'bg-amber-600',
  flipkart: 'bg-blue-600',
  meesho: 'bg-violet-600',
  myntra: 'bg-rose-600',
};

const EVENT_TYPE_LABELS: Record<AnalyticsEventType, string> = {
  search: 'Product Search',
  compare: 'Added to Compare',
  save: 'Saved Product',
  marketplace_click: 'Store Link Click',
  register: 'User Registration',
  login: 'User Sign In',
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function toInputDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [productFilterInput, setProductFilterInput] = useState('');
  const [appliedProductFilter, setAppliedProductFilter] = useState('');

  // Chart granularity
  const [activityGranularity, setActivityGranularity] = useState<'daily' | 'weekly'>('daily');

  const fetchAnalytics = useCallback(() => {
    setIsLoading(true);
    setErrorText(null);
    try {
      const payload = queryAdminAnalyticsLocal({
        dateFrom,
        dateTo,
        userId: selectedUserId !== 'all' ? selectedUserId : '',
        product: appliedProductFilter,
      });
      setAnalytics(payload);
    } catch {
      setErrorText('Unable to load admin analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, selectedUserId, appliedProductFilter]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const applyDatePreset = (preset: 'all' | 'today' | '7d' | '30d') => {
    if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
      return;
    }
    const today = new Date();
    const toStr = toInputDateString(today);
    if (preset === 'today') {
      setDateFrom(toStr);
      setDateTo(toStr);
      return;
    }
    const days = preset === '7d' ? 6 : 29;
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
    setDateFrom(toInputDateString(start));
    setDateTo(toStr);
  };

  const handleApplyProductFilter = (e: FormEvent) => {
    e.preventDefault();
    setAppliedProductFilter(productFilterInput.trim());
  };

  const handleResetAllFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedUserId('all');
    setProductFilterInput('');
    setAppliedProductFilter('');
  };

  const scrollToAdminSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const chartSeries =
    activityGranularity === 'daily'
      ? (analytics?.dailyActivity ?? [])
      : (analytics?.weeklyActivity ?? []);

  const maxActivityVal = Math.max(
    1,
    ...chartSeries.map((pt) => pt.searches + pt.comparisons + pt.saves + pt.registrations),
  );

  const nonAdminUsers = (analytics?.users ?? []).filter((u) => u.role === 'user');
  const maxSearchedCount = Math.max(
    1,
    ...(analytics?.mostSearchedProducts ?? []).map((item) => item.count),
  );
  const maxCategoryCount = Math.max(
    1,
    ...(analytics?.mostPopularCategories ?? []).map((item) => item.count),
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">
                ShopSync Admin Portal
              </div>
              <div className="text-[11px] text-slate-500 truncate hidden sm:block">
                Signed in as {user.fullName} · {user.email}
              </div>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => scrollToAdminSection('admin-overview')}
              className="hover:text-blue-700 hover:underline underline-offset-4 whitespace-nowrap cursor-pointer"
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => scrollToAdminSection('admin-search-analytics')}
              className="hover:text-blue-700 hover:underline underline-offset-4 whitespace-nowrap cursor-pointer"
            >
              Search Analytics
            </button>
            <button
              type="button"
              onClick={() => scrollToAdminSection('admin-platform-analytics')}
              className="hover:text-blue-700 hover:underline underline-offset-4 whitespace-nowrap cursor-pointer"
            >
              Platform Analytics
            </button>
            <button
              type="button"
              onClick={() => scrollToAdminSection('admin-user-management')}
              className="hover:text-blue-700 hover:underline underline-offset-4 whitespace-nowrap cursor-pointer"
            >
              User Management
            </button>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={fetchAnalytics}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg min-h-[40px] disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg min-h-[40px] whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>Admin Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Title & Filter Bar */}
        <section id="admin-overview" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                Platform Analytics &amp; User Management
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Real-time search, marketplace, comparison, wishlist, and registered user metrics
                stored securely on the server.
              </p>
            </div>
            {analytics && (
              <div className="text-xs font-mono tabular-nums text-slate-500">
                Updated: {formatDateTime(analytics.generatedAtIso)}
              </div>
            )}
          </div>

          {/* Search Filters: Date, User, Product */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Filter className="w-4 h-4 text-blue-700" />
                <span>Analytics Filters (Date, User &amp; Product)</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
                {(
                  [
                    ['all', 'All Time'],
                    ['today', 'Today'],
                    ['7d', 'Last 7 Days'],
                    ['30d', 'Last 30 Days'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyDatePreset(key)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-white rounded-md transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              <div className="lg:col-span-2">
                <label
                  htmlFor="admin-date-from"
                  className="block text-[11px] font-semibold text-slate-600 mb-1"
                >
                  From Date
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full pl-9 pr-2.5 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="lg:col-span-2">
                <label
                  htmlFor="admin-date-to"
                  className="block text-[11px] font-semibold text-slate-600 mb-1"
                >
                  To Date
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full pl-9 pr-2.5 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="lg:col-span-3">
                <label
                  htmlFor="admin-user-filter"
                  className="block text-[11px] font-semibold text-slate-600 mb-1"
                >
                  Filter by User
                </label>
                <select
                  id="admin-user-filter"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">All Registered Users ({nonAdminUsers.length})</option>
                  {nonAdminUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <form onSubmit={handleApplyProductFilter} className="lg:col-span-4 flex gap-2">
                <div className="flex-1">
                  <label
                    htmlFor="admin-product-filter"
                    className="block text-[11px] font-semibold text-slate-600 mb-1"
                  >
                    Filter by Product or Keyword
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="admin-product-filter"
                      type="text"
                      value={productFilterInput}
                      onChange={(e) => setProductFilterInput(e.target.value)}
                      placeholder="e.g. iPhone, Sony, Audio..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="self-end px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 rounded-lg whitespace-nowrap cursor-pointer"
                >
                  Apply
                </button>
              </form>

              <div className="lg:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {errorText && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{errorText}</span>
              </div>
              <button
                type="button"
                onClick={fetchAnalytics}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* KPI Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Total Users</span>
                <Users className="w-4 h-4 text-blue-700" />
              </div>
              <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-slate-900">
                {analytics?.summary.totalRegisteredUsers ?? 0}
              </div>
              <div className="mt-1 text-xs text-slate-500">Registered shopper accounts</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Active Users</span>
                <UserCheck className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-emerald-700">
                {analytics?.summary.currentlyActiveUsers ?? 0}
              </div>
              <div className="mt-1 text-xs text-slate-500">Active within last 15 min</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>New Registrations</span>
                <UserPlus className="w-4 h-4 text-violet-700" />
              </div>
              <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-slate-900">
                {analytics?.summary.newRegistrations7d ?? 0}
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                {analytics?.summary.newRegistrations24h ?? 0} in last 24h · 7d total
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Total Searches</span>
                <Search className="w-4 h-4 text-blue-700" />
              </div>
              <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-blue-700">
                {analytics?.summary.totalSearches ?? 0}
              </div>
              <div className="mt-1 text-xs text-slate-500">Tracked product queries</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Comparisons &amp; Saves</span>
                <GitCompare className="w-4 h-4 text-violet-700" />
              </div>
              <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-violet-700">
                {(analytics?.summary.totalComparisons ?? 0) + (analytics?.summary.totalSaves ?? 0)}
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                {analytics?.summary.totalComparisons ?? 0} compares ·{' '}
                {analytics?.summary.totalSaves ?? 0} saves
              </div>
            </div>
          </div>
        </section>

        {/* Daily & Weekly Activity Chart + Marketplace Breakdown Chart */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-700" />
                  <span>Daily &amp; Weekly Activity</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Combined product searches, comparisons, wishlist saves, and user registrations.
                </p>
              </div>

              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActivityGranularity('daily')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    activityGranularity === 'daily'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Daily (14 Days)
                </button>
                <button
                  type="button"
                  onClick={() => setActivityGranularity('weekly')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    activityGranularity === 'weekly'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Weekly (8 Weeks)
                </button>
              </div>
            </div>

            {/* Stacked Vertical Bar Chart */}
            <div className="overflow-x-auto">
              <div className="min-w-[540px] pt-2">
                <div className="h-52 flex items-end gap-2 border-b border-slate-200 pb-2 px-1">
                  {chartSeries.map((pt, idx) => {
                    const total = pt.searches + pt.comparisons + pt.saves + pt.registrations;
                    const searchH = Math.round((pt.searches / maxActivityVal) * 168);
                    const compareH = Math.round((pt.comparisons / maxActivityVal) * 168);
                    const saveH = Math.round((pt.saves / maxActivityVal) * 168);
                    const regH = Math.round((pt.registrations / maxActivityVal) * 168);

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center justify-end gap-1 group"
                        title={`${pt.label}: ${pt.searches} searches, ${pt.comparisons} compares, ${pt.saves} saves, ${pt.registrations} registrations`}
                      >
                        <div className="text-[10px] font-mono tabular-nums text-slate-500">
                          {total > 0 ? total : ''}
                        </div>
                        <div className="w-full max-w-[32px] flex flex-col-reverse rounded-t-md overflow-hidden bg-slate-100">
                          {searchH > 0 && (
                            <div
                              style={{ height: `${Math.max(4, searchH)}px` }}
                              className="w-full bg-blue-600"
                            />
                          )}
                          {compareH > 0 && (
                            <div
                              style={{ height: `${Math.max(4, compareH)}px` }}
                              className="w-full bg-violet-600"
                            />
                          )}
                          {saveH > 0 && (
                            <div
                              style={{ height: `${Math.max(4, saveH)}px` }}
                              className="w-full bg-emerald-600"
                            />
                          )}
                          {regH > 0 && (
                            <div
                              style={{ height: `${Math.max(4, regH)}px` }}
                              className="w-full bg-amber-500"
                            />
                          )}
                          {total === 0 && <div className="h-1 w-full bg-slate-200" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 pt-2 px-1">
                  {chartSeries.map((pt, idx) => (
                    <div
                      key={idx}
                      className="flex-1 text-center text-[10px] font-mono text-slate-500 truncate"
                    >
                      {pt.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 pt-1 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
                Searches
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-violet-600 inline-block" />
                Comparisons
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
                Saved Products
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" />
                Registrations
              </span>
            </div>
          </div>

          {/* Marketplace Breakdown Chart */}
          <div
            id="admin-platform-analytics"
            className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5"
          >
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-violet-700" />
                <span>Marketplace Share</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Searches &amp; store link opens across Amazon, Flipkart, Meesho, and Myntra.
              </p>
            </div>

            <div className="space-y-4">
              {(analytics?.marketplaceBreakdown ?? []).map((m) => (
                <div key={m.marketplace} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{m.marketplaceName}</span>
                    <span className="font-mono tabular-nums text-slate-600">
                      {m.count} ({m.sharePercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(m.count > 0 ? 6 : 0, m.sharePercent)}%` }}
                      className={`h-full rounded-full transition-all ${MARKETPLACE_BAR_COLORS[m.marketplace]}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
              Automatically updated when shoppers search with marketplace filters or click direct
              store links.
            </div>
          </div>
        </section>

        {/* Search Analytics Section */}
        <section id="admin-search-analytics" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Most Searched Products */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-700" />
                <span>Most Searched Products</span>
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                Top {analytics?.mostSearchedProducts.length ?? 0}
              </span>
            </div>

            {(analytics?.mostSearchedProducts.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No product searches recorded for the active filters yet.
              </div>
            ) : (
              <div className="space-y-3">
                {analytics!.mostSearchedProducts.map((item) => {
                  const pct = Math.round((item.count / maxSearchedCount) * 100);
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-800 truncate">{item.label}</span>
                        <span className="font-mono tabular-nums text-blue-700 font-semibold shrink-0">
                          {item.count} {item.count === 1 ? 'search' : 'searches'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(8, pct)}%` }}
                          className="h-full bg-gradient-to-r from-blue-600 to-violet-700 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Popular Categories */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-slate-900">
              Popular Categories
            </h2>

            {(analytics?.mostPopularCategories.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No category activity yet.
              </div>
            ) : (
              <div className="space-y-3">
                {analytics!.mostPopularCategories.map((cat) => {
                  const pct = Math.round((cat.count / maxCategoryCount) * 100);
                  return (
                    <div key={cat.label} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-slate-800 truncate">{cat.label}</span>
                        <span className="font-mono tabular-nums text-slate-600 shrink-0">
                          {cat.count}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(10, pct)}%` }}
                          className="h-full bg-violet-600 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Most Compared & Most Saved Products */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="space-y-3">
              <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-violet-700" />
                <span>Most Compared Products</span>
              </h2>
              {(analytics?.mostComparedProducts.length ?? 0) === 0 ? (
                <p className="text-xs text-slate-500">No product comparisons recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {analytics!.mostComparedProducts.slice(0, 4).map((item) => (
                    <div
                      key={item.label}
                      className="py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-medium text-slate-800 truncate">{item.label}</span>
                      <span className="font-mono tabular-nums text-violet-700 font-semibold shrink-0">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-3">
              <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-600" />
                <span>Most Saved Products</span>
              </h2>
              {(analytics?.mostSavedProducts.length ?? 0) === 0 ? (
                <p className="text-xs text-slate-500">No saved products recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {analytics!.mostSavedProducts.slice(0, 4).map((item) => (
                    <div
                      key={item.label}
                      className="py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-medium text-slate-800 truncate">{item.label}</span>
                      <span className="font-mono tabular-nums text-rose-700 font-semibold shrink-0">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Top Search Keywords Table */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Search Keywords &amp; Latest Search Timestamps
              </h2>
              <p className="text-xs text-slate-500">
                Exact keywords searched by shoppers with volume and last search date/time.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {analytics?.topSearchKeywords.length ?? 0} unique keywords
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-4 font-semibold">Search Keyword</th>
                  <th className="py-3 px-4 font-semibold text-right">Search Count</th>
                  <th className="py-3 px-4 font-semibold text-right">Last Searched Date &amp; Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(analytics?.topSearchKeywords.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500">
                      No search keywords recorded for this filter selection.
                    </td>
                  </tr>
                ) : (
                  analytics!.topSearchKeywords.map((kw) => (
                    <tr key={kw.label} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-medium text-slate-900">{kw.label}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-blue-700">
                        {kw.count}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600">
                        {formatDateTime(kw.lastSeenIso)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* User Management Section */}
        <section id="admin-user-management" className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-700" />
                  <span>Registered Users</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Names, email addresses, registration timestamps, and activity counts (passwords
                  and sensitive data are never exposed).
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {nonAdminUsers.length} {nonAdminUsers.length === 1 ? 'user' : 'users'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-3 px-4 font-semibold">Full Name</th>
                    <th className="py-3 px-4 font-semibold">Email Address</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Searches</th>
                    <th className="py-3 px-4 font-semibold text-right">Compares</th>
                    <th className="py-3 px-4 font-semibold text-right">Saves</th>
                    <th className="py-3 px-4 font-semibold text-right">Registered</th>
                    <th className="py-3 px-4 font-semibold text-right">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nonAdminUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No registered users found yet.
                      </td>
                    </tr>
                  ) : (
                    nonAdminUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{u.fullName}</td>
                        <td className="py-2.5 px-4 text-slate-600">{u.email}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`font-semibold ${
                              u.isActiveNow ? 'text-emerald-700' : 'text-slate-500'
                            }`}
                          >
                            {u.isActiveNow ? 'Active Now' : 'Offline'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-blue-700 font-semibold">
                          {u.searchCount}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-violet-700 font-semibold">
                          {u.compareCount}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-rose-700 font-semibold">
                          {u.saveCount}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {formatDateTime(u.createdAtIso)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {formatDateTime(u.lastActiveAtIso)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Activity History Log */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-violet-700" />
                  <span>User Activity History</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Chronological search, comparison, save, marketplace click, and auth events.
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                Showing {analytics?.activityHistory.length ?? 0} events
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-3 px-4 font-semibold">Date &amp; Time</th>
                    <th className="py-3 px-4 font-semibold">User</th>
                    <th className="py-3 px-4 font-semibold">Activity</th>
                    <th className="py-3 px-4 font-semibold">Product / Keyword</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Marketplace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(analytics?.activityHistory.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No user activity events match the active filters.
                      </td>
                    </tr>
                  ) : (
                    analytics!.activityHistory.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {formatDateTime(ev.createdAtIso)}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">{ev.userName}</div>
                          <div className="text-[11px] text-slate-500">{ev.userEmail}</div>
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                          {EVENT_TYPE_LABELS[ev.type]}
                        </td>
                        <td className="py-2.5 px-4 text-slate-800">
                          {ev.productName || ev.keyword || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{ev.category || '—'}</td>
                        <td className="py-2.5 px-4 font-medium text-blue-700 capitalize">
                          {ev.marketplace || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
