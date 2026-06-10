"use client";

import React, { useState } from "react";
import ExperimentRunner from "@/components/ExperimentRunner";

export default function Home() {
  const [devMode, setDevMode] = useState(false);

  return (
    <main className="relative">
      <div className="absolute top-4 right-4 z-50">
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input type="checkbox" className="sr-only" checked={devMode} onChange={() => setDevMode(!devMode)} />
            <div className={`block w-14 h-8 rounded-full ${devMode ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${devMode ? 'translate-x-6' : ''}`}></div>
          </div>
          <div className="ml-3 text-gray-700 font-medium">
            {devMode ? "DEV" : "PROD"}
          </div>
        </label>
      </div>
      <ExperimentRunner devMode={devMode} />
    </main>
  );
}
