import { useEffect, useState, useCallback } from 'react';
import { apiGet } from './api';

export interface HouseData {
  HouseID: string;
  IsActive: boolean | string;
  TenantName?: string;
  Phone1?: string;
  Phone2?: string;
  [key: string]: unknown;
}

type HouseCache = Record<string, HouseData>;

const LS_HOUSE_KEY = 'rms_houses';
const LS_TTL_MS = 60 * 60 * 1000; // 1 hour

function isActive(h: HouseData | undefined): boolean {
  if (!h) return true; // unknown houses assumed active until cache loads
  return h.IsActive === true || String(h.IsActive).toUpperCase() === 'TRUE';
}

function readCache(): HouseCache {
  try {
    const raw = localStorage.getItem(LS_HOUSE_KEY);
    if (raw) {
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < LS_TTL_MS) return data;
    }
  } catch {
    /* ignore malformed cache */
  }
  return {};
}

/** Fetches the house/tenant list and writes it to localStorage — callable outside the hook
 * (e.g. right after login, or on app mount) so the cache is warm before the Collect page mounts. */
export function prefetchHouses(): Promise<HouseCache | null> {
  return apiGet<{ houses?: HouseData[] }>({ action: 'getHouses' })
    .then((res) => {
      if (!res.houses) return null;
      const fresh: HouseCache = {};
      res.houses.forEach((h) => { fresh[h.HouseID] = h; });
      try { localStorage.setItem(LS_HOUSE_KEY, JSON.stringify({ ts: Date.now(), data: fresh })); } catch { /* ignore quota errors */ }
      return fresh;
    })
    .catch(() => null); // silent — cached/local data still usable
}

/**
 * Loads the house cache instantly from localStorage (if fresh), then silently refreshes
 * from the API in the background — mirrors assets/js/app.js's loadHouseCache() pattern.
 */
export function useHouseCache() {
  const [cache, setCache] = useState<HouseCache>(readCache);

  const refresh = useCallback(() => {
    prefetchHouses().then((fresh) => { if (fresh) setCache(fresh); });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { houseCache: cache, isHouseActive: (id: string) => isActive(cache[id]), refresh };
}
