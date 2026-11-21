import type {
  DirectSearchLink,
  MarketplaceId,
  MarketplaceOffer,
  ProductItem,
} from '../types';

export const MARKETPLACE_LIST: Array<{ id: MarketplaceId; name: string }> = [
  { id: 'amazon', name: 'Amazon India' },
  { id: 'flipkart', name: 'Flipkart' },
  { id: 'meesho', name: 'Meesho' },
  { id: 'myntra', name: 'Myntra' },
];

export function normalizeProductSlug(query: string): string {
  return (
    query
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'product'
  );
}

export function buildMarketplaceSearchUrl(marketplace: MarketplaceId, query: string): string {
  const clean = query.trim() || 'smartphones';
  switch (marketplace) {
    case 'amazon':
      return `https://www.amazon.in/s?k=${encodeURIComponent(clean)}`;
    case 'flipkart':
      return `https://www.flipkart.com/search?q=${encodeURIComponent(clean)}`;
    case 'meesho':
      return `https://www.meesho.com/search?q=${encodeURIComponent(clean)}`;
    case 'myntra': {
      const slug = normalizeProductSlug(clean);
      return `https://www.myntra.com/${encodeURIComponent(slug)}?rawQuery=${encodeURIComponent(clean)}`;
    }
  }
}

export function buildAllMarketplaceSearchLinks(query: string): DirectSearchLink[] {
  return MARKETPLACE_LIST.map((m) => ({
    marketplace: m.id,
    marketplaceName: m.name,
    url: buildMarketplaceSearchUrl(m.id, query),
  }));
}

export function inferCategoryAndBrand(query: string): { brand: string; category: string } {
  const q = query.toLowerCase();

  let brand = 'Custom Search';
  const knownBrands: Array<[RegExp, string]> = [
    [/\b(iphone|apple|macbook|airpods|ipad|watch)\b/i, 'Apple'],
    [/\bsamsung\b/i, 'Samsung'],
    [/\bsony\b/i, 'Sony'],
    [/\boneplus\b/i, 'OnePlus'],
    [/\bboat\b/i, 'boAt'],
    [/\bjbl\b/i, 'JBL'],
    [/\bnike\b/i, 'Nike'],
    [/\badidas\b/i, 'Adidas'],
    [/\bpuma\b/i, 'Puma'],
    [/\bphilips\b/i, 'Philips'],
    [/\brealme\b/i, 'realme'],
    [/\bxiaomi|redmi\b/i, 'Xiaomi'],
    [/\bhp\b/i, 'HP'],
    [/\blenovo\b/i, 'Lenovo'],
    [/\bdell\b/i, 'Dell'],
    [/\blevi'?s\b/i, "Levi's"],
  ];
  for (const [pattern, label] of knownBrands) {
    if (pattern.test(q)) {
      brand = label;
      break;
    }
  }

  let category = 'General';
  if (/(iphone|phone|mobile|smartphone|galaxy|oneplus|redmi|realme)/i.test(q)) {
    category = 'Smartphones';
  } else if (/(headphone|earbud|earphone|airpods|speaker|audio|soundbar|wh-1000)/i.test(q)) {
    category = 'Audio';
  } else if (/(shoe|sneaker|running|footwear|sandal|boot)/i.test(q)) {
    category = 'Footwear';
  } else if (/(shirt|t-shirt|jeans|kurta|dress|jacket|hoodie|apparel|saree)/i.test(q)) {
    category = 'Apparel';
  } else if (/(fryer|mixer|blender|kettle|cooker|kitchen|microwave)/i.test(q)) {
    category = 'Kitchen';
  } else if (/(laptop|macbook|tablet|ipad|monitor|keyboard)/i.test(q)) {
    category = 'Electronics';
  }

  return { brand, category };
}

export function recomputeProductAggregates(product: ProductItem): ProductItem {
  const offers: MarketplaceOffer[] = product.offers.map((offer) => {
    const totalLandedPrice =
      offer.price !== null ? Math.round((offer.price + (offer.shippingFee ?? 0)) * 100) / 100 : null;
    const isUserEntered = offer.price !== null;
    return {
      ...offer,
      totalLandedPrice,
      sourceType: isUserEntered ? 'USER_ENTERED' : 'DIRECT_SEARCH',
      sourceLabel: isUserEntered ? 'Entered Price' : 'Direct Search Link',
    };
  });

  const pricedOffers = offers.filter(
    (o) => o.totalLandedPrice !== null && o.stockStatus !== 'OUT_OF_STOCK',
  );
  const fallbackPriced = offers.filter((o) => o.totalLandedPrice !== null);
  const pool = pricedOffers.length > 0 ? pricedOffers : fallbackPriced;

  const bestOffer =
    pool.length > 0
      ? [...pool].sort(
          (a, b) =>
            (a.totalLandedPrice ?? Number.MAX_SAFE_INTEGER) -
            (b.totalLandedPrice ?? Number.MAX_SAFE_INTEGER),
        )[0]
      : null;

  const numericPrices = offers
    .map((o) => o.totalLandedPrice)
    .filter((v): v is number => v !== null);
  const highestPrice = numericPrices.length > 0 ? Math.max(...numericPrices) : null;
  const maxPriceSpread =
    numericPrices.length >= 2 && highestPrice !== null && bestOffer?.totalLandedPrice != null
      ? Math.max(0, highestPrice - bestOffer.totalLandedPrice)
      : null;

  const deliveryPool = offers.filter((o) => o.deliveryDaysMin !== null);
  const fastestOffer =
    deliveryPool.length > 0
      ? [...deliveryPool].sort((a, b) => (a.deliveryDaysMin ?? 99) - (b.deliveryDaysMin ?? 99))[0]
      : null;

  return {
    ...product,
    offers,
    bestOffer,
    fastestOffer,
    highestPrice,
    maxPriceSpread,
    groundingSources: offers
      .filter((o) => Boolean(o.productUrl))
      .map((o) => ({ title: `${o.marketplaceName} Search`, uri: o.productUrl! })),
  };
}

export function createDirectSearchProduct(
  query: string,
  timestampIso = new Date().toISOString(),
): ProductItem {
  const cleanName = query.trim() || 'Apple iPhone 15';
  const id = `search-${normalizeProductSlug(cleanName)}`;
  const { brand, category } = inferCategoryAndBrand(cleanName);

  const offers: MarketplaceOffer[] = MARKETPLACE_LIST.map((m) => ({
    marketplace: m.id,
    marketplaceName: m.name,
    price: null,
    mrp: null,
    discountPercent: null,
    shippingFee: null,
    totalLandedPrice: null,
    deliveryDaysMin: null,
    deliveryDaysMax: null,
    estimatedDeliveryLabel: 'Not Available',
    expressEligible: false,
    stockStatus: 'NOT_AVAILABLE',
    stockQuantityNote: 'Not Available',
    sellerName: null,
    rating: null,
    reviewCount: null,
    productUrl: buildMarketplaceSearchUrl(m.id, cleanName),
    sourceType: 'DIRECT_SEARCH',
    sourceLabel: 'Direct Search Link',
    lastUpdatedIso: timestampIso,
  }));

  return recomputeProductAggregates({
    id,
    name: cleanName,
    brand,
    category,
    shortDescription: `Direct live search links across Amazon India, Flipkart, Meesho, and Myntra for "${cleanName}". Open each store link to check real-time pricing, then enter prices below to compare.`,
    imageUrl: '',
    specs: {},
    offers,
    bestOffer: null,
    fastestOffer: null,
    maxPriceSpread: null,
    highestPrice: null,
    averageRating: null,
    totalReviews: null,
    groundingSources: offers
      .filter((o) => Boolean(o.productUrl))
      .map((o) => ({ title: `${o.marketplaceName} Search`, uri: o.productUrl! })),
    lastUpdatedIso: timestampIso,
    dataMode: 'DIRECT_SEARCH',
  });
}
