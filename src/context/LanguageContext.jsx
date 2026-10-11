import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../data/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  // Default to Arabic or persisted language preference
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('oppi_lang');
      if (saved && (saved === 'ar' || saved === 'fr' || saved === 'en')) {
        return saved;
      }
    }
    return 'ar';
  });

  useEffect(() => {
    // Update document direction and language attributes for accessibility and layout
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    if (typeof window !== 'undefined') {
      localStorage.setItem('oppi_lang', language);
    }
  }, [language]);

  // Helper function to get translation keys safely with multi-tier fallback:
  // requested lang -> 'en' -> 'ar' -> key
  const t = (key) => {
    if (!key) return '';
    const currentLangVal = translations[language]?.[key];
    if (currentLangVal !== undefined && currentLangVal !== null && currentLangVal !== '') {
      return currentLangVal;
    }
    const enVal = translations['en']?.[key];
    if (enVal !== undefined && enVal !== null && enVal !== '') {
      return enVal;
    }
    const arVal = translations['ar']?.[key];
    if (arVal !== undefined && arVal !== null && arVal !== '') {
      return arVal;
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
