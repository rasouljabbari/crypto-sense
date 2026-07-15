"use client";

import { useI18n } from "@/i18n/context";
import { useStore } from "@/store/useStore";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSidebar } from "./SidebarContext";

function Flag({ locale }: { locale: string }) {
  if (locale === "en") return <span className="text-sm leading-none">🇬🇧</span>;
  if (locale === "tr") return <span className="text-sm leading-none">🇹🇷</span>;
  return <span className="text-sm leading-none">🇮🇷</span>;
}

const breadcrumbMap: Record<string, string> = {
  "/": "nav.overview",
  "/coins": "nav.coins",
  "/analysis": "nav.coin_analysis",
  "/watchlist": "nav.watchlist",
  "/treemap": "nav.treemap",
  "/fear-greed": "nav.fear_greed",
  "/dashboard": "nav.overview",
  "/login": "header.login",
};

export function Header() {
  const { lastUpdated, refreshData, isLoading } = useStore();
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const { data: session, status } = useSession();
  const { toggleMobile } = useSidebar();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const locales: { value: string; label: string }[] = [
    { value: "en", label: t("locale.en") },
    { value: "tr", label: t("locale.tr") },
    { value: "fa", label: t("locale.fa") },
  ];

  const breadcrumbKey = breadcrumbMap[pathname] ?? "nav.overview";
  const pageTitle = t(breadcrumbKey);

  return (
    <header className="fixed top-0 right-0 z-30 h-14 bg-theme-secondary/80 backdrop-blur-xl border-b border-theme flex items-center px-4 sm:px-6 lg:pl-[268px] sm:hidden">
      <div className="flex items-center gap-3 w-full">
        <button
          onClick={toggleMobile}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-theme-card border border-theme text-theme-secondary hover:text-theme-text transition-colors shrink-0"
          aria-label="Menu"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link href="/" className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <Image
              src="/logo.svg"
              alt="CryptoSense"
              width={24}
              height={24}
              className="w-6 h-6 rounded-lg"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full border-2 border-theme-secondary" />
          </div>
          <h2 className="text-sm font-semibold text-theme-text truncate">{pageTitle}</h2>
        </Link>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <div className="hidden md:flex items-center gap-2 text-xs text-theme-secondary">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t("header.live")}</span>
            {lastUpdated && (
              <span className="text-theme-secondary opacity-60">
                | {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>

          <button
            onClick={refreshData}
            disabled={isLoading}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-theme-card border border-theme text-theme-text rounded-lg hover:bg-theme-hover transition-colors disabled:opacity-50"
          >
            <svg className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            <span className="hidden lg:inline">{isLoading ? t("header.refreshing") : t("header.refresh")}</span>
          </button>

          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-theme-card border border-theme text-xs text-theme-text hover:bg-theme-hover transition-colors"
            >
              <Flag locale={locale} />
              <svg className={`w-3 h-3 text-theme-secondary transition-transform ${langOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-1.5 w-36 bg-theme-secondary border border-theme rounded-lg shadow-xl py-1 z-50">
                {locales.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => {
                      setLocale(l.value as "en" | "tr" | "fa");
                      setLangOpen(false);
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors ${locale === l.value
                        ? "text-emerald-400 bg-emerald-500/10"
                        : "text-theme-text hover:bg-theme-hover"
                      }`}
                  >
                    <Flag locale={l.value} />
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {status === "authenticated" && (
            <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              {session.user?.email?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          {status === "unauthenticated" && (
            <Link
              href="/login"
              className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-theme-card border border-theme text-theme-secondary hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
              title={t("header.login")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
