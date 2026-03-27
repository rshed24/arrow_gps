import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';
import i18n from './i18n';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  isRTL: boolean;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: string, options?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  isRTL: true,
  toggleLanguage: () => {},
  setLanguage: () => {},
  t: (key: string) => key,
});

const LANGUAGE_KEY = 'arrow_gps_language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const deviceLocale = Localization.getLocales()[0];
    const langCode = deviceLocale?.languageCode || 'en';
    return langCode === 'ar' ? 'ar' : 'en';
  });

  useEffect(() => {
    // Load saved language preference
    AsyncStorage.getItem(LANGUAGE_KEY).then((savedLang) => {
      if (savedLang === 'ar' || savedLang === 'en') {
        setLanguageState(savedLang);
        i18n.locale = savedLang;
      }
    });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    i18n.locale = lang;
    AsyncStorage.setItem(LANGUAGE_KEY, lang);
    // Note: RTL layout changes require app restart on native
    if (lang === 'ar') {
      I18nManager.forceRTL(true);
    } else {
      I18nManager.forceRTL(false);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
  }, [language, setLanguage]);

  const t = useCallback((key: string, options?: Record<string, string>) => {
    let text = i18n.t(key);
    if (options) {
      Object.entries(options).forEach(([k, v]) => {
        text = text.replace(`{{${k}}}`, v);
      });
    }
    return text;
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, isRTL, toggleLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
