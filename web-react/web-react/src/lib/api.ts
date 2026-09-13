// API adapter around the Apps Script Web App backend — mirrors assets/js/app.js's
// apiGet/apiPost exactly, so behavior (incl. the 'token' param reservation) stays identical.
// Every component/page must go through this module, never construct requests directly —
// this is the single place that will change when the backend later moves to Supabase.
import { CONFIG } from './config';
import { clearAuth, getAuthToken } from './auth';

export class UnauthorizedError extends Error {
  constructor() {
    super('UNAUTHORIZED');
  }
}

type Params = Record<string, string | number | boolean | undefined>;

function buildUrl(params: Params, forceRefresh: boolean): string {
  const url = new URL(CONFIG.API_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) url.searchParams.set(k, String(v));
  });
  // 'token' is reserved for the session auth token — any caller-supplied 'token' param would be
  // overwritten here; callers needing their own token-like param must use a different key (see
  // getDoorLedger's 't' param, which exists specifically because of this reservation).
  url.searchParams.set('token', getAuthToken());
  if (forceRefresh) url.searchParams.set('_t', String(Date.now()));
  return url.toString();
}

export async function apiGet<T = any>(params: Params, opts: { forceRefresh?: boolean } = {}): Promise<T> {
  const resp = await fetch(buildUrl(params, !!opts.forceRefresh), opts.forceRefresh ? { cache: 'reload' } : {});
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if (data.error === 'UNAUTHORIZED') {
    clearAuth();
    throw new UnauthorizedError();
  }
  return data as T;
}

export async function apiPost<T = any>(body: Record<string, unknown>): Promise<T> {
  const resp = await fetch(CONFIG.API_URL, {
    method: 'POST',
    // Omitting Content-Type keeps this a CORS "simple request" — no preflight needed
    body: JSON.stringify({ ...body, token: getAuthToken() }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if (data.error === 'UNAUTHORIZED') {
    clearAuth();
    throw new UnauthorizedError();
  }
  return data as T;
}
