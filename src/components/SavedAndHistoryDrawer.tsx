import { useState } from 'react';
import { Bell, CheckCircle2, GitCompare, Heart, History, Trash2, X } from 'lucide-react';
import type { CheckedPriceAlert, ComparisonHistoryEntry, ProductItem } from '../types';
import { formatINR, formatRelativeTime } from '../utils/formatters';
import { ProductImage } from './ProductImage';

interface SavedAndHistoryDrawerProps {
  isOpen: boolean;
  wishlistProducts: ProductItem[];
  checkedAlerts: CheckedPriceAlert[];
  comparisonHistory: ComparisonHistoryEntry[];
  onClose: () => void;
  onRemoveWishlist: (productId: string) => void;
  onRemoveAlert: (alertId: string) => void;
  onRestoreComparison: (productIds: string[]) => void;
  onClearHistory: () => void;
  onOpenDetail: (product: ProductItem) => void;
}

export function SavedAndHistoryDrawer({
  isOpen,
  wishlistProducts,
  checkedAlerts,
  comparisonHistory,
  onClose,
  onRemoveWishlist,
  onRemoveAlert,
  onRestoreComparison,
  onClearHistory,
  onOpenDetail,
}: SavedAndHistoryDrawerProps) {
  const [activeTab, setActiveTab] = useState<'wishlist' | 'alerts' | 'history'>('wishlist');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Saved items, price alerts, and comparison history"
    >
      <div className="bg-white w-full max-w-md h-full flex flex-col border-l border-slate-200 shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-slate-900">Your ShopSync Activity</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close activity drawer"
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('wishlist')}
              className={`py-2 px-2 rounded-md inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'wishlist'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Wishlist ({wishlistProducts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className={`py-2 px-2 rounded-md inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'alerts'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Alerts ({checkedAlerts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`py-2 px-2 rounded-md inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History ({comparisonHistory.length})</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {activeTab === 'wishlist' && (
            <>
              {wishlistProducts.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  No products saved yet. Tap the heart icon on any product card to save it here.
                </div>
              ) : (
                wishlistProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-3 rounded-xl border border-slate-200 flex items-center gap-3 bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onOpenDetail(product);
                        onClose();
                      }}
                      className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0 cursor-pointer"
                    >
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenDetail(product);
                          onClose();
                        }}
                        className="text-sm font-semibold text-slate-900 truncate block w-full text-left hover:text-blue-700 cursor-pointer"
                      >
                        {product.name}
                      </button>
                      <div className="text-xs text-slate-600 font-mono tabular-nums">
                        {product.bestOffer && product.bestOffer.totalLandedPrice !== null
                          ? `${formatINR(product.bestOffer.totalLandedPrice)} on ${product.bestOffer.marketplaceName}`
                          : 'Price Not Available'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveWishlist(product.id)}
                      aria-label={`Remove ${product.name}`}
                      className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'alerts' && (
            <>
              {checkedAlerts.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  No price alerts configured. Open any product&apos;s{' '}
                  <strong>Track & Details</strong> modal to set a target price.
                </div>
              ) : (
                checkedAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-xl border space-y-1.5 ${
                      alert.triggered ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900">{alert.productName}</div>
                      <button
                        type="button"
                        onClick={() => onRemoveAlert(alert.id)}
                        aria-label="Remove price alert"
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className="text-slate-600">Target: {formatINR(alert.targetPrice)}</span>
                      <span className="font-semibold text-slate-900">
                        {alert.currentBestPrice !== null
                          ? `Current: ${formatINR(alert.currentBestPrice)}`
                          : 'Not Available'}
                      </span>
                    </div>
                    {alert.triggered ? (
                      <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Target reached on {alert.bestMarketplace}!</span>
                      </div>
                    ) : alert.difference !== null ? (
                      <div className="text-xs text-slate-500">
                        {formatINR(alert.difference)} above target · Tracking
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">
                        Click Refresh Data to check verified price
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'history' && (
            <>
              {comparisonHistory.length > 0 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="text-xs font-medium text-slate-500 hover:text-rose-600 cursor-pointer"
                  >
                    Clear history
                  </button>
                </div>
              )}
              {comparisonHistory.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Your comparison sessions will appear here automatically when you compare 2 or more
                  products.
                </div>
              ) : (
                comparisonHistory.map((entry) => (
                  <div key={entry.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{entry.productIds.length} products compared</span>
                      <span>{formatRelativeTime(entry.createdAtIso)}</span>
                    </div>
                    <div className="text-xs font-medium text-slate-800 line-clamp-2">
                      {entry.productNames.join(' vs ')}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-emerald-700 font-medium truncate max-w-[200px]">
                        Lowest: {entry.bestDealProductName}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onRestoreComparison(entry.productIds);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-md cursor-pointer"
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
