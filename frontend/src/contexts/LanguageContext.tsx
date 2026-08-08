import React, { createContext, useContext, useState } from 'react';

// Master language: English (en). Secondary: Somali (so).
export type LanguageCode = 'en' | 'so';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (translations: Record<string, string> | any, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageCode>('en'); // Default: English

  const t = (translations: Record<string, string> | any, fallback: string = '') => {
    if (!translations) return fallback;
    if (typeof translations === 'string') return translations;
    return translations[language] || translations['en'] || fallback;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
