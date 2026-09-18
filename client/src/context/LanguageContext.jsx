import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export const AVAILABLE_LANGUAGES = [
  { code: 'en', label: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'kn', label: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🌾' }
];

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('farmgrid_language');
      return saved === 'kn' ? 'kn' : 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang) => {
    if (lang !== 'en' && lang !== 'kn') return;
    setLanguageState(lang);
    try {
      localStorage.setItem('farmgrid_language', lang);
    } catch (e) {
      console.warn('Could not persist language preference:', e);
    }
  };

  /**
   * Translates a dot-notated key.
   * e.g., t('farmer.welcomeBack', { name: 'Ramesh' })
   */
  const t = (key, params = {}) => {
    if (!key) return '';

    const keys = key.split('.');
    let val = keys.reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : null), translations[language]);

    // Fallback to English if translation is missing in selected language
    if (val === null || val === undefined) {
      val = keys.reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : null), translations.en);
    }

    if (val === null || val === undefined) {
      return key; // return key as fallback
    }

    if (typeof val === 'string' && Object.keys(params).length > 0) {
      return val.replace(/{(\w+)}/g, (_, match) => (params[match] !== undefined ? params[match] : `{${match}}`));
    }

    return val;
  };

  /**
   * Helper to translate standard system status
   */
  const translateStatus = (status) => {
    if (!status) return '';
    return t(`status.${status}`) || status;
  };

  /**
   * Helper to translate equipment types
   */
  const translateEquipment = (type) => {
    if (!type) return '';
    return t(`equipment.${type}`) || type;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        translateStatus,
        translateEquipment,
        languages: AVAILABLE_LANGUAGES,
        isKannada: language === 'kn'
      }}
    >
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
