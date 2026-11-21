import type {
  AdminAnalyticsResponse,
  AdminDailyPoint,
  AdminMarketplaceStat,
  AdminRankedCount,
  AdminUserSummary,
  AdminWeeklyPoint,
  AnalyticsEventRecord,
  AnalyticsEventType,
  AuthUser,
  MarketplaceId,
} from '../types';
import { getAdminUserRosterLocal } from './localAuthStore';

interface LocalAnalyticsDatabase {
  events: AnalyticsEventRecord[];
}

const ANALYTICS_DB_KEY = 'shopsync_analytics_db_v1';

const VALID_EVENT_TYPES: ReadonlySet<AnalyticsEventType> = new Set([
  'search',
  'compare',
  'save',
  'marketplace_click',
  'register',
  'login',
]);

const VALID_MARKETPLACES: ReadonlySet<MarketplaceId> = new Set([
  'amazon',
  'flipkart',
  'meesho',
  'myntra',
]);

const MARKETPLACE_LABELS: Record<MarketplaceId, string> = {
  amazon: 'Amazon India',
  flipkart: 'Flipkart',
  meesho: 'Meesho',
  myntra: 'Myntra',
};

function loadAnalyticsDb(): LocalAnalyticsDatabase {
  try {
    const raw = window.localStorage.getItem(ANALYTICS_DB_KEY);
    if (!raw) return { events: [] };
    const parsed = JSON.parse(raw) as Partial<LocalAnalyticsDatabase>;
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return { events: [] };
  }
}

function saveAnalyticsDb(database: LocalAnalyticsDatabase): void {
  try {
    window.localStorage.setItem(ANALYTICS_DB_KEY, JSON.stringify(database));
  } catch {
    // ignore storage quota errors
  }
}

function generateId(): string {
  if (typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function recordAnalyticsEventLocal(input: {
  type: AnalyticsEventType;
  user: Pick<AuthUser, 'id' | 'fullName' | 'email'>;
  keyword?: string;
  productId?: string;
  productName?: string;
  category?: string;
  marketplace?: MarketplaceId;
}): AnalyticsEventRecord | null {
  if (!VALID_EVENT_TYPES.has(input.type)) {
    return null;
  }

  const db = loadAnalyticsDb();
  const entry: AnalyticsEventRecord = {
    id: generateId(),
    type: input.type,
    userId: input.user.id,
    userName: input.user.fullName,
    userEmail: input.user.email,
    keyword: input.keyword?.trim().slice(0, 140) || undefined,
    productId: input.productId?.trim().slice(0, 140) || undefined,
    productName: input.productName?.trim().slice(0, 160) || undefined,
    category: input.category?.trim().slice(0, 80) || undefined,
    marketplace:
      input.marketplace && VALID_MARKETPLACES.has(input.marketplace)
        ? input.marketplace
        : undefined,
    createdAtIso: new Date().toISOString(),
  };

  db.events.push(entry);
  if (db.events.length > 10_000) {
    db.events = db.events.slice(-10_000);
  }
  saveAnalyticsDb(db);
  return entry;
}

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toDayLabel(date: Date): string {
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function getMondayStart(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function rankBuckets(
  events: AnalyticsEventRecord[],
  extractor: (ev: AnalyticsEventRecord) => string | undefined,
  limit = 8,
): AdminRankedCount[] {
  const map = new Map<string, { label: string; count: number; lastSeenIso: string }>();

  for (const ev of events) {
    const raw = extractor(ev)?.trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (ev.createdAtIso > existing.lastSeenIso) {
        existing.lastSeenIso = ev.createdAtIso;
      }
    } else {
      map.set(key, {
        label: raw,
        count: 1,
        lastSeenIso: ev.createdAtIso,
      });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || b.lastSeenIso.localeCompare(a.lastSeenIso))
    .slice(0, limit);
}

export function queryAdminAnalyticsLocal(filters: {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  product?: string;
}): AdminAnalyticsResponse {
  const analyticsDb = loadAnalyticsDb();
  const dateFrom = (filters.dateFrom ?? '').trim();
  const dateTo = (filters.dateTo ?? '').trim();
  const userId = (filters.userId ?? '').trim();
  const productQuery = (filters.product ?? '').trim().toLowerCase();

  const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00.000`).getTime() : null;
  const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

  const roster = getAdminUserRosterLocal();
  const nonAdminUsers = roster.filter((u) => u.role === 'user');

  const nowMs = Date.now();
  const ms24h = 24 * 60 * 60 * 1000;
  const ms7d = 7 * ms24h;

  const newRegistrations24h = nonAdminUsers.filter(
    (u) => nowMs - new Date(u.createdAtIso).getTime() <= ms24h,
  ).length;
  const newRegistrations7d = nonAdminUsers.filter(
    (u) => nowMs - new Date(u.createdAtIso).getTime() <= ms7d,
  ).length;

  const filteredEvents = analyticsDb.events.filter((ev) => {
    const ts = new Date(ev.createdAtIso).getTime();
    if (fromMs !== null && !Number.isNaN(fromMs) && ts < fromMs) return false;
    if (toMs !== null && !Number.isNaN(toMs) && ts > toMs) return false;
    if (userId && userId !== 'all' && ev.userId !== userId) return false;
    if (productQuery) {
      const haystack = `${ev.keyword ?? ''} ${ev.productName ?? ''} ${ev.category ?? ''} ${ev.marketplace ?? ''}`.toLowerCase();
      if (!haystack.includes(productQuery)) return false;
    }
    return true;
  });

  const searchEvents = filteredEvents.filter((e) => e.type === 'search');
  const compareEvents = filteredEvents.filter((e) => e.type === 'compare');
  const saveEvents = filteredEvents.filter((e) => e.type === 'save');

  const marketplaceCounts: Record<MarketplaceId, number> = {
    amazon: 0,
    flipkart: 0,
    meesho: 0,
    myntra: 0,
  };
  for (const ev of filteredEvents) {
    if (ev.marketplace && VALID_MARKETPLACES.has(ev.marketplace)) {
      marketplaceCounts[ev.marketplace] += 1;
    }
  }
  const totalMarketplaceActions =
    marketplaceCounts.amazon +
    marketplaceCounts.flipkart +
    marketplaceCounts.meesho +
    marketplaceCounts.myntra;

  const marketplaceBreakdown: AdminMarketplaceStat[] = (
    ['amazon', 'flipkart', 'meesho', 'myntra'] as MarketplaceId[]
  ).map((id) => ({
    marketplace: id,
    marketplaceName: MARKETPLACE_LABELS[id],
    count: marketplaceCounts[id],
    sharePercent:
      totalMarketplaceActions > 0
        ? Math.round((marketplaceCounts[id] / totalMarketplaceActions) * 100)
        : 0,
  }));

  const perUserCounts = new Map<
    string,
    { searches: number; compares: number; saves: number }
  >();
  for (const ev of filteredEvents) {
    const entry = perUserCounts.get(ev.userId) ?? { searches: 0, compares: 0, saves: 0 };
    if (ev.type === 'search') entry.searches += 1;
    else if (ev.type === 'compare') entry.compares += 1;
    else if (ev.type === 'save') entry.saves += 1;
    perUserCounts.set(ev.userId, entry);
  }

  const users: AdminUserSummary[] = roster.map((u) => {
    const counts = perUserCounts.get(u.id) ?? { searches: 0, compares: 0, saves: 0 };
    return {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      createdAtIso: u.createdAtIso,
      lastActiveAtIso: u.lastActiveAtIso ?? u.createdAtIso,
      isActiveNow: u.isActiveNow,
      searchCount: counts.searches,
      compareCount: counts.compares,
      saveCount: counts.saves,
    };
  });

  const endDate =
    dateTo && !Number.isNaN(new Date(`${dateTo}T00:00:00`).getTime())
      ? new Date(`${dateTo}T00:00:00`)
      : new Date();

  const dailyBuckets = new Map<string, AdminDailyPoint>();
  const dailyOrder: string[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - i);
    const key = toDayKey(d);
    dailyOrder.push(key);
    dailyBuckets.set(key, {
      dateKey: key,
      label: toDayLabel(d),
      searches: 0,
      comparisons: 0,
      saves: 0,
      registrations: 0,
    });
  }

  for (const ev of filteredEvents) {
    const key = toDayKey(new Date(ev.createdAtIso));
    const bucket = dailyBuckets.get(key);
    if (!bucket) continue;
    if (ev.type === 'search') bucket.searches += 1;
    else if (ev.type === 'compare') bucket.comparisons += 1;
    else if (ev.type === 'save') bucket.saves += 1;
    else if (ev.type === 'register') bucket.registrations += 1;
  }

  for (const u of nonAdminUsers) {
    const ts = new Date(u.createdAtIso).getTime();
    if (fromMs !== null && !Number.isNaN(fromMs) && ts < fromMs) continue;
    if (toMs !== null && !Number.isNaN(toMs) && ts > toMs) continue;
    if (userId && userId !== 'all' && u.id !== userId) continue;
    const key = toDayKey(new Date(u.createdAtIso));
    const bucket = dailyBuckets.get(key);
    if (bucket && bucket.registrations === 0) {
      const hasRegEvent = filteredEvents.some(
        (ev) => ev.type === 'register' && ev.userId === u.id,
      );
      if (!hasRegEvent) bucket.registrations += 1;
    }
  }

  const dailyActivity = dailyOrder.map((k) => dailyBuckets.get(k)!);

  const currentMonday = getMondayStart(endDate);
  const weeklyBuckets = new Map<string, AdminWeeklyPoint>();
  const weeklyOrder: string[] = [];
  for (let i = 7; i >= 0; i -= 1) {
    const mon = new Date(
      currentMonday.getFullYear(),
      currentMonday.getMonth(),
      currentMonday.getDate() - i * 7,
    );
    const key = toDayKey(mon);
    weeklyOrder.push(key);
    weeklyBuckets.set(key, {
      weekKey: key,
      label: `Wk ${toDayLabel(mon)}`,
      searches: 0,
      comparisons: 0,
      saves: 0,
      registrations: 0,
    });
  }

  for (const ev of filteredEvents) {
    const mon = getMondayStart(new Date(ev.createdAtIso));
    const key = toDayKey(mon);
    const bucket = weeklyBuckets.get(key);
    if (!bucket) continue;
    if (ev.type === 'search') bucket.searches += 1;
    else if (ev.type === 'compare') bucket.comparisons += 1;
    else if (ev.type === 'save') bucket.saves += 1;
    else if (ev.type === 'register') bucket.registrations += 1;
  }

  const weeklyActivity = weeklyOrder.map((k) => weeklyBuckets.get(k)!);

  const activityHistory = [...filteredEvents]
    .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso))
    .slice(0, 150);

  return {
    summary: {
      totalRegisteredUsers: nonAdminUsers.length,
      currentlyActiveUsers: nonAdminUsers.filter((u) => u.isActiveNow).length,
      newRegistrations24h,
      newRegistrations7d,
      totalSearches: searchEvents.length,
      totalComparisons: compareEvents.length,
      totalSaves: saveEvents.length,
      filteredEventCount: filteredEvents.length,
    },
    users,
    activityHistory,
    dailyActivity,
    weeklyActivity,
    topSearchKeywords: rankBuckets(searchEvents, (e) => e.keyword ?? e.productName, 10),
    mostSearchedProducts: rankBuckets(searchEvents, (e) => e.productName ?? e.keyword, 8),
    mostPopularCategories: rankBuckets(
      [...searchEvents, ...compareEvents, ...saveEvents],
      (e) => e.category,
      8,
    ),
    marketplaceBreakdown,
    mostComparedProducts: rankBuckets(compareEvents, (e) => e.productName ?? e.keyword, 8),
    mostSavedProducts: rankBuckets(saveEvents, (e) => e.productName ?? e.keyword, 8),
    filtersApplied: {
      dateFrom,
      dateTo,
      userId,
      product: filters.product?.trim() ?? '',
    },
    generatedAtIso: new Date().toISOString(),
  };
}
