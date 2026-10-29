import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Language, TranslationKey } from './translations';
import {
  locales,
  getTranslationString,
  formatTranslation
} from './translations';

const STORAGE_KEY = 'infinity_verse_lang';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function detectInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ru' || saved === 'en') {
      return saved;
    }

    if (typeof navigator !== 'undefined' && navigator.language) {
      const navLang = navigator.language.toLowerCase();
      if (navLang.startsWith('ru') || navLang.startsWith('be') || navLang.startsWith('uk')) {
        return 'ru';
      }
    }
  } catch {
    // В случае отключенного localStorage или серверного окружения
  }
  return 'en';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(detectInitialLanguage);

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      // Игнорируем ошибки квоты или приватного режима
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'ru' ? 'en' : 'ru');
  }, [language, setLanguage]);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const activeLocale = locales[language] || locales.en;
      const rawString = getTranslationString(activeLocale, key);
      return formatTranslation(rawString, params);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t
    }),
    [language, setLanguage, toggleLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
