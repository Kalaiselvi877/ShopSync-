import {
  ArrowUpRight,
  Bell,
  Check,
  GitCompare,
  Heart,
  Trash2,
  X,
} from 'lucide-react';
import type { MarketplaceId, ProductItem } from '../types';
import { formatINR, formatRelativeTime, getMarketplaceAccent } from '../utils/formatters';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: ProductItem;
  isCompared: boolean;
  isWishlisted: boolean;
  hasAlert: boolean;
  onToggleCompare: (productId: string) => void;
  onToggleWishlist: (productId: string) => void;
  onOpenDetail: (product: ProductItem) => void;
  onUpdateOfferPrice: (productId: string, marketplace: MarketplaceId, price: number | null) => void;
  onRemoveProduct?: (productId: string) => void;
  onMarketplaceClick?: (product: ProductItem, marketplace: MarketplaceId) => void;
}

export function ProductCard({
  product,
  isCompared,
  isWishlisted,
  hasAlert,
  onToggleCompare,
  onToggleWishlist,
  onOpenDetail,
  onUpdateOfferPrice,
  onRemoveProduct,
  onMarketplaceClick,
}: ProductCardProps) {
  const { bestOffer, maxPriceSpread } = product;

  return (
    <article className="group bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative w-full aspect-[16/9] bg-slate-100 overflow-hidden">
        <button
          type="button"
          onClick={() => onOpenDetail(product)}
          className="w-full h-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-700"
        >
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </button>

        {onRemoveProduct && (
          <button
            type="button"
            onClick={() => onRemoveProduct(product.id)}
            title={`Remove ${product.name}`}
            aria-label={`Remove ${product.name}`}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/90 border border-slate-200 text-slate-500 hover:text-rose-700 hover:bg-white shadow-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
              <span className="font-medium text-slate-700">{product.brand}</span>
              <span aria-hidden="true">·</span>
              <span>{product.category}</span>
            </div>
            <button
              type="button"
              onClick={() => onOpenDetail(product)}
              className="mt-1 text-left font-display text-base font-semibold text-slate-900 leading-snug line-clamp-2 hover:text-violet-700 transition-colors cursor-pointer"
            >
              {product.name}
            </button>
          </div>

          <button
            type="button"
            onClick={() => onToggleWishlist(product.id)}
            aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            className={`p-2 rounded-lg border transition-colors shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer ${
              isWishlisted
                ? 'border-violet-200 bg-violet-50 text-violet-700'
                : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-violet-600' : ''}`} />
          </button>
        </div>

        <div className="pt-1 border-t border-slate-100">
          {bestOffer && bestOffer.totalLandedPrice !== null ? (
            <>
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono tabular-nums text-2xl font-bold text-slate-900">
                    {formatINR(bestOffer.totalLandedPrice)}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">Lowest Price</span>
                </div>
                {maxPriceSpread !== null && maxPriceSpread > 0 && (
                  <span className="text-xs font-semibold text-violet-700 font-mono tabular-nums">
                    Save {formatINR(maxPriceSpread)}
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-600">
                <span>
                  Cheapest on <strong className="text-slate-900">{bestOffer.marketplaceName}</strong>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Updated {formatRelativeTime(product.lastUpdatedIso)}
                </span>
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-800">Enter store prices below</div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>Open search links & type observed ₹ prices</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatRelativeTime(product.lastUpdatedIso)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-slate-50/60">
          {product.offers.map((offer) => {
            const accent = getMarketplaceAccent(offer.marketplace);
            const isCheapest =
              bestOffer !== null &&
              bestOffer.totalLandedPrice !== null &&
              offer.marketplace === bestOffer.marketplace;

            return (
              <div
                key={offer.marketplace}
                className={`px-3 py-2.5 flex items-center justify-between gap-2 text-xs ${
                  isCheapest ? 'bg-emerald-50/50' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`font-semibold ${accent.textClass}`}>{accent.label}</span>
                    {isCheapest && (
                      <span className="text-[11px] font-semibold text-emerald-700">· Lowest</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    Stock &amp; Delivery: Not Available
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="relative flex items-center">
                    <span className="absolute left-2 text-[11px] font-mono text-slate-400 pointer-events-none">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={offer.price ?? ''}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        if (!val) {
                          onUpdateOfferPrice(product.id, offer.marketplace, null);
                          return;
                        }
                        const num = Number(val);
                        if (!Number.isNaN(num) && num >= 0) {
                          onUpdateOfferPrice(product.id, offer.marketplace, num);
                        }
                      }}
                      placeholder="Price"
                      aria-label={`Enter ${offer.marketplaceName} price for ${product.name}`}
                      className={`w-24 pl-5 pr-5 py-1 text-xs font-mono tabular-nums rounded-md border bg-white focus:outline-none focus:ring-2 focus:ring-violet-700 ${
                        isCheapest ? 'border-emerald-400 font-semibold text-slate-900' : 'border-slate-300 text-slate-800'
                      }`}
                    />
                    {offer.price !== null && (
                      <button
                        type="button"
                        onClick={() => onUpdateOfferPrice(product.id, offer.marketplace, null)}
                        aria-label={`Clear ${offer.marketplaceName} price`}
                        className="absolute right-1 p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {offer.productUrl && (
                    <a
                      href={offer.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onMarketplaceClick?.(product, offer.marketplace)}
                      title={`Search ${product.name} on ${offer.marketplaceName}`}
                      aria-label={`Open ${offer.marketplaceName} search results for ${product.name}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors whitespace-nowrap"
                    >
                      <span>Open</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto pt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleCompare(product.id)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors min-h-[40px] whitespace-nowrap cursor-pointer ${
              isCompared
                ? 'bg-gradient-to-r from-blue-600 to-violet-700 text-white border-transparent hover:from-blue-700 hover:to-violet-800'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {isCompared ? <Check className="w-3.5 h-3.5" /> : <GitCompare className="w-3.5 h-3.5" />}
            <span>{isCompared ? 'In Compare' : 'Compare'}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDetail(product)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition-colors min-h-[40px] whitespace-nowrap cursor-pointer"
          >
            <Bell className={`w-3.5 h-3.5 ${hasAlert ? 'text-violet-700 fill-violet-700' : ''}`} />
            <span>{hasAlert ? 'Tracked' : 'Track & Details'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
