import React, { createContext, useContext, useState } from 'react';
import sv from '../utils/sv';
import en from '../utils/en';

const TRANSLATIONS = { sv, en };
const STORAGE_KEY = 'malmo_language';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(STORAGE_KEY) || 'sv');

  function toggleLanguage() {
    const next = lang === 'sv' ? 'en' : 'sv';
    localStorage.setItem(STORAGE_KEY, next);
    setLang(next);
  }

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t: TRANSLATIONS[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
