import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  Globe,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { AiAssistantDrawer } from './components/AiAssistantDrawer';
import { AuthPages } from './components/AuthPages';
import { ComparisonMatrix } from './components/ComparisonMatrix';
import { DashboardOverview } from './components/DashboardOverview';
import { Header } from './components/Header';
import { IntegrationStatusModal } from './components/IntegrationStatusModal';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { ProductImage } from './components/ProductImage';
import { SavedAndHistoryDrawer } from './components/SavedAndHistoryDrawer';
import type {
  AnalyticsEventType,
  AssistantMessage,
  AuthUser,
  AuthView,
  CheckedPriceAlert,
  ComparisonHistoryEntry,
  DataSourceMode,
  DirectSearchLink,
  MarketplaceId,
  MarketplaceIntegrationInfo,
  PriceAlert,
  PriceTrendPoint,
  ProductItem,
  RecentActivityItem,
} from './types';
import { formatRelativeTime } from './utils/formatters';
import { recordAnalyticsEventLocal } from './utils/localAnalyticsStore';
import {
  getAdminBySessionTokenLocal,
  getUserBySessionTokenLocal,
  logoutBySessionTokenLocal,
  readStoredAdminToken,
  readStoredUserToken,
  writeStoredAdminToken,
  writeStoredUserToken,
} from './utils/localAuthStore';
import {
  askShoppingAssistantLocal,
  evaluatePriceAlertsLocal,
  getLocalIntegrationStatuses,
  searchCatalogLocal,
} from './utils/localSearchAndHelper';
import {
  buildAllMarketplaceSearchLinks,
  createDirectSearchProduct,
  recomputeProductAggregates,
} from './utils/marketplaceLinks';

const STORAGE_PRODUCTS = 'shopsync_products_v2';
const STORAGE_WISHLIST = 'shopsync_wishlist_v1';
const STORAGE_ALERTS = 'shopsync_alerts_v1';
const STORAGE_HISTORY = 'shopsync_compare_history_v1';
const STORAGE_SEARCH_COUNT = 'shopsync_search_count_v1';
const STORAGE_ACTIVITY = 'shopsync_recent_activity_v1';
const STORAGE_PRICE_SNAPSHOTS = 'shopsync_price_snapshots_v1';

const HERO_IMAGE_URL = '/src/assets/images/hero_shopsync_showcase_1795021288414.jpg';

const QUICK_SEARCH_QUERIES = [
  'iPhone 15',
  'Sony WH-1000XM5',
  'Nike Running Shoes',
  'Philips Air Fryer',
];

const INITIAL_SUGGESTIONS = [
  'Apple iPhone 15',
  'Sony WH-1000XM5',
  'Nike Running Shoes',
  'Philips Air Fryer',
  'Samsung Galaxy S24',
  'Boat Rockerz Headphones',
];

function readLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isAdminRouteRequested(): boolean {
  try {
    return (
      window.location.pathname.startsWith('/admin') ||
      window.location.hash.toLowerCase().startsWith('#admin')
    );
  } catch {
    return false;
  }
}

function readAdminResetParamsFromUrl(): { email: string; resetToken: string } | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const resetToken = (params.get('resetToken') ?? '').trim();
    const email = (params.get('email') ?? '').trim().toLowerCase();
    if (!resetToken) return null;
    return { email, resetToken };
  } catch {
    return null;
  }
}

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() => readStoredUserToken());
  const [adminUser, setAdminUser] = useState<AuthUser | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(() => readStoredAdminToken());
  const [adminResetParams, setAdminResetParams] = useState<{
    email: string;
    resetToken: string;
  } | null>(() => readAdminResetParamsFromUrl());
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authView, setAuthView] = useState<AuthView>(() =>
    isAdminRouteRequested() || Boolean(readAdminResetParamsFromUrl()) ? 'admin_login' : 'welcome',
  );
  const [authBannerMessage, setAuthBannerMessage] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('Apple iPhone 15');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedMarketplace, setSelectedMarketplace] = useState<MarketplaceId | 'all'>('all');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [pricedOnly, setPricedOnly] = useState(false);
  const [multiStoreOnly, setMultiStoreOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'lowest_price' | 'highest_spread' | 'recent' | 'price_desc'>(
    'recent',
  );
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [products, setProducts] = useState<ProductItem[]>(() => {
    const stored = readLocalStorage<ProductItem[]>(STORAGE_PRODUCTS, []);
    if (stored.length > 0) return stored.map(recomputeProductAggregates);
    return [
      createDirectSearchProduct('Apple iPhone 15'),
      createDirectSearchProduct('Sony WH-1000XM5'),
    ];
  });

  const [dataMode, setDataMode] = useState<DataSourceMode>('DIRECT_SEARCH');
  const [integrations, setIntegrations] = useState<MarketplaceIntegrationInfo[]>([]);
  const [lastUpdatedIso, setLastUpdatedIso] = useState<string>(() => new Date().toISOString());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>(() =>
    readLocalStorage<string[]>(STORAGE_WISHLIST, []),
  );
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() =>
    readLocalStorage<PriceAlert[]>(STORAGE_ALERTS, []),
  );
  const [checkedAlerts, setCheckedAlerts] = useState<CheckedPriceAlert[]>([]);
  const [comparisonHistory, setComparisonHistory] = useState<ComparisonHistoryEntry[]>(() =>
    readLocalStorage<ComparisonHistoryEntry[]>(STORAGE_HISTORY, []),
  );
  const [totalSearches, setTotalSearches] = useState<number>(() =>
    readLocalStorage<number>(STORAGE_SEARCH_COUNT, 0),
  );
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>(() =>
    readLocalStorage<RecentActivityItem[]>(STORAGE_ACTIVITY, []),
  );
  const [priceSnapshotsByProduct, setPriceSnapshotsByProduct] = useState<
    Record<string, PriceTrendPoint[]>
  >(() => readLocalStorage<Record<string, PriceTrendPoint[]>>(STORAGE_PRICE_SNAPSHOTS, {}));

  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  const pushActivity = useCallback((type: RecentActivityItem['type'], label: string) => {
    setRecentActivity((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        label,
        createdAtIso: new Date().toISOString(),
      },
      ...prev.slice(0, 14),
    ]);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(products));
    } catch {
      // ignore storage quota errors
    }
  }, [products]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_WISHLIST, JSON.stringify(wishlistIds));
    } catch {
      // ignore storage quota errors
    }
  }, [wishlistIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_ALERTS, JSON.stringify(priceAlerts));
    } catch {
      // ignore storage quota errors
    }
  }, [priceAlerts]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_HISTORY, JSON.stringify(comparisonHistory));
    } catch {
      // ignore storage quota errors
    }
  }, [comparisonHistory]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_SEARCH_COUNT, JSON.stringify(totalSearches));
    } catch {
      // ignore storage quota errors
    }
  }, [totalSearches]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_ACTIVITY, JSON.stringify(recentActivity));
    } catch {
      // ignore storage quota errors
    }
  }, [recentActivity]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_PRICE_SNAPSHOTS,
        JSON.stringify(priceSnapshotsByProduct),
      );
    } catch {
      // ignore storage quota errors
    }
  }, [priceSnapshotsByProduct]);

  useEffect(() => {
    try {
      const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
      let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.rel = 'canonical';
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = canonicalUrl;

      let ogUrlMeta = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
      if (!ogUrlMeta) {
        ogUrlMeta = document.createElement('meta');
        ogUrlMeta.setAttribute('property', 'og:url');
        document.head.appendChild(ogUrlMeta);
      }
      ogUrlMeta.content = canonicalUrl;
    } catch {
      // ignore DOM metadata errors
    }
  }, [authView, adminUser, authUser]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    let active = true;
    const checkSessions = async () => {
      const userToken = readStoredUserToken();
      const storedAdminToken = readStoredAdminToken();

      const [verifiedAdmin, verifiedUser] = await Promise.all([
        getAdminBySessionTokenLocal(storedAdminToken),
        getUserBySessionTokenLocal(userToken),
      ]);

      if (!active) return;

      if (verifiedAdmin && verifiedAdmin.role === 'admin') {
        setAdminUser(verifiedAdmin);
      } else {
        writeStoredAdminToken(null);
        setAdminToken(null);
        setAdminUser(null);
      }

      if (verifiedUser && verifiedUser.role === 'user') {
        setAuthUser(verifiedUser);
      } else {
        writeStoredUserToken(null);
        setAuthToken(null);
        setAuthUser(null);
      }

      setIsAuthChecking(false);
    };

    checkSessions();
    return () => {
      active = false;
    };
  }, []);

  const handleAuthSuccess = useCallback((user: AuthUser, sessionToken: string) => {
    writeStoredUserToken(sessionToken);
    setAuthToken(sessionToken);
    setAuthUser(user);
    setAuthBannerMessage(null);
    if (window.location.pathname.startsWith('/admin')) {
      window.history.replaceState(null, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleAdminAuthSuccess = useCallback((user: AuthUser, sessionToken: string) => {
    if (user.role !== 'admin') return;
    writeStoredAdminToken(sessionToken);
    setAdminToken(sessionToken);
    setAdminUser(user);
    setAdminResetParams(null);
    setAuthBannerMessage(null);
    window.history.replaceState(null, '', '/admin');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleClearAdminResetParams = useCallback(() => {
    setAdminResetParams(null);
    if (window.location.search.includes('resetToken')) {
      const targetPath = window.location.pathname.startsWith('/admin') ? '/admin' : '/';
      window.history.replaceState(null, '', targetPath);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    const token = authToken || readStoredUserToken();
    try {
      await logoutBySessionTokenLocal(token, 'user');
    } finally {
      writeStoredUserToken(null);
      setAuthToken(null);
      setAuthUser(null);
      setAuthView('welcome');
      setAuthBannerMessage('You have been logged out securely.');
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [authToken]);

  const handleAdminLogout = useCallback(async () => {
    const token = adminToken || readStoredAdminToken();
    try {
      await logoutBySessionTokenLocal(token, 'admin');
    } finally {
      writeStoredAdminToken(null);
      setAdminToken(null);
      setAdminUser(null);
      setAuthView('admin_login');
      setAuthBannerMessage('Administrator logged out securely.');
      window.history.replaceState(null, '', '/admin');
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [adminToken]);

  const trackAnalyticsEvent = useCallback(
    (payload: {
      type: Exclude<AnalyticsEventType, 'register' | 'login'>;
      keyword?: string;
      productId?: string;
      productName?: string;
      category?: string;
      marketplace?: MarketplaceId;
    }) => {
      if (!authUser || authUser.role !== 'user') return;
      recordAnalyticsEventLocal({
        ...payload,
        user: authUser,
      });
    },
    [authUser],
  );

  const loadIntegrations = useCallback(() => {
    setIntegrations(getLocalIntegrationStatuses());
    setLastUpdatedIso(new Date().toISOString());
  }, []);

  useEffect(() => {
    if (authUser) {
      loadIntegrations();
    }
  }, [authUser, loadIntegrations]);

  const executeProductSearch = useCallback(
    (rawQuery: string) => {
      const clean = rawQuery.trim();
      if (!clean) return;

      setIsLoading(true);
      setErrorMessage(null);
      setActiveSearchQuery(clean);
      setTotalSearches((c) => c + 1);
      pushActivity('search', `Generated store links for "${clean}"`);

      try {
        const data = searchCatalogLocal(clean);
        const incomingProducts = data.products;
        setDataMode(data.dataMode);
        setIntegrations(data.integrations);
        setLastUpdatedIso(data.fetchedAtIso);

        setProducts((prev) => {
          const byId = new Map(prev.map((p) => [p.id, p]));
          for (const item of incomingProducts) {
            const existing = byId.get(item.id);
            if (existing) {
              // Keep user-entered prices while refreshing direct search links
              const existingOffers = new Map(existing.offers.map((o) => [o.marketplace, o]));
              const mergedOffers = item.offers.map((newOffer) => {
                const old = existingOffers.get(newOffer.marketplace);
                if (old && old.sourceType === 'USER_ENTERED' && old.price !== null) {
                  return {
                    ...newOffer,
                    price: old.price,
                    shippingFee: old.shippingFee,
                    sourceType: old.sourceType,
                    sourceLabel: old.sourceLabel,
                  };
                }
                return newOffer;
              });
              byId.set(
                item.id,
                recomputeProductAggregates({ ...existing, ...item, offers: mergedOffers }),
              );
            } else {
              byId.set(item.id, recomputeProductAggregates(item));
            }
          }
          const incomingIds = new Set(incomingProducts.map((p) => p.id));
          const rest = Array.from(byId.values()).filter((p) => !incomingIds.has(p.id));
          const prioritized = incomingProducts
            .map((p) => byId.get(p.id))
            .filter((p): p is ProductItem => Boolean(p));
          return [...prioritized, ...rest];
        });

        const primaryMatch = incomingProducts[0];
        trackAnalyticsEvent({
          type: 'search',
          keyword: clean,
          productId: primaryMatch?.id,
          productName: primaryMatch?.name ?? clean,
          category: primaryMatch?.category ?? 'General',
          marketplace: selectedMarketplace !== 'all' ? selectedMarketplace : undefined,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [pushActivity, selectedMarketplace, trackAnalyticsEvent],
  );

  const handleRefreshData = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    loadIntegrations();
    setLastUpdatedIso(new Date().toISOString());
    setIsLoading(false);
  }, [loadIntegrations]);

  useEffect(() => {
    if (priceAlerts.length === 0) {
      setCheckedAlerts([]);
      return;
    }
    setCheckedAlerts(evaluatePriceAlertsLocal(priceAlerts, products));
  }, [priceAlerts, products]);

  const handleUpdateOfferPrice = useCallback(
    (
      productId: string,
      marketplace: MarketplaceId,
      price: number | null,
      shippingFee?: number | null,
    ) => {
      const nowIso = new Date().toISOString();
      setProducts((prev) =>
        prev.map((prod) => {
          if (prod.id !== productId) return prod;
          const updatedOffers = prod.offers.map((offer) => {
            if (offer.marketplace !== marketplace) return offer;
            const nextShipping = shippingFee !== undefined ? shippingFee : offer.shippingFee;
            return {
              ...offer,
              price,
              shippingFee: nextShipping,
              lastUpdatedIso: nowIso,
            };
          });
          const recomputed = recomputeProductAggregates({
            ...prod,
            offers: updatedOffers,
            lastUpdatedIso: nowIso,
          });

          const hasAnyPrice = recomputed.offers.some((o) => o.totalLandedPrice !== null);
          if (hasAnyPrice) {
            const findPrice = (id: MarketplaceId) =>
              recomputed.offers.find((o) => o.marketplace === id)?.totalLandedPrice ?? null;
            const point: PriceTrendPoint = {
              recordedAtIso: nowIso,
              dateLabel: formatRelativeTime(nowIso),
              amazonPrice: findPrice('amazon'),
              flipkartPrice: findPrice('flipkart'),
              meeshoPrice: findPrice('meesho'),
              myntraPrice: findPrice('myntra'),
            };
            setPriceSnapshotsByProduct((snapPrev) => ({
              ...snapPrev,
              [productId]: [...(snapPrev[productId] ?? []), point].slice(-20),
            }));
          }

          return recomputed;
        }),
      );
      setLastUpdatedIso(nowIso);
    },
    [],
  );

  const handleRemoveProduct = useCallback((productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setCompareIds((prev) => prev.filter((id) => id !== productId));
    setDetailProductId((prev) => (prev === productId ? null : prev));
  }, []);

  const catalogById = useMemo(() => {
    const map = new Map<string, ProductItem>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const detailProduct = useMemo(
    () => (detailProductId ? catalogById.get(detailProductId) ?? null : null),
    [detailProductId, catalogById],
  );

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products],
  );

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))).sort(),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const budgetNum = maxPrice ? Number(maxPrice) : null;
    const filtered = products.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (selectedBrand !== 'All' && p.brand !== selectedBrand) return false;
      if (selectedMarketplace !== 'all') {
        const hasStore = p.offers.some((o) => o.marketplace === selectedMarketplace);
        if (!hasStore) return false;
      }
      if (pricedOnly && p.bestOffer?.totalLandedPrice == null) return false;
      if (multiStoreOnly) {
        const enteredCount = p.offers.filter((o) => o.totalLandedPrice !== null).length;
        if (enteredCount < 2) return false;
      }
      if (budgetNum && !Number.isNaN(budgetNum) && budgetNum > 0) {
        if (p.bestOffer?.totalLandedPrice == null || p.bestOffer.totalLandedPrice > budgetNum) {
          return false;
        }
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'lowest_price':
          return (
            (a.bestOffer?.totalLandedPrice ?? Number.MAX_SAFE_INTEGER) -
            (b.bestOffer?.totalLandedPrice ?? Number.MAX_SAFE_INTEGER)
          );
        case 'highest_spread':
          return (b.maxPriceSpread ?? -1) - (a.maxPriceSpread ?? -1);
        case 'price_desc':
          return (b.bestOffer?.totalLandedPrice ?? -1) - (a.bestOffer?.totalLandedPrice ?? -1);
        case 'recent':
        default:
          return new Date(b.lastUpdatedIso).getTime() - new Date(a.lastUpdatedIso).getTime();
      }
    });
  }, [
    products,
    selectedCategory,
    selectedBrand,
    selectedMarketplace,
    maxPrice,
    pricedOnly,
    multiStoreOnly,
    sortBy,
  ]);

  const activeDirectLinks: DirectSearchLink[] = useMemo(
    () => buildAllMarketplaceSearchLinks(activeSearchQuery),
    [activeSearchQuery],
  );

  const comparedProducts = useMemo(
    () => compareIds.map((id) => catalogById.get(id)).filter((p): p is ProductItem => Boolean(p)),
    [compareIds, catalogById],
  );

  const wishlistProducts = useMemo(
    () => wishlistIds.map((id) => catalogById.get(id)).filter((p): p is ProductItem => Boolean(p)),
    [wishlistIds, catalogById],
  );

  useEffect(() => {
    if (comparedProducts.length < 2) return;
    const signature = comparedProducts.map((p) => p.id).sort().join('|');
    setComparisonHistory((prev) => {
      if (prev.length > 0 && [...prev[0].productIds].sort().join('|') === signature) {
        return prev;
      }
      const cheapest = [...comparedProducts].sort(
        (a, b) =>
          (a.bestOffer?.totalLandedPrice ?? Number.MAX_SAFE_INTEGER) -
          (b.bestOffer?.totalLandedPrice ?? Number.MAX_SAFE_INTEGER),
      )[0];
      const nextEntry: ComparisonHistoryEntry = {
        id: `${Date.now()}`,
        productIds: comparedProducts.map((p) => p.id),
        productNames: comparedProducts.map((p) => p.name),
        bestDealProductName: cheapest ? cheapest.name : comparedProducts[0].name,
        createdAtIso: new Date().toISOString(),
      };
      return [nextEntry, ...prev].slice(0, 12);
    });
  }, [comparedProducts]);

  const suggestions = useMemo(() => {
    const names = Array.from(new Set([...products.map((p) => p.name), ...INITIAL_SUGGESTIONS]));
    const q = searchInput.trim().toLowerCase();
    if (!q) return names.slice(0, 6);
    return names.filter((s) => s.toLowerCase().includes(q)).slice(0, 6);
  }, [searchInput, products]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const target = searchInput.trim();
    if (!target) return;
    setShowSuggestions(false);
    executeProductSearch(target);
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePickSuggestion = (text: string) => {
    setSearchInput(text);
    setShowSuggestions(false);
    executeProductSearch(text);
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSelectedBrand('All');
    setSelectedMarketplace('all');
    setMaxPrice('');
    setPricedOnly(false);
    setMultiStoreOnly(false);
    setSortBy('recent');
  };

  const handleToggleCompare = (productId: string) => {
    const product = catalogById.get(productId);
    const alreadyCompared = compareIds.includes(productId);
    if (!alreadyCompared && product) {
      pushActivity('compare', `Added ${product.name} to Compare`);
      trackAnalyticsEvent({
        type: 'compare',
        productId: product.id,
        productName: product.name,
        category: product.category,
      });
    }
    setCompareIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), productId];
      }
      return [...prev, productId];
    });
  };

  const handleToggleWishlist = (productId: string) => {
    const product = catalogById.get(productId);
    const alreadySaved = wishlistIds.includes(productId);
    if (!alreadySaved && product) {
      pushActivity('wishlist', `Saved ${product.name}`);
      trackAnalyticsEvent({
        type: 'save',
        productId: product.id,
        productName: product.name,
        category: product.category,
      });
    }
    setWishlistIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      return [productId, ...prev];
    });
  };

  const handleSavePriceAlert = (product: ProductItem, targetPrice: number) => {
    pushActivity('alert', `Tracking ${product.name} under ₹${targetPrice.toLocaleString('en-IN')}`);
    setPriceAlerts((prev) => {
      const filtered = prev.filter((a) => a.productId !== product.id);
      return [
        {
          id: `${product.id}-${Date.now()}`,
          productId: product.id,
          productName: product.name,
          targetPrice,
          createdAtIso: new Date().toISOString(),
        },
        ...filtered,
      ];
    });
  };

  const handleRemovePriceAlert = (alertId: string) => {
    setPriceAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const handleSendAssistantQuery = (query: string) => {
    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      createdAtIso: new Date().toISOString(),
    };
    setAssistantMessages((prev) => [...prev, userMsg]);
    setIsAssistantLoading(true);

    try {
      const payload = askShoppingAssistantLocal({
        query,
        products,
      });

      const incomingRecs = payload.recommendedProducts ?? [];
      if (incomingRecs.length > 0) {
        setProducts((prev) => {
          const byId = new Map(prev.map((p) => [p.id, p]));
          for (const rec of incomingRecs) {
            if (!byId.has(rec.id)) {
              byId.set(rec.id, recomputeProductAggregates(rec));
            }
          }
          return Array.from(byId.values());
        });
      }

      const assistantMsg: AssistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: payload.answer,
        recommendedProductIds: payload.recommendedProductIds,
        recommendedProducts: incomingRecs,
        directSearchLinks: payload.directSearchLinks,
        bestPickReason: payload.bestPickReason,
        followUpPrompts: payload.followUpPrompts,
        dataMode: payload.dataMode,
        createdAtIso: new Date().toISOString(),
      };
      setAssistantMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      const errMsg: AssistantMessage = {
        id: `assistant-err-${Date.now()}`,
        role: 'assistant',
        text: '',
        error:
          error instanceof Error ? error.message : 'Unable to process shopping helper query.',
        createdAtIso: new Date().toISOString(),
      };
      setAssistantMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsAssistantLoading(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    if (sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const triggeredAlertCount = checkedAlerts.filter((a) => a.triggered).length;

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <RefreshCw className="w-6 h-6 text-violet-700 animate-spin" />
          <div className="font-display text-sm font-semibold text-slate-700">
            Verifying your ShopSync session...
          </div>
        </div>
      </div>
    );
  }

  const adminRouteActive = isAdminRouteRequested() || Boolean(adminResetParams);

  if (adminUser && adminUser.role === 'admin' && (adminRouteActive || !authUser)) {
    return (
      <AdminDashboard
        user={adminUser}
        authToken={adminToken}
        onLogout={handleAdminLogout}
      />
    );
  }

  if (adminRouteActive || !authUser) {
    const activeView: AuthView =
      adminRouteActive && authView !== 'login' && authView !== 'register' && authView !== 'welcome'
        ? 'admin_login'
        : adminRouteActive
          ? 'admin_login'
          : authView;

    return (
      <AuthPages
        view={activeView}
        bannerMessage={authBannerMessage}
        adminResetParams={adminResetParams}
        onClearAdminResetParams={handleClearAdminResetParams}
        onChangeView={(nextView, nextBanner) => {
          setAuthView(nextView);
          setAuthBannerMessage(nextBanner ?? null);
          if (nextView === 'admin_login') {
            if (!window.location.pathname.startsWith('/admin')) {
              window.history.replaceState(null, '', '/admin');
            }
          } else if (window.location.pathname.startsWith('/admin')) {
            window.history.replaceState(null, '', '/');
          }
        }}
        onAuthSuccess={handleAuthSuccess}
        onAdminAuthSuccess={handleAdminAuthSuccess}
      />
    );
  }

  return (
    <div id="top" className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        user={authUser}
        compareCount={comparedProducts.length}
        savedCount={wishlistIds.length}
        triggeredAlertCount={triggeredAlertCount}
        onNavigateSection={scrollToSection}
        onOpenSaved={() => setIsSavedOpen(true)}
        onOpenIntegrations={() => setIsIntegrationsOpen(true)}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {/* Storefront Hero */}
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
              <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="font-semibold text-blue-700">
                    Amazon India · Flipkart · Meesho · Myntra
                  </span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => setIsIntegrationsOpen(true)}
                    className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Direct Marketplace Search Ready</span>
                  </button>
                </div>

                <h1 className="font-display text-[clamp(2rem,3.6vw,3.25rem)] font-bold tracking-tight text-slate-900 leading-[1.1] text-balance max-w-2xl">
                  ShopSync – Smart Shopping Comparison across India&apos;s top stores.
                </h1>

                <p className="text-base text-slate-600 max-w-xl leading-relaxed">
                  Enter any product name to generate direct live search links for Amazon India,
                  Flipkart, Meesho, and Myntra. Open actual store listings, enter the prices you
                  find, and compare the lowest deal side-by-side.
                </p>

                <div ref={searchContainerRef} className="relative max-w-xl">
                  <form onSubmit={handleSearchSubmit} className="flex items-stretch gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchInput}
                        onFocus={() => setShowSuggestions(true)}
                        onChange={(e) => {
                          setSearchInput(e.target.value);
                          setShowSuggestions(true);
                        }}
                        placeholder="Enter a product name (e.g. iPhone 15, Nike Shoes)..."
                        aria-label="Search products across Amazon India, Flipkart, Meesho, and Myntra"
                        className="w-full pl-10 pr-9 py-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-700"
                      />
                      {searchInput && (
                        <button
                          type="button"
                          onClick={() => setSearchInput('')}
                          aria-label="Clear search input"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Search Stores
                    </button>
                  </form>

                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5">
                      {suggestions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handlePickSuggestion(item)}
                          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700 flex items-center gap-2.5 cursor-pointer"
                        >
                          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{item}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-medium text-slate-500">Quick Search:</span>
                  {QUICK_SEARCH_QUERIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handlePickSuggestion(q)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsAssistantOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Price Helper</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 min-h-[280px]">
                <ProductImage
                  src={HERO_IMAGE_URL}
                  alt="Curated electronics and lifestyle products compared across marketplaces"
                  className="w-full h-full lg:h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-transparent text-white">
                  <div className="text-xs font-medium text-blue-200">
                    Direct Store Search & Price Compare
                  </div>
                  <div className="mt-1 font-display text-base font-semibold">
                    Open live marketplace results and highlight your lowest entered price
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Shopping Dashboard Section */}
        <DashboardOverview
          totalSearches={totalSearches}
          wishlistCount={wishlistIds.length}
          checkedAlerts={checkedAlerts}
          catalogProducts={products}
          recentActivity={recentActivity}
          dataMode={dataMode}
          lastUpdatedIso={lastUpdatedIso}
          onOpenProduct={(p) => setDetailProductId(p.id)}
          onOpenSaved={() => setIsSavedOpen(true)}
          onOpenIntegrations={() => setIsIntegrationsOpen(true)}
        />

        {/* Catalog & Filter Workspace */}
        <section id="catalog" className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          {/* Active Direct Search Links Strip */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-display text-sm font-bold text-slate-900 inline-flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>
                    Direct Marketplace Search Links for &ldquo;{activeSearchQuery}&rdquo;
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Click any marketplace below to view actual live listings, then enter the prices
                  you observe into the product card to compare.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsIntegrationsOpen(true)}
                className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Data Sources →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {activeDirectLinks.map((link) => (
                <a
                  key={link.marketplace}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackAnalyticsEvent({
                      type: 'marketplace_click',
                      keyword: activeSearchQuery,
                      productName: activeSearchQuery,
                      marketplace: link.marketplace,
                    })
                  }
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-blue-200 hover:border-blue-500 hover:shadow-xs transition-all group"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-700">
                      {link.marketplaceName}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Search &ldquo;{activeSearchQuery}&rdquo;
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-blue-700 shrink-0" />
                </a>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl">
                {['All', ...categories].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-white text-violet-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500">
                  Last updated: {formatRelativeTime(lastUpdatedIso)}
                </span>
                <button
                  type="button"
                  onClick={handleRefreshData}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 rounded-lg disabled:opacity-50 whitespace-nowrap cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Data</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters:</span>
              </div>

              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                aria-label="Filter by brand"
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-700"
              >
                <option value="All">All Brands</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>

              <select
                value={selectedMarketplace}
                onChange={(e) => {
                  const next = e.target.value as MarketplaceId | 'all';
                  setSelectedMarketplace(next);
                  if (next !== 'all') {
                    trackAnalyticsEvent({
                      type: 'marketplace_click',
                      keyword: activeSearchQuery,
                      productName: activeSearchQuery,
                      marketplace: next,
                    });
                  }
                }}
                aria-label="Filter by marketplace"
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-700"
              >
                <option value="all">All Marketplaces</option>
                <option value="amazon">Amazon India</option>
                <option value="flipkart">Flipkart</option>
                <option value="meesho">Meesho</option>
                <option value="myntra">Myntra</option>
              </select>

              <select
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                aria-label="Maximum entered price budget"
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-700"
              >
                <option value="">Any Budget</option>
                <option value="3000">Entered ≤ ₹3,000</option>
                <option value="10000">Entered ≤ ₹10,000</option>
                <option value="25000">Entered ≤ ₹25,000</option>
                <option value="70000">Entered ≤ ₹70,000</option>
              </select>

              <button
                type="button"
                onClick={() => setPricedOnly((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                  pricedOnly
                    ? 'bg-violet-50 border-violet-300 text-violet-800'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {pricedOnly && <Check className="w-3.5 h-3.5" />}
                <span>Has Entered Price</span>
              </button>

              <button
                type="button"
                onClick={() => setMultiStoreOnly((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                  multiStoreOnly
                    ? 'bg-blue-50 border-blue-300 text-blue-800'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {multiStoreOnly && <Check className="w-3.5 h-3.5" />}
                <span>2+ Stores Entered</span>
              </button>

              <div className="ml-auto flex items-center gap-2">
                <label htmlFor="sort-select" className="text-xs font-medium text-slate-500">
                  Sort:
                </label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as
                        | 'lowest_price'
                        | 'highest_spread'
                        | 'recent'
                        | 'price_desc',
                    )
                  }
                  className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-700"
                >
                  <option value="recent">Recently Searched / Updated</option>
                  <option value="lowest_price">Lowest Entered Price</option>
                  <option value="highest_spread">Highest Savings Spread</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
            <div>
              Showing{' '}
              <strong className="font-mono tabular-nums text-slate-900">
                {filteredProducts.length}
              </strong>{' '}
              searched {filteredProducts.length === 1 ? 'product' : 'products'}
            </div>

            <div className="flex items-center gap-4">
              {comparedProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => scrollToSection('compare-matrix')}
                  className="text-xs font-semibold text-violet-700 hover:underline cursor-pointer"
                >
                  Jump to Side-by-Side Comparison ({comparedProducts.length}/4) →
                </button>
              )}
              {products.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setProducts([]);
                    setCompareIds([]);
                  }}
                  className="text-xs font-medium text-slate-500 hover:text-rose-700 cursor-pointer"
                >
                  Clear All Products
                </button>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3 text-rose-800">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm">Notice</div>
                  <div className="text-xs mt-0.5">{errorMessage}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRefreshData}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {products.length === 0
                  ? 'Search any product to begin'
                  : 'No searched products match your current filters'}
              </h3>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                {products.length === 0
                  ? 'Enter a product name in the search bar above to generate clickable search links for Amazon India, Flipkart, Meesho, and Myntra.'
                  : 'Clear your active filters or search for a new product above.'}
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                {products.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => handlePickSuggestion('Apple iPhone 15')}
                    className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 rounded-lg cursor-pointer"
                  >
                    Search &ldquo;Apple iPhone 15&rdquo;
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 rounded-lg cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isCompared={compareIds.includes(product.id)}
                  isWishlisted={wishlistIds.includes(product.id)}
                  hasAlert={priceAlerts.some((a) => a.productId === product.id)}
                  onToggleCompare={handleToggleCompare}
                  onToggleWishlist={handleToggleWishlist}
                  onOpenDetail={(p) => setDetailProductId(p.id)}
                  onUpdateOfferPrice={handleUpdateOfferPrice}
                  onRemoveProduct={handleRemoveProduct}
                  onMarketplaceClick={(prod, mp) =>
                    trackAnalyticsEvent({
                      type: 'marketplace_click',
                      productId: prod.id,
                      productName: prod.name,
                      category: prod.category,
                      marketplace: mp,
                    })
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pb-14">
          <ComparisonMatrix
            products={comparedProducts}
            onRemoveProduct={(id) => setCompareIds((prev) => prev.filter((item) => item !== id))}
            onClearAll={() => setCompareIds([])}
            onOpenDetail={(p) => setDetailProductId(p.id)}
            onUpdateOfferPrice={handleUpdateOfferPrice}
          />
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <strong className="text-slate-900 font-display">ShopSync</strong> · Smart Shopping
            Comparison (Amazon India, Flipkart, Meesho, Myntra) · Product search activity is
            collected for analytics.
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => scrollToSection('dashboard')}
              className="hover:text-blue-700 cursor-pointer"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('catalog')}
              className="hover:text-blue-700 cursor-pointer"
            >
              Catalog
            </button>
            <button
              type="button"
              onClick={() => setIsSavedOpen(true)}
              className="hover:text-blue-700 cursor-pointer"
            >
              Wishlist & Alerts
            </button>
            <button
              type="button"
              onClick={() => setIsIntegrationsOpen(true)}
              className="hover:text-blue-700 cursor-pointer"
            >
              Data Sources
            </button>
            <button
              type="button"
              onClick={() => setIsAssistantOpen(true)}
              className="hover:text-blue-700 cursor-pointer"
            >
              Price Helper
            </button>
          </div>
        </div>
      </footer>

      <ProductDetailModal
        product={detailProduct}
        priceSnapshots={detailProduct ? (priceSnapshotsByProduct[detailProduct.id] ?? []) : []}
        isCompared={detailProduct ? compareIds.includes(detailProduct.id) : false}
        isWishlisted={detailProduct ? wishlistIds.includes(detailProduct.id) : false}
        existingAlert={
          detailProduct ? priceAlerts.find((a) => a.productId === detailProduct.id) : undefined
        }
        onClose={() => setDetailProductId(null)}
        onToggleCompare={handleToggleCompare}
        onToggleWishlist={handleToggleWishlist}
        onSavePriceAlert={handleSavePriceAlert}
        onRemovePriceAlert={handleRemovePriceAlert}
        onUpdateOfferPrice={handleUpdateOfferPrice}
      />

      <SavedAndHistoryDrawer
        isOpen={isSavedOpen}
        wishlistProducts={wishlistProducts}
        checkedAlerts={checkedAlerts}
        comparisonHistory={comparisonHistory}
        onClose={() => setIsSavedOpen(false)}
        onRemoveWishlist={(id) => setWishlistIds((prev) => prev.filter((item) => item !== id))}
        onRemoveAlert={handleRemovePriceAlert}
        onRestoreComparison={(ids) => {
          setCompareIds(ids.slice(0, 4));
          scrollToSection('compare-matrix');
        }}
        onClearHistory={() => setComparisonHistory([])}
        onOpenDetail={(p) => setDetailProductId(p.id)}
      />

      <AiAssistantDrawer
        isOpen={isAssistantOpen}
        messages={assistantMessages}
        isLoading={isAssistantLoading}
        onClose={() => setIsAssistantOpen(false)}
        onSendQuery={handleSendAssistantQuery}
        onOpenProduct={(p) => setDetailProductId(p.id)}
        onAddToCompare={(id) => {
          if (!compareIds.includes(id)) {
            handleToggleCompare(id);
          }
        }}
      />

      <IntegrationStatusModal
        isOpen={isIntegrationsOpen}
        integrations={integrations}
        onClose={() => setIsIntegrationsOpen(false)}
      />
    </div>
  );
}
