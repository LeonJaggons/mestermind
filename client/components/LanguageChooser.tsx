"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { useI18n } from "@/lib/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface LanguageOption {
  code: "en" | "hu";
  name: string;
  nativeName: string;
}

const languages: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar" },
];

export default function LanguageChooser({ className }: { className?: string }) {
  const { language, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);

  const currentLanguage = languages.find((lang) => lang.code === language);

  const handleLanguageChange = (langCode: "en" | "hu") => {
    if (langCode === language) {
      setOpen(false);
      return;
    }

    setLanguage(langCode);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label={t("language.select")}
          title={t("language.select")}
        >
          <Globe className="h-5 w-5 text-[rgb(103,109,115)]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-2 bg-white border-gray-200" sideOffset={8}>
        <div className="flex flex-col gap-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                "hover:bg-gray-100 text-left",
                language === lang.code && "bg-blue-50 text-blue-700 font-medium"
              )}
            >
              <div className="flex flex-col">
                <span className="font-medium">{lang.nativeName}</span>
                <span className="text-xs text-gray-500">{lang.name}</span>
              </div>
              {language === lang.code && (
                <svg
                  className="h-4 w-4 text-blue-700"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
