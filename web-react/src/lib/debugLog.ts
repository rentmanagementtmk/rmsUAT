// Lightweight diagnostic log for tracking the iOS Safari "kicked to login" issue — persisted in
// localStorage under a separate key so it survives clearAuth() and reloads, letting us see the
// exact sequence of events (mount/visibility/bfcache-restore/token-lost) after the fact.
const KEY = 'rms_debug_log';
const MAX_ENTRIES = 200;

export interface DebugEntry {
  t: string; // ISO timestamp
  event: string;
  [key: string]: unknown;
}

export function debugLog(event: string, extra?: Record<string, unknown>) {
  try {
    const log = getDebugLog();
    log.push({ t: new Date().toISOString(), event, ...extra });
    while (log.length > MAX_ENTRIES) log.shift();
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch { /* ignore quota errors */ }
}

export function getDebugLog(): DebugEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearDebugLog() {
  localStorage.removeItem(KEY);
}
