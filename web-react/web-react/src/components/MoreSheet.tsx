import { useNavigate } from 'react-router-dom';
import { useLang } from '../lib/LangContext';
import { clearAuth, getAuthInfo } from '../lib/auth';
import { apiPost } from '../lib/api';
import { useState } from 'react';
import { PageLoader } from './PageLoader';

/** The "More" bottom-sheet — mirrors every page's #more-sheet overlay (Ledger/Messenger/Misc Charges/QR Print/Logout) */
export function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const info = getAuthInfo();

  async function handleLogout() {
    setLoggingOut(true);
    try { await apiPost({ action: 'logout' }); } catch { /* best-effort */ }
    clearAuth();
    navigate('/login');
  }

  return (
    <div className={`more-overlay ${open ? '' : 'hidden'}`} role="dialog" aria-modal="true">
      <div className="more-backdrop" onClick={onClose}></div>
      <div className="more-panel">
        <div className="more-panel-handle"></div>
        <p className="more-panel-title">{t('nav.more')}</p>
        {info && <p className="more-auth-info">{info.name} ({info.role})</p>}
        <a href="/ledger" className="more-item" onClick={(e) => { e.preventDefault(); onClose(); navigate('/ledger'); }}>
          <span className="more-item-icon">📒</span>
          <span className="more-item-label">{t('nav.ledger')}</span>
        </a>
        <a href="/messenger" className="more-item" onClick={(e) => { e.preventDefault(); onClose(); navigate('/messenger'); }}>
          <span className="more-item-icon">💬</span>
          <span className="more-item-label">{t('nav.messenger')}</span>
        </a>
        <a href="/misc-charges" className="more-item" onClick={(e) => { e.preventDefault(); onClose(); navigate('/misc-charges'); }}>
          <span className="more-item-icon">🧾</span>
          <span className="more-item-label">{t('nav.misc_charges')}</span>
        </a>
        <a href="/qr-print" className="more-item" onClick={(e) => { e.preventDefault(); onClose(); navigate('/qr-print'); }}>
          <span className="more-item-icon">🖶️</span>
          <span className="more-item-label">{t('nav.qr_print')}</span>
        </a>
        <button type="button" className="more-item" onClick={handleLogout} disabled={loggingOut}>
          <span className="more-item-icon">🚪</span>
          <span className="more-item-label">{t('auth.logout')}</span>
        </button>
      </div>
      <PageLoader visible={loggingOut} />
    </div>
  );
}
