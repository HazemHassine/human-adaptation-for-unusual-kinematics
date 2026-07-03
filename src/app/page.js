"use client";

import React, { useState } from "react";
import ExperimentRunner from "@/components/ExperimentRunner";

export default function Home() {
  return (
    <main className="relative">
      <ExperimentRunner devMode={false} />
    </main>
  );
}
