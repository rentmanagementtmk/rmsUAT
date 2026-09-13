import type { ReactNode } from 'react';
import { useLang } from '../lib/LangContext';

/** App header with logo/title and the EN/KN language toggle — mirrors every page's <header class="app-header"> */
export function AppHeader({ title, actions }: { title?: string; actions?: ReactNode }) {
  const { lang, t, toggleLang } = useLang();
  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="header-logo">🏠</span>
        <span className="header-title">{title ?? t('header.collect')}</span>
      </div>
      <div className="header-actions">
        {actions}
        <button
          id="lang-toggle"
          className={`lang-btn ${lang === 'kn' ? 'lang-kn-active' : 'lang-en-active'}`}
          aria-label="Switch language"
          onClick={toggleLang}
        >
          <span className="lang-seg lang-en">E</span>
          <span className="lang-seg lang-kn">ಕ</span>
        </button>
      </div>
    </header>
  );
}
