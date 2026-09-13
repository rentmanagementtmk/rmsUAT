import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LangProvider } from './lib/LangContext';
import { ToastProvider } from './lib/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { CollectPage } from './pages/CollectPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportPage } from './pages/ReportPage';
import { LedgerPage } from './pages/LedgerPage';
import { MessengerPage } from './pages/MessengerPage';
import { MiscChargesPage } from './pages/MiscChargesPage';
import { QrPrintPage } from './pages/QrPrintPage';
import { DoorLedgerPage } from './pages/DoorLedgerPage';

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

function App() {
  useGlobalTipHandler();
  return (
    <LangProvider>
      <ToastProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </ToastProvider>
    </LangProvider>
  );
}

export default App;
