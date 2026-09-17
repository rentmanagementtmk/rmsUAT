// Stale-while-revalidate cache for per-house collection previews (Current Due / After Payment).
// Shows the last-known numbers instantly on tap, then silently reconciles with the fresh
// server response once it arrives — same idea as useHouseCache but for preview amounts.
const LS_PREVIEW_KEY = 'rms_preview_cache';
const LS_TTL_MS = 24 * 60 * 60 * 1000; // stale numbers are still a reasonable instant guess for 24h

export interface CachedPreview {
  expectedRent: number;
  arrears: number;
  currentBalance: number;
  paidForMonth: number;
}

type Store = Record<string, { ts: number; data: CachedPreview }>;

function readStore(): Store {
  try {
    return JSON.parse(localStorage.getItem(LS_PREVIEW_KEY) || '{}');
  } catch {
    return {};
  }
}

export function previewCacheKey(houseId: string, year: number, month: number): string {
  return `${houseId}_${year}_${month}`;
}

export function getCachedPreview(key: string): CachedPreview | null {
  const store = readStore();
  const entry = store[key];
  if (!entry || Date.now() - entry.ts > LS_TTL_MS) return null;
  return entry.data;
}

export function setCachedPreview(key: string, data: CachedPreview) {
  const store = readStore();
  store[key] = { ts: Date.now(), data };
  try { localStorage.setItem(LS_PREVIEW_KEY, JSON.stringify(store)); } catch { /* ignore quota errors */ }
}
