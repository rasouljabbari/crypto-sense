"use client";

import { Locale, useI18n } from "@/i18n/context";
import { useTheme } from "@/lib/theme";
import { useStore } from "@/store/useStore";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConfirmModal } from "./ConfirmModal";

function Flag({ locale }: { locale: Locale }) {
  if (locale === "en") return <span className="text-base leading-none">🇬🇧</span>;
  if (locale === "tr") return <span className="text-base leading-none">🇹🇷</span>;
  return <span className="text-base leading-none">🇮🇷</span>;
}

export function Header() {
  const { lastUpdated, refreshData, isLoading } = useStore();
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { data: session, status } = useSession();
  const [langOpen, setLangOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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

  const navLinks = [
    { href: "/", label: t("nav.coins") },
    { href: "/indicators", label: t("nav.indicators") },
    { href: "/watchlist", label: t("nav.watchlist") },
    { href: "/treemap", label: t("nav.treemap") },
    { href: "/fear-greed", label: t("nav.fear_greed") },
  ];

  const locales: { value: Locale; label: string }[] = [
    { value: "en", label: t("locale.en") },
    { value: "tr", label: t("locale.tr") },
    { value: "fa", label: t("locale.fa") },
  ];

  return (
    <header className="border-b border-theme bg-theme-secondary backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-[1460px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image src="/logo.svg" alt="CryptoSense" width={32} height={32} className="w-8 h-8 rounded-lg" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-theme-text group-hover:text-emerald-400 transition-colors">{t("brand.name")}</h1>
              <p className="text-xs text-theme-secondary">{t("brand.tagline")}</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {/* Navigation */}
            <nav className="hidden lg:flex items-center gap-1 text-xs">
              <Link
                href="/"
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${pathname === "/"
                  ? "bg-emerald-500/15 text-emerald-400 font-medium"
                  : "text-theme-secondary hover:text-theme-text"
                  }`}
              >
                {t("nav.coins")}
              </Link>
              <div className="relative group">
                <button
                  className="px-2.5 py-1.5 rounded-lg text-xs text-theme-secondary cursor-not-allowed opacity-50"
                  disabled
                >
                  {t("nav.indicators")}
                </button>
                <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-gray-700 text-[10px] text-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {t("nav.coming_soon")}
                </span>
              </div>
              <Link
                href="/watchlist"
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${pathname === "/watchlist"
                  ? "bg-emerald-500/15 text-emerald-400 font-medium"
                  : "text-theme-secondary hover:text-theme-text"
                  }`}
              >
                {t("nav.watchlist")}
              </Link>
              <Link
                href="/treemap"
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${pathname === "/treemap"
                  ? "bg-emerald-500/15 text-emerald-400 font-medium"
                  : "text-theme-secondary hover:text-theme-text"
                  }`}
              >
                {t("nav.treemap")}
              </Link>
              <Link
                href="/fear-greed"
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${pathname === "/fear-greed"
                  ? "bg-emerald-500/15 text-emerald-400 font-medium"
                  : "text-theme-secondary hover:text-theme-text"
                  }`}
              >
                {t("nav.fear_greed")}
              </Link>
            </nav>

            {/* Desktop Email */}
            {status === "authenticated" && session?.user?.email && (
              <span className="hidden lg:inline text-xs text-theme-secondary px-2 truncate max-w-[120px]">
                {session.user.email}
              </span>
            )}

            {/* Language Dropdown */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-theme-card border border-theme text-xs text-theme-text hover:bg-theme-hover transition-colors"
              >
                <Flag locale={locale} />
                <span className="hidden md:inline">{locales.find((l) => l.value === locale)?.label}</span>
                <svg className={`w-3 h-3 text-theme-secondary transition-transform ${langOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-1.5 w-36 bg-theme-secondary border border-theme rounded-lg shadow-xl py-1 z-50">
                  {locales.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => { setLocale(l.value); setLangOpen(false); }}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors ${locale === l.value
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

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-theme-card border border-theme text-theme-secondary hover:text-theme-text hover:bg-theme-hover transition-colors"
              title={theme === "dark" ? t("header.light_mode") : t("header.dark_mode")}
            >
              {theme === "dark" ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Logout */}
            {status === "authenticated" && (
              <button
                onClick={() => setLogoutOpen(true)}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-theme-card border border-theme text-theme-secondary hover:text-red-400 hover:bg-red-900/20 hover:border-red-500/30 transition-colors"
                title="Sign out"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
              </button>
            )}

            {/* Live indicator + Refresh */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-theme-secondary">
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
              className="px-3 py-1.5 text-xs font-medium bg-theme-card border border-theme text-theme-text rounded-lg hover:bg-theme-hover transition-colors disabled:opacity-50"
            >
              {isLoading ? t("header.refreshing") : t("header.refresh")}
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-theme-card border border-theme text-theme-secondary hover:text-theme-text transition-colors"
              aria-label="Menu"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-theme bg-theme-secondary">
          <div className="max-w-[1460px] mx-auto px-4 py-3 flex flex-col gap-1">
            {/* User Info */}
            {status === "authenticated" && session?.user?.email && (
              <div className="flex items-center gap-3 px-3 py-3 border-b border-theme mb-1">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold">
                  {session.user.email[0].toUpperCase()}
                </div>
                <span className="text-sm text-theme-text truncate">{session.user.email}</span>
              </div>
            )}

            {navLinks.map((link) =>
              link.href === "/indicators" ? (
                <div key={link.href} className="relative group">
                  <button
                    disabled
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-theme-secondary opacity-50 cursor-not-allowed"
                  >
                    {link.label}
                  </button>
                  <span className="absolute top-1/2 -translate-y-1/2 right-3 px-2 py-0.5 rounded bg-gray-700 text-[10px] text-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {t("nav.coming_soon")}
                  </span>
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${pathname === link.href
                    ? "bg-emerald-500/15 text-emerald-400 font-medium"
                    : "text-theme-secondary hover:text-theme-text hover:bg-theme-hover"
                    }`}
                >
                  {link.label}
                </Link>
              )
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={logoutOpen}
        title="Sign out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        onConfirm={() => {
          setLogoutOpen(false);
          localStorage.clear();
          signOut({ callbackUrl: "/login" });
        }}
        onCancel={() => setLogoutOpen(false)}
      />
    </header>
  );
}
