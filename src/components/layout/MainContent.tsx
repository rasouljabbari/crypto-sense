"use client";

import { ReactNode } from "react";
import { useI18n } from "@/i18n/context";
import { Footer } from "@/components/Footer";

export function MainContent({ children }: { children: ReactNode }) {
  const { dir } = useI18n();
  return (
    <main className={`pt-14 sm:pt-0 min-h-screen flex flex-col ${dir === "rtl" ? "lg:pr-[260px]" : "lg:pl-[260px]"}`}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1460px] mx-auto w-full flex-1">
        {children}
      </div>
      <Footer />
    </main>
  );
}
