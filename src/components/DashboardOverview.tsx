import { ArrowUpRight, Bell, Flame, Heart, Search, Tag, TrendingUp } from 'lucide-react';
import type { CheckedPriceAlert, DataSourceMode, ProductItem, RecentActivityItem } from '../types';
import { formatINR, formatRelativeTime } from '../utils/formatters';
import { ProductImage } from './ProductImage';

interface DashboardOverviewProps {
  totalSearches: number;
  wishlistCount: number;
  checkedAlerts: CheckedPriceAlert[];
  catalogProducts: ProductItem[];
  recentActivity: RecentActivityItem[];
  dataMode: DataSourceMode;
  lastUpdatedIso: string | null;
  onOpenProduct: (product: ProductItem) => void;
  onOpenSaved: () => void;
  onOpenIntegrations: () => void;
}

export function DashboardOverview({
  totalSearches,
  wishlistCount,
  checkedAlerts,
  catalogProducts,
  recentActivity,
  dataMode,
  lastUpdatedIso,
  onOpenProduct,
  onOpenSaved,
  onOpenIntegrations,
}: DashboardOverviewProps) {
  const pricedProducts = catalogProducts.filter((p) => p.bestOffer?.totalLandedPrice != null);

  const lowestEnteredSorted = [...pricedProducts]
    .sort(
      (a, b) =>
        (a.bestOffer?.totalLandedPrice ?? Number.MAX_SAFE_INTEGER) -
        (b.bestOffer?.totalLandedPrice ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 3);

  const topSavingsSorted = [...pricedProducts]
    .filter((p) => (p.maxPriceSpread ?? 0) > 0)
    .sort((a, b) => (b.maxPriceSpread ?? -1) - (a.maxPriceSpread ?? -1))
    .slice(0, 3);

  const triggeredAlerts = checkedAlerts.filter((a) => a.triggered);
  const topSavingsProduct = topSavingsSorted[0] ?? null;

  const sourceLabel = 'Direct Search + Entered Prices';

  return (
    <section
      id="dashboard"
      className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-2 space-y-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Shopping Dashboard</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Track your searched products, lowest entered prices, and triggered price alerts.
            {lastUpdatedIso ? (
              <span className="ml-2 font-mono text-xs text-slate-500">
                Last updated: {formatRelativeTime(lastUpdatedIso)}
              </span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenSaved}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors cursor-pointer"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Manage Wishlist & Alerts</span>
        </button>
      </div>

      {triggeredAlerts.length > 0 && triggeredAlerts[0].currentBestPrice !== null && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm text-emerald-900">
            <Bell className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Price-Drop Notification:</strong> {triggeredAlerts.length}{' '}
              {triggeredAlerts.length === 1 ? 'tracked product has' : 'tracked products have'} reached
              your target price ({triggeredAlerts[0].productName} at{' '}
              <strong className="font-mono tabular-nums">
                {formatINR(triggeredAlerts[0].currentBestPrice)}
              </strong>
              ).
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenSaved}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
          >
            View Triggered Alerts
          </button>
        </div>
      )}

      {/* 4-column KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Searches</span>
            <Search className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-mono tabular-nums text-2xl font-bold text-slate-900">
            {totalSearches}
          </div>
          <div className="text-xs text-slate-500">Direct store queries</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Wishlist Saved</span>
            <Heart className="w-4 h-4 text-violet-700" />
          </div>
          <div className="font-mono tabular-nums text-2xl font-bold text-slate-900">
            {wishlistCount}
          </div>
          <div className="text-xs text-slate-500">Saved in your browser</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Price Alerts</span>
            <Bell className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-mono tabular-nums text-2xl font-bold text-slate-900">
            {checkedAlerts.length}
          </div>
          <div className="text-xs text-emerald-700 font-medium">
            {triggeredAlerts.length} target reached
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Top Price Spread</span>
            <Tag className="w-4 h-4 text-violet-700" />
          </div>
          <div className="font-mono tabular-nums text-2xl font-bold text-slate-900">
            {topSavingsProduct && topSavingsProduct.maxPriceSpread !== null
              ? formatINR(topSavingsProduct.maxPriceSpread)
              : '—'}
          </div>
          <div className="text-xs text-slate-500 truncate">
            {topSavingsProduct ? topSavingsProduct.name : 'Enter 2+ store prices to see spread'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cross-Store Spreads */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-violet-700" />
              <span>Cross-Store Savings</span>
            </h3>
            <span className="text-[11px] font-medium text-slate-500">{sourceLabel}</span>
          </div>
          {topSavingsSorted.length === 0 ? (
            <div className="py-5 text-xs text-slate-500 space-y-2">
              <p>
                Open any store search link below and enter prices from 2 or more marketplaces to
                calculate your cross-store savings spread.
              </p>
              <button
                type="button"
                onClick={onOpenIntegrations}
                className="text-violet-700 font-semibold hover:underline cursor-pointer"
              >
                View Data Sources →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {topSavingsSorted.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenProduct(item)}
                  className="w-full py-2.5 flex items-center gap-3 text-left hover:bg-slate-50 rounded-lg px-1.5 transition-colors cursor-pointer"
                >
                  <div className="w-12 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    <ProductImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 truncate">{item.name}</div>
                    <div className="text-[11px] text-emerald-700 font-mono tabular-nums">
                      Save {formatINR(item.maxPriceSpread!)} · Lowest on{' '}
                      {item.bestOffer!.marketplaceName}
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lowest Entered Prices */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-700" />
              <span>Lowest Entered Prices</span>
            </h3>
            <span className="text-[11px] font-medium text-slate-500">User Compared</span>
          </div>
          {lowestEnteredSorted.length === 0 ? (
            <div className="py-5 text-xs text-slate-500">
              No prices entered yet. Click any marketplace search link on a product card and enter
              the price you find to highlight the lowest deal here.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {lowestEnteredSorted.map((item) => {
                const best = item.bestOffer!;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenProduct(item)}
                    className="w-full py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 rounded-lg px-1.5 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">{item.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        Cheapest on {best.marketplaceName}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono tabular-nums text-xs font-bold text-emerald-700">
                        {formatINR(best.totalLandedPrice!)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-slate-900">Recent Activity</h3>
            <span className="text-[11px] font-medium text-slate-500">Session Log</span>
          </div>
          {recentActivity.length === 0 ? (
            <div className="py-5 text-xs text-slate-500">
              Search products, enter prices from stores, or compare deals to see your activity log
              here.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentActivity.slice(0, 4).map((act) => (
                <div key={act.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-800 truncate">{act.label}</span>
                  <span className="font-mono tabular-nums text-[11px] text-slate-400 shrink-0">
                    {formatRelativeTime(act.createdAtIso)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
