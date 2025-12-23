import React, { createContext, useContext, useState, useEffect } from "react";
import { en } from "@/translations/en";
import { bs } from "@/translations/bs";
import { az } from "@/translations/az";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export type Language = "en" | "bs" | "az";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en,
  bs,
  az,
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("bs");
  const [isLoaded, setIsLoaded] = useState(false);
  const { user } = useAuth();
  const updateLanguageMutation = trpc.auth.updateLanguagePreference.useMutation();

  useEffect(() => {
    // Load language preference from user profile if logged in, otherwise from localStorage
    if (user?.languagePreference && ["en", "bs", "az"].includes(user.languagePreference)) {
      setLanguageState(user.languagePreference as Language);
      localStorage.setItem("language", user.languagePreference);
    } else {
      const savedLanguage = localStorage.getItem("language") as Language | null;
      if (savedLanguage && ["en", "bs", "az"].includes(savedLanguage)) {
        setLanguageState(savedLanguage);
      }
    }
    setIsLoaded(true);
  }, [user?.languagePreference]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    // Save to user profile if logged in
    if (user?.id) {
      updateLanguageMutation.mutate({ language: lang });
    }
  };

  const t = (key: string): string => {
    const keys = key.split(".");
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        // Fallback to English if translation key not found
        value = translations.en;
        for (const k of keys) {
          if (value && typeof value === "object" && k in value) {
            value = value[k];
          } else {
            return key; // Return the key itself if not found
          }
        }
      }
    }

    return typeof value === "string" ? value : key;
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
