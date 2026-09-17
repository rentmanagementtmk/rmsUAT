import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { getLang, setLangStorage, t as translate, type Lang } from './i18n';

interface LangContextValue {
  lang: Lang;
  t: (key: string) => string;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(getLang());

  const toggleLang = useCallback(() => {
    const next: Lang = lang === 'kn' ? 'en' : 'kn';
    setLangStorage(next);
    setLang(next);
  }, [lang]);

  const t = useCallback((key: string) => translate(key, lang), [lang]);

  return <LangContext.Provider value={{ lang, t, toggleLang }}>{children}</LangContext.Provider>;
}

/** Access the current language, t() translator, and toggle function */
export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
