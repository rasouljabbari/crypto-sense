"use client";

import { ConfirmModal } from "@/components/ConfirmModal";
import { Locale, useI18n } from "@/i18n/context";
import { useTheme } from "@/lib/theme";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSidebar } from "./SidebarContext";

/* ── Navigation Config ────────────────────────────────────────────────── */
/*  Add / remove items here to extend the sidebar. Each entry needs:       */
/*  • href   – route path                                                  */
/*  • label  – i18n key (must exist in dictionaries)                       */
/*  • icon   – ReactNode (SVG)                                             */
/*  • group  – optional section label (renders a divider + heading)        */
/* ─────────────────────────────────────────────────────────────────────── */

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  group?: string;
}

function useNavItems(): NavItem[] {
  const { t } = useI18n();
  return [
    {
      href: "/",
      label: t("nav.overview"),
      icon: <LayoutDashboardIcon />,
    },
    {
      href: "/coins",
      label: t("nav.coins"),
      icon: <CoinsIcon />,
    },
    {
      href: "/analysis",
      label: t("nav.coin_analysis"),
      icon: <CoinAnalysisIcon />,
    },
    {
      href: "/watchlist",
      label: t("nav.watchlist"),
      icon: <WatchlistIcon />,
    }
  ];
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function Flag({ locale }: { locale: Locale }) {
  const flags: Record<Locale, string> = { en: "🇬🇧", tr: "🇹🇷", fa: "🇮🇷" };
  return <span className="text-sm leading-none">{flags[locale]}</span>;
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

/* ── Main Sidebar Component ───────────────────────────────────────────── */

export function Sidebar() {
  const { mobileOpen, setMobileOpen } = useSidebar();
  const pathname = usePathname();
  const { t, locale, setLocale, dir } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { data: session, status } = useSession();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const navItems = useNavItems();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  const locales: { value: Locale; label: string }[] = [
    { value: "en", label: t("locale.en") },
    { value: "tr", label: t("locale.tr") },
    { value: "fa", label: t("locale.fa") },
  ];

  /* Group nav items by `group` field */
  const groups = navItems.reduce<{ key: string; items: NavItem[] }[]>((acc, item) => {
    if (item.group) {
      acc.push({ key: item.group, items: [item] });
    } else {
      const last = acc[acc.length - 1];
      if (last) last.items.push(item);
      else acc.push({ key: "", items: [item] });
    }
    return acc;
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
            fixed top-0 z-40 h-screen w-full lg:w-56
            bg-theme-secondary/95 backdrop-blur-xl
            ${dir === "rtl" ? "border-l" : "border-r"} border-theme
            flex flex-col
            transition-transform duration-300 ease-in-out
            ${dir === "rtl" ? "lg:translate-x-0" : "lg:translate-x-0"}
            ${mobileOpen
            ? "translate-x-0 shadow-2xl"
            : dir === "rtl"
              ? "translate-x-full"
              : "-translate-x-full"
          }
            ${dir === "rtl" ? "right-0" : "left-0"}
          `}
      >
        {/* ── Brand ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 h-16 shrink-0 border-b border-theme">
          <Link href="/" className="flex items-center gap-3 group flex-1 min-w-0">
            <div className="relative shrink-0">
              <Image
                src="/logo.svg"
                alt={t("brand.alt")}
                width={32}
                height={32}
                className="w-8 h-8 rounded-xl"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-theme-secondary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-theme-text group-hover:text-emerald-400 transition-colors duration-200 truncate">
                {t("brand.name")}
              </h1>
              <p className="text-[10px] text-theme-secondary leading-tight truncate">
                {t("brand.tagline")}
              </p>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg text-theme-secondary hover:text-theme-text hover:bg-theme-hover transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Navigation ─────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((group) => (
            <div key={group.key}>
              {group.key && (
                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-theme-secondary/60">
                  {group.key}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        group/nav relative flex items-center gap-3
                        px-3 py-2.5 rounded-xl
                        text-sm font-medium
                        transition-all duration-200 ease-out
                        ${active
                          ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.12)]"
                          : "text-theme-secondary hover:text-theme-text hover:bg-theme-hover"
                        }
                      `}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <span className={`absolute top-1/2 -translate-y-1/2 w-[3px] h-5 bg-emerald-400 ${dir === "rtl" ? "right-0 rounded-l-full" : "left-0 rounded-r-full"}`} />
                      )}

                      <span
                        className={`
                          w-5 h-5 shrink-0 flex items-center justify-center
                          transition-colors duration-200
                          ${active ? "text-emerald-400" : "text-theme-secondary group-hover/nav:text-theme-text"}
                        `}
                      >
                        {item.icon}
                      </span>

                      <span className="truncate">{item.label}</span>

                      {/* Subtle arrow on hover */}
                      {!active && (
                        <svg
                          className={`w-3 h-3 ${dir === "rtl" ? "mr-auto" : "ml-auto"} opacity-0 ${dir === "rtl" ? "translate-x-1 group-hover/nav:translate-x-0" : "-translate-x-1 group-hover/nav:translate-x-0"} transition-all duration-200 ${dir === "rtl" ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Bottom Controls ────────────────────────────────────── */}
        <div className="shrink-0 border-t border-theme p-3 space-y-1">
          {/* Language */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs text-theme-secondary hover:text-theme-text hover:bg-theme-hover transition-all duration-200"
            >
              <span className="w-5 h-5 shrink-0 flex items-center justify-center">
                <Flag locale={locale} />
              </span>
              <span className="truncate">{locales.find((l) => l.value === locale)?.label}</span>
              <svg
                className={`w-3 h-3 ml-auto transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {langOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-theme-secondary border border-theme rounded-xl shadow-xl py-1 z-50">
                {locales.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => {
                      setLocale(l.value);
                      setLangOpen(false);
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors duration-150 ${locale === l.value
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

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs text-theme-secondary hover:text-theme-text hover:bg-theme-hover transition-all duration-200"
          >
            <span className="w-5 h-5 shrink-0 flex items-center justify-center">
              {theme === "dark" ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </span>
            <span className="truncate">{theme === "dark" ? t("header.light_mode") : t("header.dark_mode")}</span>
          </button>

          {/* User section */}
          {status === "authenticated" ? (
            <SidebarUserMenu session={session} />
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs text-theme-secondary hover:text-emerald-400 hover:bg-theme-hover transition-all duration-200"
            >
              <span className="w-5 h-5 shrink-0 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </span>
              <span className="truncate">{t("header.login")}</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}

/* ── User Menu ────────────────────────────────────────────────────────── */

function SidebarUserMenu({ session }: { session: Session }) {
  const { t } = useI18n();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const pathname = usePathname();

  const initial = session.user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-theme-card border border-theme">
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-theme-text truncate">
            {session.user?.name ?? session.user?.email}
          </p>
          <p className="text-[10px] text-theme-secondary truncate">
            {session.user?.email}
          </p>
        </div>
        <button
          onClick={() => setLogoutOpen(true)}
          className="shrink-0 p-1 rounded-lg text-theme-secondary hover:text-red-400 hover:bg-red-900/20 transition-colors duration-200"
          title={t("auth.sign_out")}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
        </button>
      </div>

      <ConfirmModal
        open={logoutOpen}
        title={t("auth.sign_out")}
        message={t("auth.sign_out_confirm")}
        confirmLabel={t("auth.sign_out")}
        cancelLabel={t("common.cancel")}
        onConfirm={async () => {
          setLogoutOpen(false);
          localStorage.clear();
          try {
            const res = await fetch("/api/auth/csrf");
            const { csrfToken } = await res.json();
            await fetch("/api/auth/signout", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({ csrfToken, callbackUrl: "/" }),
            });
          } catch { }
          if (pathname.startsWith("/watchlist")) {
            window.location.href = "/";
          } else {
            window.location.reload();
          }
        }}
        onCancel={() => setLogoutOpen(false)}
      />
    </>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────── */

function LayoutDashboardIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
    </svg>
  );
}

function CoinsIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
}

function CoinAnalysisIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
      <circle cx="14" cy="10" r="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 16l4-6 3 3 4-5" />
    </svg>
  );
}

function WatchlistIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  );
}

function TreemapIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25c0 .966.784 1.75 1.75 1.75h2.25A2.25 2.25 0 0 1 16.5 10.5v6.75A2.25 2.25 0 0 1 14.25 19.5h-8.5A2.25 2.25 0 0 1 3.5 17.25v-6.75c0-.966.784-1.75 1.75-1.75h6.75A2.25 2.25 0 0 1 14.25 6V3.75" />
    </svg>
  );
}

function FearGreedIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
    </svg>
  );
}
