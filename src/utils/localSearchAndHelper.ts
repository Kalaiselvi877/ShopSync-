import type {
  CheckedPriceAlert,
  DataSourceMode,
  DirectSearchLink,
  IntegrationTestResult,
  MarketplaceIntegrationInfo,
  PriceAlert,
  ProductItem,
  SearchResponse,
} from '../types';
import {
  buildAllMarketplaceSearchLinks,
  createDirectSearchProduct,
} from './marketplaceLinks';

export function getLocalIntegrationStatuses(): MarketplaceIntegrationInfo[] {
  return [
    {
      id: 'direct_search',
      name: 'Direct Marketplace Search Engine',
      configured: true,
      mode: 'ACTIVE',
      protocol: 'Client-Side Direct Live Search URLs (Zero External APIs)',
      requiredEnvVars: [],
      approvalNote:
        'Generates clickable live search links for Amazon India, Flipkart, Meesho, and Myntra directly in your browser and compares user-entered prices side-by-side.',
    },
    {
      id: 'amazon',
      name: 'Amazon India',
      configured: true,
      mode: 'DIRECT_SEARCH',
      protocol: 'Direct Search URL (amazon.in/s)',
      requiredEnvVars: [],
      approvalNote:
        'Opens live Amazon India product search results directly in a new tab with zero API keys required.',
    },
    {
      id: 'flipkart',
      name: 'Flipkart',
      configured: true,
      mode: 'DIRECT_SEARCH',
      protocol: 'Direct Search URL (flipkart.com/search)',
      requiredEnvVars: [],
      approvalNote:
        'Opens live Flipkart product search results directly in a new tab with zero API keys required.',
    },
    {
      id: 'meesho',
      name: 'Meesho',
      configured: true,
      mode: 'DIRECT_SEARCH',
      protocol: 'Direct Search URL (meesho.com/search)',
      requiredEnvVars: [],
      approvalNote:
        'Opens live Meesho product search results directly in a new tab with zero API keys required.',
    },
    {
      id: 'myntra',
      name: 'Myntra',
      configured: true,
      mode: 'DIRECT_SEARCH',
      protocol: 'Direct Search URL (myntra.com)',
      requiredEnvVars: [],
      approvalNote:
        'Opens live Myntra product search results directly in a new tab with zero API keys required.',
    },
  ];
}

export function testLocalConnections(): IntegrationTestResult[] {
  const nowIso = new Date().toISOString();
  const sampleLinks = buildAllMarketplaceSearchLinks('iPhone 15');

  return [
    {
      id: 'direct_search',
      name: 'Direct Marketplace Search Engine',
      status: 'CONNECTED',
      httpStatus: null,
      latencyMs: 0,
      message: `Ready with ${sampleLinks.length} direct marketplace search link generators (100% browser-based, no APIs required).`,
      testedAtIso: nowIso,
    },
    {
      id: 'amazon',
      name: 'Amazon India',
      status: 'DIRECT_SEARCH_ACTIVE',
      httpStatus: null,
      latencyMs: 0,
      message: 'Direct Amazon India search links active (amazon.in/s?k=...).',
      testedAtIso: nowIso,
    },
    {
      id: 'flipkart',
      name: 'Flipkart',
      status: 'DIRECT_SEARCH_ACTIVE',
      httpStatus: null,
      latencyMs: 0,
      message: 'Direct Flipkart search links active (flipkart.com/search?q=...).',
      testedAtIso: nowIso,
    },
    {
      id: 'meesho',
      name: 'Meesho',
      status: 'DIRECT_SEARCH_ACTIVE',
      httpStatus: null,
      latencyMs: 0,
      message: 'Direct Meesho search links active (meesho.com/search?q=...).',
      testedAtIso: nowIso,
    },
    {
      id: 'myntra',
      name: 'Myntra',
      status: 'DIRECT_SEARCH_ACTIVE',
      httpStatus: null,
      latencyMs: 0,
      message: 'Direct Myntra search links active (myntra.com/...).',
      testedAtIso: nowIso,
    },
  ];
}

export function searchCatalogLocal(rawQuery: string): SearchResponse {
  const fetchedAtIso = new Date().toISOString();
  const query = rawQuery.trim() || 'Apple iPhone 15';
  const product = createDirectSearchProduct(query, fetchedAtIso);
  const directSearchLinks = buildAllMarketplaceSearchLinks(query);

  return {
    products: [product],
    totalCount: 1,
    queryUsed: query,
    directSearchLinks,
    categories: [product.category],
    brands: [product.brand],
    suggestions: [
      'Apple iPhone 15',
      'Sony WH-1000XM5',
      'Nike Running Shoes',
      'Philips Air Fryer',
      'Samsung Galaxy S24',
    ],
    dataMode: 'DIRECT_SEARCH',
    marketplaceErrors: [],
    groundingSources: directSearchLinks.map((l) => ({
      title: `${l.marketplaceName} Search`,
      uri: l.url,
    })),
    integrations: getLocalIntegrationStatuses(),
    fetchedAtIso,
  };
}

export function evaluatePriceAlertsLocal(
  alerts: PriceAlert[],
  products: ProductItem[],
): CheckedPriceAlert[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return alerts.map((alert) => {
    const product = byId.get(alert.productId);
    if (!product || product.bestOffer?.totalLandedPrice == null) {
      return {
        ...alert,
        currentBestPrice: null,
        bestMarketplace: null,
        triggered: false,
        difference: null,
      };
    }
    const currentBestPrice = product.bestOffer.totalLandedPrice;
    return {
      ...alert,
      currentBestPrice,
      bestMarketplace: product.bestOffer.marketplace,
      triggered: currentBestPrice <= alert.targetPrice,
      difference: currentBestPrice - alert.targetPrice,
    };
  });
}

function extractBudgetINR(text: string): number | null {
  const match = text.match(
    /(?:under|below|less than|max|budget|upto|up to)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i,
  );
  if (!match) return null;
  const num = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(num) && num > 0 ? num : null;
}

function extractProductSubject(query: string): string {
  const cleaned = query
    .replace(
      /^(which store has the cheapest|find the best|compare|check prices for|search for|show me|find)\s+/i,
      '',
    )
    .replace(
      /\b(across amazon,?\s*flipkart,?\s*meesho,?\s*(and|&)?\s*myntra|on amazon|on flipkart|cheapest|lowest price)\b/gi,
      '',
    )
    .replace(/(?:under|below|less than|max|budget|upto|up to)\s*(?:₹|rs\.?|inr)?\s*[\d,]+/gi, '')
    .replace(/[?.!]+$/g, '')
    .trim();
  return cleaned || query.trim() || 'Apple iPhone 15';
}

export function askShoppingAssistantLocal(body: {
  query: string;
  products?: ProductItem[];
}): {
  answer: string;
  recommendedProductIds: string[];
  recommendedProducts: ProductItem[];
  directSearchLinks: DirectSearchLink[];
  bestPickReason: string;
  followUpPrompts: string[];
  dataMode: DataSourceMode;
} {
  const rawQuery = body.query.trim();
  const budget = extractBudgetINR(rawQuery);
  const subject = extractProductSubject(rawQuery);
  const directSearchLinks = buildAllMarketplaceSearchLinks(subject);

  const sessionProducts = Array.isArray(body.products) ? body.products : [];
  const lowerSubject = subject.toLowerCase();

  const matchingSessionProducts = sessionProducts.filter((p) => {
    const hay = `${p.name} ${p.brand} ${p.category}`.toLowerCase();
    return lowerSubject
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .some((word) => hay.includes(word));
  });

  const pricedMatches = (
    matchingSessionProducts.length > 0 ? matchingSessionProducts : sessionProducts
  ).filter((p) => {
    if (p.bestOffer?.totalLandedPrice == null) return false;
    if (budget !== null && p.bestOffer.totalLandedPrice > budget) return false;
    return true;
  });

  const sortedPriced = [...pricedMatches].sort(
    (a, b) =>
      (a.bestOffer?.totalLandedPrice ?? Number.MAX_SAFE_INTEGER) -
      (b.bestOffer?.totalLandedPrice ?? Number.MAX_SAFE_INTEGER),
  );

  if (sortedPriced.length > 0) {
    const top = sortedPriced[0];
    const best = top.bestOffer!;
    const spreadText =
      top.maxPriceSpread && top.maxPriceSpread > 0
        ? ` You save ₹${top.maxPriceSpread.toLocaleString('en-IN')} compared to the highest entered store price.`
        : '';

    return {
      answer: `Based on the prices you entered, ${top.name} has the lowest price at ₹${best.totalLandedPrice!.toLocaleString('en-IN')} on ${best.marketplaceName}.${spreadText} Use the direct store links below to verify current stock or delivery speed on each marketplace.`,
      recommendedProductIds: sortedPriced.slice(0, 3).map((p) => p.id),
      recommendedProducts: sortedPriced.slice(0, 3),
      directSearchLinks,
      bestPickReason: `Lowest entered price: ₹${best.totalLandedPrice!.toLocaleString('en-IN')} on ${best.marketplaceName}.`,
      followUpPrompts: [
        `Compare ${subject} across all 4 stores`,
        'Which tracked product has the lowest price?',
      ],
      dataMode: 'DIRECT_SEARCH',
    };
  }

  const generatedProduct = matchingSessionProducts[0] ?? createDirectSearchProduct(subject);
  const budgetNote =
    budget !== null ? ` (your target budget: under ₹${budget.toLocaleString('en-IN')})` : '';

  return {
    answer: `Direct search links are ready for "${subject}"${budgetNote} across Amazon India, Flipkart, Meesho, and Myntra. Open any marketplace link below to view live listings, then enter the prices you find on the product card to compare and highlight the lowest deal.`,
    recommendedProductIds: [generatedProduct.id],
    recommendedProducts: [generatedProduct],
    directSearchLinks,
    bestPickReason:
      'ShopSync runs directly in your browser using live marketplace search URLs with zero external APIs.',
    followUpPrompts: [
      'Show lowest price across entered items',
      'Compare Sony WH-1000XM5',
    ],
    dataMode: 'DIRECT_SEARCH',
  };
}
