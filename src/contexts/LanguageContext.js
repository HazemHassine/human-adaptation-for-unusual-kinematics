"use client";
import React, { createContext, useContext, useState } from "react";
import { translations } from "@/translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("en");

  const t = (key, params = {}) => {
    const translation = translations[language]?.[key] || translations["en"]?.[key] || key;
    if (typeof translation === "function") {
      return translation(params);
    }
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
