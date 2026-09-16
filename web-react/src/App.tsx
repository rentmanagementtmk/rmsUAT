import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LangProvider } from './lib/LangContext';
import { ToastProvider } from './lib/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { CollectPage } from './pages/CollectPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportPage } from './pages/ReportPage';
import { LedgerPage } from './pages/LedgerPage';
import { MessengerPage } from './pages/MessengerPage';
import { MiscChargesPage } from './pages/MiscChargesPage';
import { QrPrintPage } from './pages/QrPrintPage';
import { DoorLedgerPage } from './pages/DoorLedgerPage';
import { prefetchHouses } from './lib/useHouseCache';
import { isLoggedIn, getAuthToken } from './lib/auth';
import { debugLog } from './lib/debugLog';
import { DebugBanner } from './components/DebugBanner';

/** Mobile tap-to-show tooltip: toggles .show-tip on .tip elements, dismissed by tapping elsewhere — mirrors app.js */
function useGlobalTipHandler() {
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const tip = target.closest('.tip');
      document.querySelectorAll('.tip.show-tip').forEach((el) => { if (el !== tip) el.classList.remove('show-tip'); });
      if (tip) tip.classList.toggle('show-tip');
    }
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);
}

/** iOS Safari can restore a backgrounded tab from the bfcache with torn-down fetches/stale
 * state — force a clean reload in that case instead of risking a blank white screen. */
function useBfcacheReload() {
  useEffect(() => {
    function handler(e: PageTransitionEvent) {
      debugLog('pageshow', { persisted: e.persisted });
      if (e.persisted) window.location.reload();
    }
    window.addEventListener('pageshow', handler);
    return () => window.removeEventListener('pageshow', handler);
  }, []);
}

/** Diagnostic-only: records app lifecycle events + polls for the auth token disappearing, so we
 * can see exactly when/why a session was lost on a real device (view via DebugBanner, ?debug=1). */
function useSessionDebugLog() {
  useEffect(() => {
    debugLog('app-mount', { visibility: document.visibilityState, hadToken: !!getAuthToken() });

    function onVisibility() {
      debugLog('visibilitychange', { state: document.visibilityState, hadToken: !!getAuthToken() });
    }
    document.addEventListener('visibilitychange', onVisibility);

    let lastHadToken = !!getAuthToken();
    const heartbeat = setInterval(() => {
      const hasToken = !!getAuthToken();
      if (lastHadToken && !hasToken) debugLog('token-lost', { visibility: document.visibilityState });
      lastHadToken = hasToken;
    }, 5000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(heartbeat);
    };
  }, []);
}

function App() {
  useGlobalTipHandler();
  useBfcacheReload();
  useSessionDebugLog();
  // Warm the house cache as early as possible (page refresh/app resume) so the Collect page's
  // tenant names are already available by the time the user navigates there, not just on login.
  useEffect(() => { if (isLoggedIn()) prefetchHouses(); }, []);
  const showDebugBanner = new URLSearchParams(window.location.search).get('debug') === '1';
  return (
    <LangProvider>
      <ToastProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/door-ledger" element={<DoorLedgerPage />} />
              <Route path="/" element={<ProtectedRoute><CollectPage /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
              <Route path="/ledger" element={<ProtectedRoute><LedgerPage /></ProtectedRoute>} />
              <Route path="/messenger" element={<ProtectedRoute><MessengerPage /></ProtectedRoute>} />
              <Route path="/misc-charges" element={<ProtectedRoute><MiscChargesPage /></ProtectedRoute>} />
              <Route path="/qr-print" element={<ProtectedRoute><QrPrintPage /></ProtectedRoute>} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </ToastProvider>
      {showDebugBanner && <DebugBanner />}
    </LangProvider>
  );
}

export default App;

