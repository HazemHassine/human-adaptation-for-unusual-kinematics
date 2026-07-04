"use client";

import React, { useState } from "react";
import ExperimentRunner from "@/components/ExperimentRunner";
import { LanguageProvider } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Home() {
  return (
    <LanguageProvider>
      <LanguageSwitcher />
      <main className="relative">
        <ExperimentRunner devMode={false} />
      </main>
    </LanguageProvider>
  );
}
