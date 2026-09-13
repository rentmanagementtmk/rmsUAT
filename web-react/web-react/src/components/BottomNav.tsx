import { NavLink } from 'react-router-dom';
import { useLang } from '../lib/LangContext';

/** Bottom tab bar — mirrors every page's <nav class="bottom-nav"> (Rent/Dashboard/Summary/More) */
export function BottomNav({ onMoreClick }: { onMoreClick: () => void }) {
  const { t } = useLang();
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' nav-active' : ''}`}>
        <span className="nav-icon">💳</span>
        <span className="nav-label">{t('nav.collect')}</span>
      </NavLink>
      <NavLink to="/dashboard" className={({ isActive }) => `nav-item${isActive ? ' nav-active' : ''}`}>
        <span className="nav-icon">📊</span>
        <span className="nav-label">{t('nav.dashboard')}</span>
      </NavLink>
      <NavLink to="/report" className={({ isActive }) => `nav-item${isActive ? ' nav-active' : ''}`}>
        <span className="nav-icon">📋</span>
        <span className="nav-label">{t('nav.summary')}</span>
      </NavLink>
      <button type="button" className="nav-item" onClick={onMoreClick}>
        <span className="nav-icon">☰</span>
        <span className="nav-label">{t('nav.more')}</span>
      </button>
    </nav>
  );
}
