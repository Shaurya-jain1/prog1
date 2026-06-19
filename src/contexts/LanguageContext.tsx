"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type SupportedLocale = "hi" | "en" | "ta" | "te" | "mr" | "bn";

interface LanguageContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "hi",
  setLocale: () => {},
  t: () => "",
});

const loadMessages = async (locale: SupportedLocale) => {
  try {
    return (await import(`../../messages/${locale}.json`)).default;
  } catch {
    return (await import(`../../messages/hi.json`)).default;
  }
};

let messagesCache: Record<string, any> = {};

const getMessages = async (locale: SupportedLocale) => {
  if (!messagesCache[locale]) {
    messagesCache[locale] = await loadMessages(locale);
  }
  return messagesCache[locale];
};

const getNestedValue = (obj: any, path: string): string => {
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current?.[key] === undefined) return path;
    current = current[key];
  }
  return typeof current === "string" ? current : path;
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>("en");
  const [messages, setMessages] = useState<any>(null);

  const setLocale = useCallback(async (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    const msgs = await getMessages(newLocale);
    setMessages(msgs);
  }, []);

  React.useEffect(() => {
    getMessages("en").then(setMessages);
  }, []);

  const t = useCallback(
    (key: string): string => {
      if (!messages) return key;
      return getNestedValue(messages, key);
    },
    [messages]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
