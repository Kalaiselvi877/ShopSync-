export type UserRole = 'user' | 'admin';

export type AuthView = 'welcome' | 'login' | 'register' | 'forgot' | 'admin_login';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAtIso: string;
  lastActiveAtIso?: string;
}

export type AnalyticsEventType =
  | 'search'
  | 'compare'
  | 'save'
  | 'marketplace_click'
  | 'register'
  | 'login';

export interface AnalyticsEventRecord {
  id: string;
  type: AnalyticsEventType;
  userId: string;
  userName: string;
  userEmail: string;
  keyword?: string;
  productId?: string;
  productName?: string;
  category?: string;
  marketplace?: MarketplaceId;
  createdAtIso: string;
}

export interface AdminUserSummary {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAtIso: string;
  lastActiveAtIso: string;
  isActiveNow: boolean;
  searchCount: number;
  compareCount: number;
  saveCount: number;
}

export interface AdminDailyPoint {
  dateKey: string;
  label: string;
  searches: number;
  comparisons: number;
  saves: number;
  registrations: number;
}

export interface AdminWeeklyPoint {
  weekKey: string;
  label: string;
  searches: number;
  comparisons: number;
  saves: number;
  registrations: number;
}

export interface AdminRankedCount {
  label: string;
  count: number;
  lastSeenIso: string;
}

export interface AdminMarketplaceStat {
  marketplace: MarketplaceId;
  marketplaceName: string;
  count: number;
  sharePercent: number;
}

export interface AdminAnalyticsResponse {
  summary: {
    totalRegisteredUsers: number;
    currentlyActiveUsers: number;
    newRegistrations24h: number;
    newRegistrations7d: number;
    totalSearches: number;
    totalComparisons: number;
    totalSaves: number;
    filteredEventCount: number;
  };
  users: AdminUserSummary[];
  activityHistory: AnalyticsEventRecord[];
  dailyActivity: AdminDailyPoint[];
  weeklyActivity: AdminWeeklyPoint[];
  topSearchKeywords: AdminRankedCount[];
  mostSearchedProducts: AdminRankedCount[];
  mostPopularCategories: AdminRankedCount[];
  marketplaceBreakdown: AdminMarketplaceStat[];
  mostComparedProducts: AdminRankedCount[];
  mostSavedProducts: AdminRankedCount[];
  filtersApplied: {
    dateFrom: string;
    dateTo: string;
    userId: string;
    product: string;
  };
  generatedAtIso: string;
}

export type MarketplaceId = 'amazon' | 'flipkart' | 'meesho' | 'myntra';

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NOT_AVAILABLE';

export type OfferSourceType = 'DIRECT_SEARCH' | 'USER_ENTERED';

export type DataSourceMode = 'DIRECT_SEARCH';

export interface GroundingSourceLink {
  title: string;
  uri: string;
}

export interface MarketplaceOffer {
  marketplace: MarketplaceId;
  marketplaceName: string;
  price: number | null;
  mrp: number | null;
  discountPercent: number | null;
  shippingFee: number | null;
  totalLandedPrice: number | null;
  deliveryDaysMin: number | null;
  deliveryDaysMax: number | null;
  estimatedDeliveryLabel: string;
  expressEligible: boolean;
  stockStatus: StockStatus;
  stockQuantityNote: string;
  sellerName: string | null;
  rating: number | null;
  reviewCount: number | null;
  productUrl: string | null;
  sourceType: OfferSourceType;
  sourceLabel: string;
  lastUpdatedIso: string;
}

export interface PriceTrendPoint {
  recordedAtIso: string;
  dateLabel: string;
  amazonPrice: number | null;
  flipkartPrice: number | null;
  meeshoPrice: number | null;
  myntraPrice: number | null;
}

export interface ProductItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  shortDescription: string;
  imageUrl: string;
  specs: Record<string, string>;
  offers: MarketplaceOffer[];
  bestOffer: MarketplaceOffer | null;
  fastestOffer: MarketplaceOffer | null;
  maxPriceSpread: number | null;
  highestPrice: number | null;
  averageRating: number | null;
  totalReviews: number | null;
  groundingSources: GroundingSourceLink[];
  lastUpdatedIso: string;
  dataMode: DataSourceMode;
}

export interface MarketplaceIntegrationInfo {
  id: MarketplaceId | 'direct_search';
  name: string;
  configured: boolean;
  mode: 'DIRECT_SEARCH' | 'ACTIVE';
  protocol: string;
  requiredEnvVars: string[];
  approvalNote: string;
}

export interface MarketplaceFetchError {
  marketplace: MarketplaceId | 'direct_search';
  marketplaceName: string;
  status: 'AUTH_ERROR' | 'REQUEST_FAILED';
  message: string;
}

export interface IntegrationTestResult {
  id: MarketplaceId | 'direct_search';
  name: string;
  status: 'CONNECTED' | 'DIRECT_SEARCH_ACTIVE' | 'ERROR';
  httpStatus: number | null;
  latencyMs: number;
  message: string;
  testedAtIso: string;
}

export interface DirectSearchLink {
  marketplace: MarketplaceId;
  marketplaceName: string;
  url: string;
}

export interface SearchResponse {
  products: ProductItem[];
  totalCount: number;
  queryUsed: string;
  directSearchLinks: DirectSearchLink[];
  categories: string[];
  brands: string[];
  suggestions: string[];
  dataMode: DataSourceMode;
  marketplaceErrors: MarketplaceFetchError[];
  groundingSources: GroundingSourceLink[];
  integrations: MarketplaceIntegrationInfo[];
  fetchedAtIso: string;
}

export interface PriceAlert {
  id: string;
  productId: string;
  productName: string;
  targetPrice: number;
  createdAtIso: string;
}

export interface CheckedPriceAlert extends PriceAlert {
  currentBestPrice: number | null;
  bestMarketplace: MarketplaceId | null;
  triggered: boolean;
  difference: number | null;
}

export interface ComparisonHistoryEntry {
  id: string;
  productIds: string[];
  productNames: string[];
  bestDealProductName: string;
  createdAtIso: string;
}

export interface RecentActivityItem {
  id: string;
  type: 'search' | 'wishlist' | 'alert' | 'compare' | 'price';
  label: string;
  createdAtIso: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  recommendedProductIds?: string[];
  recommendedProducts?: ProductItem[];
  directSearchLinks?: DirectSearchLink[];
  groundingSources?: GroundingSourceLink[];
  bestPickReason?: string;
  followUpPrompts?: string[];
  dataMode?: DataSourceMode;
  error?: string;
  createdAtIso: string;
}
