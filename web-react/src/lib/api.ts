// API adapter — routes to Supabase Edge Functions (Step 2 backend) when VITE_SUPABASE_FUNCTIONS_URL
// is set, otherwise falls back to the legacy Apps Script Web App (VITE_API_URL). Every
// component/page must go through this module, never construct requests directly.
import { CONFIG } from './config';
import { clearAuth, getAuthToken } from './auth';
import { debugLog } from './debugLog';

export class UnauthorizedError extends Error {
  constructor() {
    super('UNAUTHORIZED');
  }
}

type Params = Record<string, string | number | boolean | undefined>;

// action -> Supabase Edge Function name (kebab-case). getDashboard reuses get-dashboard-data
// since that function's response is a superset (records + balances) of what getDashboard needs.
const ACTION_TO_FUNCTION: Record<string, string> = {
  getHouse: 'get-house',
  getHouseWithPreview: 'get-house-with-preview',
  getHouses: 'get-houses',
  getDashboard: 'get-dashboard-data',
  getDashboardData: 'get-dashboard-data',
  getLedger: 'get-ledger',
  getDoorLedger: 'get-door-ledger',
  getMessageLogs: 'get-message-logs',
  getMiscCharges: 'get-misc-charges',
  validateMasters: 'validate-masters',
  retryDisconnected: 'retry-disconnected',
  saveRent: 'save-rent',
  sendCustomMessage: 'send-custom-message',
  addMiscCharge: 'add-misc-charge',
  requestLoginOtp: 'request-login-otp',
  verifyLoginOtp: 'verify-login-otp',
  logout: 'logout',
};

function usingSupabase(): boolean {
  return !!CONFIG.SUPABASE_FUNCTIONS_URL;
}

function buildUrl(params: Params, forceRefresh: boolean): string {
  const action = String(params.action);
  const base = usingSupabase()
    ? `${CONFIG.SUPABASE_FUNCTIONS_URL}/${ACTION_TO_FUNCTION[action] || action}`
    : CONFIG.API_URL;
  const url = new URL(base);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined) return;
    if (usingSupabase() && k === 'action') return; // action is now encoded in the URL path itself
    url.searchParams.set(k, String(v));
  });
  // 'token' is reserved for the session auth token — any caller-supplied 'token' param would be
  // overwritten here; callers needing their own token-like param must use a different key (see
  // getDoorLedger's 't' param, which exists specifically because of this reservation).
  url.searchParams.set('token', getAuthToken());
  if (forceRefresh) url.searchParams.set('_t', String(Date.now()));
  return url.toString();
}

export async function apiGet<T = any>(params: Params, opts: { forceRefresh?: boolean } = {}): Promise<T> {
  const tokenTail = getAuthToken().slice(-6);
  debugLog('api-request', { action: params.action, tokenTail });
  const resp = await fetch(buildUrl(params, !!opts.forceRefresh), opts.forceRefresh ? { cache: 'reload' } : {});
  if (!resp.ok) {
    debugLog('api-http-error', { action: params.action, tokenTail, status: resp.status });
    throw new Error(`HTTP ${resp.status}`);
  }
  const data = await resp.json();
  if (data.error === 'UNAUTHORIZED') {
    debugLog('server-unauthorized', { action: params.action, tokenTail });
    clearAuth();
    throw new UnauthorizedError();
  }
  debugLog('api-ok', { action: params.action, tokenTail });
  return data as T;
}

export async function apiPost<T = any>(body: Record<string, unknown>): Promise<T> {
  const action = String(body.action);
  const tokenTail = getAuthToken().slice(-6);
  const url = usingSupabase()
    ? `${CONFIG.SUPABASE_FUNCTIONS_URL}/${ACTION_TO_FUNCTION[action] || action}`
    : CONFIG.API_URL;
  const postBody = usingSupabase() ? { ...body, action: undefined, token: getAuthToken() } : { ...body, token: getAuthToken() };
  debugLog('api-request', { action, tokenTail });
  const resp = await fetch(url, {
    method: 'POST',
    // Omitting Content-Type keeps this a CORS "simple request" — no preflight needed
    body: JSON.stringify(postBody),
  });
  if (!resp.ok) {
    debugLog('api-http-error', { action, tokenTail, status: resp.status });
    throw new Error(`HTTP ${resp.status}`);
  }
  const data = await resp.json();
  if (data.error === 'UNAUTHORIZED') {
    debugLog('server-unauthorized', { action, tokenTail });
    clearAuth();
    throw new UnauthorizedError();
  }
  debugLog('api-ok', { action, tokenTail });
  return data as T;
}
