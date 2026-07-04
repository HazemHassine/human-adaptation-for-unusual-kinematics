"use client";
import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="absolute top-4 right-4 z-50 flex bg-white rounded-full shadow-md p-1 border border-slate-200">
      <button
        onClick={() => setLanguage("en")}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          language === "en" ? "bg-slate-100 shadow-inner scale-110" : "hover:bg-slate-50 opacity-70 hover:opacity-100"
        }`}
        title="English"
      >
        <span className="text-xl leading-none">🇬🇧</span>
      </button>
      <button
        onClick={() => setLanguage("de")}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          language === "de" ? "bg-slate-100 shadow-inner scale-110" : "hover:bg-slate-50 opacity-70 hover:opacity-100"
        }`}
        title="Deutsch"
      >
        <span className="text-xl leading-none">🇩🇪</span>
      </button>
    </div>
  );
}
