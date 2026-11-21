import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  Bell,
  Check,
  GitCompare,
  Heart,
  HelpCircle,
  X,
} from 'lucide-react';
import type { MarketplaceId, PriceAlert, PriceTrendPoint, ProductItem } from '../types';
import { formatINR, formatRelativeTime, getMarketplaceAccent, getStockLabel } from '../utils/formatters';
import { ProductImage } from './ProductImage';

interface ProductDetailModalProps {
  product: ProductItem | null;
  priceSnapshots: PriceTrendPoint[];
  isCompared: boolean;
  isWishlisted: boolean;
  existingAlert?: PriceAlert;
  onClose: () => void;
  onToggleCompare: (productId: string) => void;
  onToggleWishlist: (productId: string) => void;
  onSavePriceAlert: (product: ProductItem, targetPrice: number) => void;
  onRemovePriceAlert: (alertId: string) => void;
  onUpdateOfferPrice: (
    productId: string,
    marketplace: MarketplaceId,
    price: number | null,
    shippingFee?: number | null,
  ) => void;
}

export function ProductDetailModal({
  product,
  priceSnapshots,
  isCompared,
  isWishlisted,
  existingAlert,
  onClose,
  onToggleCompare,
  onToggleWishlist,
  onSavePriceAlert,
  onRemovePriceAlert,
  onUpdateOfferPrice,
}: ProductDetailModalProps) {
  const [targetInput, setTargetInput] = useState<string>('');
  const [alertFeedback, setAlertFeedback] = useState<string>('');

  useEffect(() => {
    setAlertFeedback('');
    if (existingAlert) {
      setTargetInput(String(existingAlert.targetPrice));
    } else if (product?.bestOffer?.totalLandedPrice != null) {
      setTargetInput(
        String(Math.max(100, Math.round((product.bestOffer.totalLandedPrice * 0.92) / 10) * 10)),
      );
    } else {
      setTargetInput('');
    }
  }, [product?.id, product?.bestOffer?.totalLandedPrice, existingAlert]);

  if (!product) return null;

  const primaryOffer = product.bestOffer ?? product.offers[0] ?? null;
  const primaryUrl =
    product.bestOffer?.productUrl ??
    product.offers.find((o) => Boolean(o.productUrl))?.productUrl ??
    null;

  const handleAlertSubmit = (e: FormEvent) => {
    e.preventDefault();
    const numeric = Number(targetInput);
    if (!numeric || numeric <= 0) {
      setAlertFeedback('Enter a valid target price in ₹.');
      return;
    }
    onSavePriceAlert(product, numeric);
    setAlertFeedback(`Price alert saved for ${formatINR(numeric)}.`);
  };

  const points = priceSnapshots;
  const allPrices = points
    .flatMap((pt) => [pt.amazonPrice, pt.flipkartPrice, pt.meeshoPrice, pt.myntraPrice])
    .filter((v): v is number => v !== null);
  const minP = allPrices.length > 0 ? Math.min(...allPrices) * 0.96 : 0;
  const maxP = allPrices.length > 0 ? Math.max(...allPrices) * 1.02 : 1;
  const range = Math.max(1, maxP - minP);

  const buildPolyline = (key: 'amazonPrice' | 'flipkartPrice' | 'meeshoPrice' | 'myntraPrice') => {
    return points
      .map((pt, idx) => {
        const val = pt[key];
        if (val === null) return null;
        const x = (idx / Math.max(1, points.length - 1)) * 280 + 10;
        const y = 76 - ((val - minP) / range) * 62;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  };

  const hasMyntra = points.some((pt) => pt.myntraPrice !== null);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-product-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
              <span className="font-semibold text-slate-700">{product.brand}</span>
              <span aria-hidden="true">·</span>
              <span>{product.category}</span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-blue-700">
                Direct Marketplace Search · Updated {formatRelativeTime(product.lastUpdatedIso)}
              </span>
            </div>
            <h2
              id="modal-product-title"
              className="font-display text-lg sm:text-xl font-bold text-slate-900 truncate"
            >
              {product.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-5 aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              <ProductImage
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="md:col-span-7 space-y-4">
              {product.shortDescription && (
                <p className="text-sm text-slate-600 leading-relaxed">{product.shortDescription}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm">
                {product.bestOffer && product.bestOffer.totalLandedPrice !== null ? (
                  <div className="text-emerald-700 font-semibold">
                    Lowest Entered Price: {formatINR(product.bestOffer.totalLandedPrice)} on{' '}
                    {product.bestOffer.marketplaceName}
                    {product.maxPriceSpread && product.maxPriceSpread > 0
                      ? ` (Save ${formatINR(product.maxPriceSpread)})`
                      : ''}
                  </div>
                ) : (
                  <div className="text-slate-700 font-semibold">
                    No prices entered yet — open store links below and type the prices you find.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {primaryUrl && (
                  <a
                    href={primaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 rounded-lg transition-colors"
                  >
                    <span>
                      Search on {primaryOffer ? primaryOffer.marketplaceName : 'Marketplace'}
                    </span>
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => onToggleCompare(product.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border transition-colors cursor-pointer ${
                    isCompared
                      ? 'bg-violet-700 text-white border-violet-700'
                      : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {isCompared ? <Check className="w-4 h-4" /> : <GitCompare className="w-4 h-4" />}
                  <span>{isCompared ? 'Added to Compare' : 'Add to Compare'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleWishlist(product.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border transition-colors cursor-pointer ${
                    isWishlisted
                      ? 'bg-violet-50 text-violet-700 border-violet-200'
                      : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-violet-600' : ''}`} />
                  <span>{isWishlisted ? 'Wishlisted' : 'Save'}</span>
                </button>
              </div>

              <form
                onSubmit={handleAlertSubmit}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-violet-700" />
                    Track Target Price Alert
                  </span>
                  {existingAlert && (
                    <button
                      type="button"
                      onClick={() => {
                        onRemovePriceAlert(existingAlert.id);
                        setAlertFeedback('Price alert removed.');
                      }}
                      className="text-xs text-rose-700 hover:underline cursor-pointer"
                    >
                      Remove Alert
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-slate-500">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={targetInput}
                      onChange={(e) => setTargetInput(e.target.value)}
                      placeholder="Enter target price"
                      aria-label="Target price in INR"
                      className="w-full pl-7 pr-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-700"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {existingAlert ? 'Update Alert' : 'Set Price Alert'}
                  </button>
                </div>
                {alertFeedback && <p className="text-xs text-emerald-700 font-medium">{alertFeedback}</p>}
              </form>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-display text-base font-bold text-slate-900">
                Enter Store Prices & Open Live Search Links
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                Last updated: {formatRelativeTime(product.lastUpdatedIso)}
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Marketplace</th>
                    <th className="py-3 px-4">Price (₹)</th>
                    <th className="py-3 px-4">Shipping (₹)</th>
                    <th className="py-3 px-4">Total Landed</th>
                    <th className="py-3 px-4">Delivery</th>
                    <th className="py-3 px-4">Stock Status</th>
                    <th className="py-3 px-4 text-right">Marketplace Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {product.offers.map((offer) => {
                    const accent = getMarketplaceAccent(offer.marketplace);
                    const isCheapest =
                      product.bestOffer !== null &&
                      product.bestOffer.totalLandedPrice !== null &&
                      offer.marketplace === product.bestOffer.marketplace;

                    return (
                      <tr
                        key={offer.marketplace}
                        className={isCheapest ? 'bg-emerald-50/40' : 'hover:bg-slate-50/70'}
                      >
                        <td className="py-3.5 px-4">
                          <div className={`font-semibold ${accent.textClass}`}>{offer.marketplaceName}</div>
                          <div className="text-xs text-slate-500">{offer.sourceLabel}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
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
                                  onUpdateOfferPrice(
                                    product.id,
                                    offer.marketplace,
                                    null,
                                    offer.shippingFee,
                                  );
                                  return;
                                }
                                const num = Number(val);
                                if (!Number.isNaN(num) && num >= 0) {
                                  onUpdateOfferPrice(
                                    product.id,
                                    offer.marketplace,
                                    num,
                                    offer.shippingFee,
                                  );
                                }
                              }}
                              placeholder="Enter ₹"
                              aria-label={`${offer.marketplaceName} price`}
                              className="w-full pl-6 pr-2 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-violet-700"
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="relative w-24">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                              ₹
                            </span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={offer.shippingFee ?? ''}
                              onChange={(e) => {
                                const val = e.target.value.trim();
                                if (!val) {
                                  onUpdateOfferPrice(product.id, offer.marketplace, offer.price, null);
                                  return;
                                }
                                const num = Number(val);
                                if (!Number.isNaN(num) && num >= 0) {
                                  onUpdateOfferPrice(product.id, offer.marketplace, offer.price, num);
                                }
                              }}
                              placeholder="Optional"
                              aria-label={`${offer.marketplaceName} shipping charge`}
                              className="w-full pl-6 pr-2 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-violet-700"
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums">
                          <div className="font-bold text-slate-900">
                            {offer.totalLandedPrice !== null
                              ? formatINR(offer.totalLandedPrice)
                              : 'Not Entered'}
                          </div>
                          {isCheapest && (
                            <span className="text-xs font-semibold text-emerald-700">Lowest Price</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {offer.estimatedDeliveryLabel}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{getStockLabel(offer.stockStatus)}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {offer.productUrl ? (
                            <a
                              href={offer.productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors whitespace-nowrap"
                            >
                              <span>Open Search</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">Not Available</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="font-display text-sm font-bold text-slate-900">
                Direct Marketplace Search Links
              </h4>
              <ul className="space-y-2 text-xs">
                {product.offers.map((offer) =>
                  offer.productUrl ? (
                    <li key={offer.marketplace} className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-700">{offer.marketplaceName}</span>
                      <a
                        href={offer.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-700 hover:underline truncate max-w-[260px]"
                      >
                        <span className="truncate">{offer.productUrl}</span>
                        <ArrowUpRight className="w-3 h-3 shrink-0" />
                      </a>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-display text-sm font-bold text-slate-900">Entered Price History</h4>
                <span className="text-[11px] font-medium text-slate-500">
                  {points.length} snapshot{points.length === 1 ? '' : 's'}
                </span>
              </div>
              {points.length < 2 ? (
                <div className="py-6 text-xs text-slate-500">
                  Price history records automatically each time you enter or update store prices for
                  this product.
                </div>
              ) : (
                <>
                  <svg
                    viewBox="0 0 300 90"
                    className="w-full h-28 overflow-visible"
                    aria-label="Entered price history chart"
                  >
                    <line x1="10" y1="76" x2="290" y2="76" stroke="#E2E8F0" strokeWidth="1" />
                    <line x1="10" y1="45" x2="290" y2="45" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="10" y1="14" x2="290" y2="14" stroke="#F1F5F9" strokeWidth="1" />
                    <polyline
                      fill="none"
                      stroke="#D97706"
                      strokeWidth="2"
                      points={buildPolyline('amazonPrice')}
                    />
                    <polyline
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="2"
                      points={buildPolyline('flipkartPrice')}
                    />
                    <polyline
                      fill="none"
                      stroke="#7C3AED"
                      strokeWidth="2"
                      points={buildPolyline('meeshoPrice')}
                    />
                    {hasMyntra && (
                      <polyline
                        fill="none"
                        stroke="#4338CA"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        points={buildPolyline('myntraPrice')}
                      />
                    )}
                  </svg>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-0.5 bg-amber-600 inline-block" /> Amazon
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-0.5 bg-blue-600 inline-block" /> Flipkart
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-0.5 bg-violet-600 inline-block" /> Meesho
                    </span>
                    {hasMyntra && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-0.5 bg-indigo-700 inline-block" /> Myntra
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
