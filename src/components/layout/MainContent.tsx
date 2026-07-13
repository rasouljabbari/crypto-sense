"use client";

import { ReactNode } from "react";
import { Footer } from "@/components/Footer";

export function MainContent({ children }: { children: ReactNode }) {
  return (
    <main className="pt-14 lg:pl-[260px] min-h-screen">
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1460px]">
        {children}
      </div>
      <Footer />
    </main>
  );
}
