import { ArrowUpRight, Award, Trash2, X } from 'lucide-react';
import type { MarketplaceId, ProductItem } from '../types';
import { formatINR } from '../utils/formatters';
import { ProductImage } from './ProductImage';

interface ComparisonMatrixProps {
  products: ProductItem[];
  onRemoveProduct: (productId: string) => void;
  onClearAll: () => void;
  onOpenDetail: (product: ProductItem) => void;
  onUpdateOfferPrice: (productId: string, marketplace: MarketplaceId, price: number | null) => void;
}

export function ComparisonMatrix({
  products,
  onRemoveProduct,
  onClearAll,
  onOpenDetail,
  onUpdateOfferPrice,
}: ComparisonMatrixProps) {
  if (products.length === 0) {
    return (
      <section
        id="compare-matrix"
        className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center space-y-2"
      >
        <h2 className="font-display text-xl font-bold text-slate-900">Side-by-Side Product Comparison</h2>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Select <strong>Compare</strong> on any products above to compare your entered prices and
          direct search links across Amazon India, Flipkart, Meesho, and Myntra side-by-side.
        </p>
      </section>
    );
  }

  const pricedProducts = products.filter((p) => p.bestOffer?.totalLandedPrice != null);
  const lowestCostId = [...pricedProducts].sort(
    (a, b) =>
      (a.bestOffer?.totalLandedPrice ?? Number.MAX_SAFE_INTEGER) -
      (b.bestOffer?.totalLandedPrice ?? Number.MAX_SAFE_INTEGER),
  )[0]?.id;

  const getStoreCell = (product: ProductItem, store: MarketplaceId) => {
    const offer = product.offers.find((o) => o.marketplace === store);
    if (!offer) return <span className="text-slate-400 text-xs">Not listed</span>;

    const isLowestStore =
      product.bestOffer !== null &&
      product.bestOffer.totalLandedPrice !== null &&
      product.bestOffer.marketplace === store;

    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <div className="relative w-24">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400">
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
                  onUpdateOfferPrice(product.id, store, null);
                  return;
                }
                const num = Number(val);
                if (!Number.isNaN(num) && num >= 0) {
                  onUpdateOfferPrice(product.id, store, num);
                }
              }}
              placeholder="Price"
              aria-label={`Compare price on ${offer.marketplaceName} for ${product.name}`}
              className={`w-full pl-5 pr-2 py-1 text-xs font-mono tabular-nums rounded border bg-white focus:outline-none focus:ring-2 focus:ring-violet-700 ${
                isLowestStore ? 'border-emerald-400 font-semibold text-slate-900' : 'border-slate-300'
              }`}
            />
          </div>

          {offer.productUrl && (
            <a
              href={offer.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open ${offer.marketplaceName} search`}
              className="text-blue-700 hover:underline inline-flex items-center gap-0.5 text-[11px] font-semibold shrink-0"
            >
              <span>Search</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>
          )}
        </div>
        {isLowestStore && (
          <div className="text-[11px] font-semibold text-emerald-700">Lowest Store Price</div>
        )}
      </div>
    );
  };

  return (
    <section
      id="compare-matrix"
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Side-by-Side Comparison ({products.length}/4)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter prices directly from store tabs and automatically highlight the lowest entered deal.
          </p>
        </div>

        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Comparison</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm min-w-[680px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/60 align-top">
              <th className="py-4 px-5 w-44 text-xs font-semibold text-slate-600">Attribute</th>
              {products.map((product) => {
                const isLowest = product.id === lowestCostId;

                return (
                  <th key={product.id} className="py-4 px-5 min-w-[220px] font-normal">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(product)}
                        className="w-20 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer"
                      >
                        <ProductImage
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveProduct(product.id)}
                        aria-label={`Remove ${product.name} from comparison`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenDetail(product)}
                      className="font-display font-semibold text-slate-900 hover:text-blue-700 text-left line-clamp-2 cursor-pointer"
                    >
                      {product.name}
                    </button>
                    <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                      {isLowest && (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <Award className="w-3.5 h-3.5" /> Lowest Entered Price
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="py-3.5 px-5 font-medium text-slate-600">Lowest Entered Price</td>
              {products.map((p) => (
                <td key={p.id} className="py-3.5 px-5">
                  {p.bestOffer && p.bestOffer.totalLandedPrice !== null ? (
                    <>
                      <div className="font-mono tabular-nums text-base font-bold text-slate-900">
                        {formatINR(p.bestOffer.totalLandedPrice)}
                      </div>
                      <div className="text-xs text-emerald-700 font-medium">
                        on {p.bestOffer.marketplaceName}
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500">Not entered yet</span>
                  )}
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3.5 px-5 font-medium text-slate-600">Cross-Store Spread</td>
              {products.map((p) => (
                <td key={p.id} className="py-3.5 px-5 font-mono tabular-nums text-xs text-slate-700">
                  {p.maxPriceSpread !== null && p.maxPriceSpread > 0
                    ? `Save ${formatINR(p.maxPriceSpread)}`
                    : 'Enter 2+ prices to compare'}
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3.5 px-5 font-medium text-slate-600">Amazon India</td>
              {products.map((p) => (
                <td key={p.id} className="py-3.5 px-5">
                  {getStoreCell(p, 'amazon')}
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3.5 px-5 font-medium text-slate-600">Flipkart</td>
              {products.map((p) => (
                <td key={p.id} className="py-3.5 px-5">
                  {getStoreCell(p, 'flipkart')}
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3.5 px-5 font-medium text-slate-600">Meesho</td>
              {products.map((p) => (
                <td key={p.id} className="py-3.5 px-5">
                  {getStoreCell(p, 'meesho')}
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3.5 px-5 font-medium text-slate-600">Myntra</td>
              {products.map((p) => (
                <td key={p.id} className="py-3.5 px-5">
                  {getStoreCell(p, 'myntra')}
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3.5 px-5 font-medium text-slate-600">Stock & Delivery Info</td>
              {products.map((p) => (
                <td key={p.id} className="py-3.5 px-5 text-xs text-slate-500">
                  Not Available (Check store link)
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3.5 px-5 font-medium text-slate-600">Action</td>
              {products.map((p) => {
                const actionOffer = p.bestOffer ?? p.offers[0] ?? null;
                const actionUrl = actionOffer?.productUrl ?? null;
                return (
                  <td key={p.id} className="py-3.5 px-5">
                    {actionUrl ? (
                      <a
                        href={actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <span>
                          Open {actionOffer ? actionOffer.marketplaceName : 'Marketplace'}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Not Available</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
