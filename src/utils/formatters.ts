import type { MarketplaceId, StockStatus } from '../types';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(value: number): string {
  return inrFormatter.format(Math.round(value));
}

export function getStockLabel(status: StockStatus): string {
  switch (status) {
    case 'IN_STOCK':
      return 'In Stock';
    case 'LOW_STOCK':
      return 'Low Stock';
    case 'OUT_OF_STOCK':
      return 'Out of Stock';
    case 'NOT_AVAILABLE':
    default:
      return 'Not Available';
  }
}

export function getMarketplaceAccent(id: MarketplaceId): {
  label: string;
  textClass: string;
  dotClass: string;
} {
  switch (id) {
    case 'amazon':
      return {
        label: 'Amazon India',
        textClass: 'text-slate-900',
        dotClass: 'bg-amber-600',
      };
    case 'flipkart':
      return {
        label: 'Flipkart',
        textClass: 'text-blue-700',
        dotClass: 'bg-blue-700',
      };
    case 'meesho':
      return {
        label: 'Meesho',
        textClass: 'text-purple-700',
        dotClass: 'bg-purple-700',
      };
    case 'myntra':
      return {
        label: 'Myntra',
        textClass: 'text-indigo-700',
        dotClass: 'bg-indigo-600',
      };
  }
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
