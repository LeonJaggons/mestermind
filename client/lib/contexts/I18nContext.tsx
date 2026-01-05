"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "en" | "hu";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Load translations dynamically
const loadTranslations = async (lang: Language): Promise<Record<string, string>> => {
  try {
    const module = await import(`@/lib/i18n/translations/${lang}`);
    return module.default;
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
    return {};
  }
};

interface I18nProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

// Get initial language from localStorage if available (client-side only)
const getInitialLanguage = (defaultLanguage: Language): Language => {
  if (typeof window !== "undefined") {
    const savedLanguage = localStorage.getItem("language") as Language | null;
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "hu")) {
      return savedLanguage;
    }
  }
  return defaultLanguage;
};

export function I18nProvider({ children, defaultLanguage = "en" }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage(defaultLanguage));
  const [loadedTranslations, setLoadedTranslations] = useState<Record<Language, Record<string, string>>>({
    en: {},
    hu: {},
  });

  // Load translations on mount and when language changes
  useEffect(() => {
    const load = async () => {
      if (!loadedTranslations[language] || Object.keys(loadedTranslations[language]).length === 0) {
        const translations = await loadTranslations(language);
        setLoadedTranslations((prev) => ({
          ...prev,
          [language]: translations,
        }));
      }
    };
    load();
  }, [language, loadedTranslations]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = loadedTranslations[language]?.[key] || loadedTranslations["en"]?.[key] || key;
    
    if (params) {
      return translation.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match;
      });
    }
    
    return translation;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
