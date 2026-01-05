"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/contexts/I18nContext";

export default function LanguageWrapper({ children }: { children: React.ReactNode }) {
  const { language } = useI18n();

  useEffect(() => {
    // Update the html lang attribute when language changes
    document.documentElement.lang = language;
  }, [language]);

  return <>{children}</>;
}
