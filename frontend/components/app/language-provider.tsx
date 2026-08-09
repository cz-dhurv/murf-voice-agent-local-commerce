'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Language } from '@/lib/i18n';
import { t } from '@/lib/i18n';

const STORAGE_KEY = 'dukaan-lang';

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  // convenience: the current language's string dict
  tr: ReturnType<typeof t>;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({
  children,
  defaultLanguage = 'en',
}: {
  children: React.ReactNode;
  defaultLanguage?: Language;
}) {
  // Seed from the server default; localStorage is read after mount to avoid hydration mismatch.
  const [language, setLanguageState] = useState<Language>(defaultLanguage);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'hi') setLanguageState(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setLanguageState, tr: t(language) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
