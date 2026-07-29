"use client";

import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/context";
import { useTheme } from "@/lib/theme";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { ContactForm } from "@/components/contact/ContactForm";
import { MarketTicker } from "@/components/landing/MarketTicker";
import { useBinanceMarket } from "@/hooks/useBinanceMarket";
import binanceService from "@/services/binance-market";
import { FEATURED_SYMBOLS } from "@/config/featured-coins";
import type { MarketCandle } from "@/services/binance-market";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

function ScannerBeam() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-[2px] z-10 pointer-events-none"
      style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.6), rgba(16,185,129,0.9), rgba(16,185,129,0.6), transparent)" }}
      animate={{ top: ["0%", "100%", "0%"] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    />
  );
}

function ScannerGlow() {
  return (
    <motion.div
      className="absolute left-[10%] right-[10%] h-[80px] z-10 pointer-events-none"
      style={{ background: "linear-gradient(180deg, transparent, rgba(16,185,129,0.08), transparent)" }}
      animate={{ top: ["-10%", "90%", "-10%"] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    />
  );
}

function SectionShell({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={fadeIn}
      className={`relative px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </motion.section>
  );
}

function SectionHeader({ title, subtitle, className = "" }: { title: string; subtitle: string; className?: string }) {
  return (
    <motion.div variants={fadeUp} className={`text-center max-w-2xl mx-auto mb-12 sm:mb-16 ${className}`}>
      <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{title}</h2>
      <p className="text-lg text-gray-400 leading-relaxed">{subtitle}</p>
    </motion.div>
  );
}

function SiteNav() {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-theme-bg/90 backdrop-blur-lg border-b border-gray-800/50" : "bg-transparent"}`}
      role="navigation"
      aria-label="Site navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <Link href="/" className="flex items-center gap-2 group" aria-label="Crypto Sense home">
            <Logo size="md" />
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            <Link href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">{t("landing.nav.how")}</Link>
            <Link href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">{t("landing.nav.features")}</Link>
            <Link href="#contact" className="text-sm text-gray-400 hover:text-white transition-colors">{t("landing.nav.contact")}</Link>
            <LanguageSwitcher mode="header" />
            <ThemeToggle className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all" />
            <Link
              href="/overview"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              {t("landing.nav.launch")}
              <svg className="w-4 h-4 rtl:-scale-x-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          <div className="flex lg:hidden items-center gap-1">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg text-gray-400 hover:text-white transition-all"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="lg:hidden bg-theme-bg/95 backdrop-blur-lg border-b border-gray-800/50"
        >
          <div className="px-4 py-4 space-y-3">
            <Link href="#how-it-works" onClick={() => setMobileOpen(false)} className="block text-sm text-gray-400 hover:text-white transition-colors py-2">{t("landing.nav.how")}</Link>
            <Link href="#features" onClick={() => setMobileOpen(false)} className="block text-sm text-gray-400 hover:text-white transition-colors py-2">{t("landing.nav.features")}</Link>
            <Link href="#contact" onClick={() => setMobileOpen(false)} className="block text-sm text-gray-400 hover:text-white transition-colors py-2">{t("landing.nav.contact")}</Link>
            <div className="flex items-center gap-2 pt-1">
              <LanguageSwitcher mode="header" />
              <ThemeToggle className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all" />
            </div>
            <Link
              href="/overview"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all"
            >
              {t("landing.nav.launch")}
              <svg className="w-4 h-4 rtl:-scale-x-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </motion.div>
      )}
    </nav>
  );
}

function ema9(candles: MarketCandle[]): (number | null)[] {
  if (candles.length < 9) return candles.map(() => null);
  const k = 2 / 10;
  const result: (number | null)[] = [];
  let ema = candles.slice(0, 9).reduce((s, c) => s + c.close, 0) / 9;
  result.push(null, null, null, null, null, null, null, null, ema);
  for (let i = 9; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function LiveMarketCanvas() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { getTicker } = useBinanceMarket();

  const [candles, setCandles] = useState<MarketCandle[]>([]);
  const [coinIndex, setCoinIndex] = useState(0);
  const [scanX, setScanX] = useState(0);
  const [klinesLoaded, setKlinesLoaded] = useState(false);
  const scanStart = useRef(Date.now());
  const realPriceRef = useRef<number | null>(null);
  const animFrameRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentSymbol = FEATURED_SYMBOLS[coinIndex];
  const ticker = getTicker(currentSymbol);

  useEffect(() => {
    if (ticker) realPriceRef.current = ticker.price;
  }, [ticker]);

  useEffect(() => {
    let mounted = true;
    setKlinesLoaded(false);
    binanceService.fetchKlines(currentSymbol, "1m", 50).then((data) => {
      if (!mounted || data.length === 0) return;
      setCandles(data);
      setKlinesLoaded(true);
    });
    return () => { mounted = false; };
  }, [currentSymbol]);

  useEffect(() => {
    if (!klinesLoaded || candles.length === 0) return;
    if (animFrameRef.current) clearInterval(animFrameRef.current);
    animFrameRef.current = setInterval(() => {
      setCandles((prev) => {
        const target = realPriceRef.current;
        if (target === null || prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const diff = target - last.close;
        if (Math.abs(diff) < 0.0001) return prev;
        const step = diff * 0.35;
        const newClose = last.close + step;
        const newHigh = Math.max(last.high, newClose);
        const newLow = Math.min(last.low, newClose);
        return [...prev.slice(0, -1), { ...last, close: newClose, high: newHigh, low: newLow }];
      });
    }, 600);
    return () => {
      if (animFrameRef.current) clearInterval(animFrameRef.current);
    };
  }, [klinesLoaded, candles.length]);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const elapsed = (Date.now() - scanStart.current) / 3500;
      setScanX(elapsed % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setCoinIndex((i) => (i + 1) % FEATURED_SYMBOLS.length);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const vbW = 600;
  const vbH = 420;
  const cLeft = 50;
  const cRight = 55;
  const cTop = 10;
  const cBottom = 70;
  const cW = vbW - cLeft - cRight;
  const cH = vbH - cTop - cBottom;

  const maxP = useMemo(() => candles.length > 0 ? Math.max(...candles.map((c) => c.high)) : 100, [candles]);
  const minP = useMemo(() => candles.length > 0 ? Math.min(...candles.map((c) => c.low)) : 99, [candles]);
  const pRange = maxP - minP || 1;

  const yS = useCallback((p: number) => cTop + cH - ((p - minP) / pRange) * cH, [minP, pRange]);
  const xS = useCallback((i: number) => cLeft + (i / Math.max(candles.length - 1, 1)) * cW, [candles.length]);

  const lastClose = candles.length > 0 ? candles[candles.length - 1].close : 0;
  const prevClose = candles.length > 1 ? candles[candles.length - 2].close : lastClose;
  const changePct = prevClose !== 0 ? ((lastClose - prevClose) / prevClose) * 100 : 0;

  const emaValues = useMemo(() => candles.length > 0 ? ema9(candles) : [], [candles]);
  const filledEma = emaValues.filter((v): v is number => v !== null);

  const gridLevels = useMemo(() => {
    const levels: number[] = [];
    for (let i = 0; i <= 4; i++) levels.push(minP + (pRange * i) / 4);
    return levels;
  }, [minP, pRange]);

  const slotW = cW / Math.max(candles.length, 1);
  const candleW = Math.max(slotW * 0.65, 2);

  const latestVol = candles.length > 0 ? candles[candles.length - 1].volume : 0;
  const maxVol = useMemo(() => Math.max(...candles.map((c) => c.volume), 1), [candles]);

  const baseSymbol = currentSymbol.replace("USDT", "");

  return (
    <div className="relative w-full bg-gray-950/90 border border-gray-800 rounded-xl overflow-hidden shadow-2xl shadow-emerald-500/5">
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-gray-800/60 bg-gray-900/50">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        </div>
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest ml-2">Scanner</span>
        <motion.span
          className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 ml-2"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50" />
          LIVE
        </motion.span>
        <div className="hidden xs:flex items-center gap-1 ml-3 text-[10px] text-gray-600 font-mono">
          <motion.span
            key={coinIndex}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.3 }}
            className="text-gray-400"
          >
            {baseSymbol}
          </motion.span>
          <span className="text-gray-600">/USDT</span>
        </div>
        <div className="hidden sm:flex items-center gap-1 ml-auto text-[10px] font-medium text-gray-600">
          {["1m", "5m", "15m", "1h", "4h", "1d"].map((tf) => (
            <span key={tf} className={`px-1.5 py-0.5 rounded ${tf === "1m" ? "text-emerald-400 bg-emerald-500/10" : ""}`}>{tf}</span>
          ))}
        </div>
      </div>

      <div className="relative w-full" style={{ aspectRatio: `${vbW}/${vbH}` }}>
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {gridLevels.map((level, gi) => {
            const y = yS(level);
            return (
              <g key={gi}>
                <line
                  x1={cLeft} y1={y} x2={cLeft + cW} y2={y}
                  stroke={isDark ? "#1f2937" : "#e5e7eb"}
                  strokeWidth={0.5}
                />
                <text
                  x={cLeft + cW + 4} y={y + 3}
                  fill={isDark ? "#6b7280" : "#9ca3af"}
                  fontSize="9"
                  fontFamily="monospace"
                  dominantBaseline="middle"
                >
                  {level.toFixed(2)}
                </text>
              </g>
            );
          })}

          {filledEma.length >= 2 && (
            <path
              d={filledEma
                .map((v, i) => {
                  const idx = candles.length - filledEma.length + i;
                  const x = xS(idx);
                  const y = yS(v);
                  return `${i === 0 ? "M" : "L"}${x},${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              strokeOpacity={0.6}
            />
          )}

          {candles.map((c, i) => {
            const x = xS(i) - slotW / 2;
            const vH = (c.volume / maxVol) * 50;
            const isUp = c.close >= c.open;
            return (
              <motion.rect
                key={`v-${i}`}
                x={x + (slotW - candleW) / 2}
                y={cTop + cH + 8 + (50 - vH)}
                width={candleW}
                height={vH}
                fill={isUp ? "#22c55e" : "#ef4444"}
                fillOpacity={0.15}
                initial={false}
                animate={{ height: vH, y: cTop + cH + 8 + (50 - vH) }}
                transition={{ duration: 0.3 }}
              />
            );
          })}

          {candles.map((c, i) => {
            const x = xS(i) - slotW / 2;
            const isUp = c.close >= c.open;
            const color = isUp ? "#22c55e" : "#ef4444";
            const bodyTop = yS(Math.max(c.open, c.close));
            const bodyBot = yS(Math.min(c.open, c.close));
            const bodyH = Math.max(bodyBot - bodyTop, 1);
            const wickTop = yS(c.high);
            const wickBot = yS(c.low);
            return (
              <g key={i}>
                <rect
                  x={x + (slotW - candleW) / 2 + candleW / 2 - 0.5}
                  y={wickTop}
                  width={1}
                  height={wickBot - wickTop}
                  fill={color}
                />
                <motion.rect
                  x={x + (slotW - candleW) / 2}
                  y={bodyTop}
                  width={candleW}
                  height={bodyH}
                  rx={0.5}
                  fill={color}
                  initial={false}
                  animate={{ height: bodyH, y: bodyTop }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                />
              </g>
            );
          })}

          {candles.length > 0 && (() => {
            const lc = candles[candles.length - 1];
            const cx = xS(candles.length - 1);
            const cy = yS(lc.close);
            return (
              <g>
                <line x1={cx} y1={cTop} x2={cx} y2={cTop + cH} stroke={isDark ? "#374151" : "#d1d5db"} strokeWidth={0.5} strokeDasharray="3 2" />
                <line x1={cLeft} y1={cy} x2={cLeft + cW} y2={cy} stroke={isDark ? "#374151" : "#d1d5db"} strokeWidth={0.5} strokeDasharray="3 2" />
                <circle cx={cx} cy={cy} r={3} fill={lastClose >= prevClose ? "#22c55e" : "#ef4444"} />
              </g>
            );
          })()}

          {candles.length > 0 && (() => {
            const bx = cLeft + scanX * cW;
            return (
              <g>
                <defs>
                  <linearGradient id="beamGlow" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="50%" stopColor="rgba(16,185,129,0.25)" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                <rect x={bx - 15} y={cTop} width={30} height={cH} fill="url(#beamGlow)" />
                <line x1={bx} y1={cTop} x2={bx} y2={cTop + cH} stroke="rgba(16,185,129,0.5)" strokeWidth={1} />
              </g>
            );
          })()}

          <rect x={cLeft + cW - 70} y={cTop + 4} width={66} height={18} rx={3} fill={isDark ? "#1f2937" : "#f3f4f6"} fillOpacity={0.9} />
          <text x={cLeft + cW - 67} y={cTop + 15} fill={isDark ? "#f3f4f6" : "#111827"} fontSize="10" fontFamily="monospace" fontWeight="bold">
            {lastClose.toFixed(2)}
          </text>
          <text x={cLeft + cW - 67} y={cTop + 27} fill={changePct >= 0 ? "#22c55e" : "#ef4444"} fontSize="8" fontFamily="monospace">
            {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
          </text>

          <text x={cLeft + 4} y={cTop + cH + 40} fill={isDark ? "#6b7280" : "#9ca3af"} fontSize="8" fontFamily="monospace">
            Vol: {latestVol.toFixed(0)}
          </text>
        </svg>

        <div className="absolute bottom-0 inset-x-0 h-9 px-3 sm:px-4 flex items-center justify-between border-t border-gray-800/40 bg-gray-900/60 text-[10px] text-gray-500 font-mono">
          {klinesLoaded ? (
            <>
              <span>High: {maxP.toFixed(2)}</span>
              <span>Low: {minP.toFixed(2)}</span>
              <span className="hidden sm:inline">Vol: {latestVol.toFixed(0)}</span>
              <span className="text-gray-600">{candles.length} candles</span>
            </>
          ) : (
            <span className="text-gray-600">Loading market data...</span>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  const { t } = useI18n();
  return (
    <SectionShell className="min-h-screen flex items-center pt-20 sm:pt-24 pb-16 sm:pb-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.06),transparent_50%)] pointer-events-none" aria-hidden="true" />

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t("landing.badge")}
              </span>
            </motion.div>

            <motion.h1
              className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-bold leading-[1.1] tracking-tight text-white mt-6 sm:mt-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] as const }}
            >
              {t("landing.hero.headline1")}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">
                {t("landing.hero.headline2")}
              </span>
            </motion.h1>

            <motion.p
              className="text-lg sm:text-xl text-gray-400 mt-6 max-w-xl leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {t("landing.hero.subtitle")}
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 mt-8 sm:mt-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Link
                href="/overview"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
              >
                {t("landing.hero.cta_start")}
                <svg className="w-5 h-5 rtl:-scale-x-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-gray-300 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-xl transition-all"
              >
                {t("landing.hero.cta_how")}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </Link>
            </motion.div>

            <motion.div
              className="flex items-center gap-4 mt-10 sm:mt-12 text-xs text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <div className="flex -space-x-2">
                {["#22c55e", "#3b82f6", "#a855f7", "#f59e0b"].map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-theme-bg" style={{ backgroundColor: c, opacity: 0.3 }} />
                ))}
              </div>
              <span>{t("landing.hero.trust", { count: "80+" })}</span>
            </motion.div>
          </div>

          <motion.div
            className="w-full mt-8 lg:mt-0"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] as const }}
          >
            <LiveMarketCanvas />
          </motion.div>
        </div>
      </div>
    </SectionShell>
  );
}

function MarketScannerSection() {
  const { t } = useI18n();
  const { getTicker, connected } = useBinanceMarket();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const tickers = FEATURED_SYMBOLS.map((sym) => ({
    sym,
    ticker: getTicker(sym),
  })).filter((t) => t.ticker);

  const upCount = tickers.filter((t) => (t.ticker?.changePercent24h ?? 0) >= 0).length;
  const downCount = tickers.filter((t) => (t.ticker?.changePercent24h ?? 0) < 0).length;
  const avgChange = tickers.length > 0
    ? tickers.reduce((s, t) => s + Math.abs(t.ticker!.changePercent24h), 0) / tickers.length
    : 0;

  return (
    <SectionShell className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <SectionHeader
          title={t("landing.scanner.title")}
          subtitle={t("landing.scanner.subtitle")}
        />

        <motion.div
          className="relative bg-gray-900/50 border border-gray-800 rounded-2xl p-4 sm:p-6 lg:p-8 overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800/50">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t("landing.scanner.live")} Scanner</span>
            <motion.span
              className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 ml-auto"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ● {t("landing.scanner.scanning")}
            </motion.span>
          </div>

          <div className="relative">
            <ScannerChart />
            <ScannerBeam />
            <ScannerGlow />
          </div>

          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-gray-800/50"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { label: t("landing.scanner.markets_scanned"), value: String(tickers.length), color: "text-white" },
              { label: t("landing.scanner.setups_found"), value: `${upCount}↑ ${downCount}↓`, color: "text-emerald-400" },
              { label: t("landing.scanner.avg_confidence"), value: `${avgChange.toFixed(1)}%`, color: "text-white" },
              { label: t("landing.scanner.last_update"), value: connected ? t("landing.scanner.live") : "---", color: "text-gray-400" },
            ].map((stat) => (
              <motion.div key={stat.label} variants={fadeUp} className="text-center">
                <p className={`text-2xl sm:text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </SectionShell>
  );
}

function ScannerChart() {
  const [candles, setCandles] = useState<MarketCandle[]>([]);
  const { getTicker } = useBinanceMarket();

  useEffect(() => {
    const sym = FEATURED_SYMBOLS[Math.floor(Math.random() * FEATURED_SYMBOLS.length)];
    binanceService.fetchKlines(sym, "1m", 40).then((data) => {
      if (data.length > 0) setCandles(data);
    });
  }, []);

  const width = 800;
  const height = 300;
  const padding = 20;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const maxPrice = candles.length > 0 ? Math.max(...candles.map((c) => c.high)) : 100;
  const minPrice = candles.length > 0 ? Math.min(...candles.map((c) => c.low)) : 99;
  const range = maxPrice - minPrice || 1;
  const candleW = chartW / Math.max(candles.length, 1) * 0.7;
  const gap = chartW / Math.max(candles.length, 1) * 0.3;

  const scaleY = (p: number) => padding + chartH - ((p - minPrice) / range) * chartH;

  if (candles.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-600 text-sm">
        Loading chart data...
      </div>
    );
  }

  return (
    <svg className="w-full h-auto" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = padding + chartH * (1 - pct);
        return (
          <line key={pct} x1={padding} y1={y} x2={width - padding} y2={y}
            stroke="currentColor" strokeOpacity={0.08} strokeDasharray="4 4" />
        );
      })}
      {candles.map((c, i) => {
        const x = padding + (i * ((chartW - candleW) / Math.max(candles.length - 1, 1)));
        const isUp = c.close >= c.open;
        const color = isUp ? "#22c55e" : "#ef4444";
        const bodyTop = scaleY(Math.max(c.open, c.close));
        const bodyBot = scaleY(Math.min(c.open, c.close));
        const bodyH = Math.max(bodyBot - bodyTop, 1);
        return (
          <g key={i}>
            <motion.rect
              x={x + candleW / 2 - 0.5} y={scaleY(c.high)} width={1}
              height={scaleY(c.low) - scaleY(c.high)} fill={color}
              initial={{ opacity: 0, scaleY: 0 }}
              whileInView={{ opacity: 1, scaleY: 1 }}
              viewport={{ once: true }}
              style={{ transformOrigin: `${x + candleW / 2}px ${bodyBot}px` }}
            />
            <motion.rect
              x={x} y={bodyTop} width={candleW} height={bodyH} rx={1} fill={color}
              initial={{ opacity: 0, scaleY: 0, y: bodyBot }}
              whileInView={{ opacity: 1, scaleY: 1, y: bodyTop }}
              viewport={{ once: true }}
              style={{ transformOrigin: `${x + candleW / 2}px ${bodyBot}px` }}
            />
          </g>
        );
      })}
    </svg>
  );
}

function HowItWorksSection() {
  const { t } = useI18n();
  return (
    <SectionShell id="how-it-works" className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title={t("landing.how.title")}
          subtitle={t("landing.how.subtitle")}
        />

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mt-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {[
            { num: "01", title: t("landing.how.step1_title"), desc: t("landing.how.step1_desc") },
            { num: "02", title: t("landing.how.step2_title"), desc: t("landing.how.step2_desc") },
            { num: "03", title: t("landing.how.step3_title"), desc: t("landing.how.step3_desc") },
          ].map((step, i) => (
            <motion.div
              key={step.num}
              variants={fadeUp}
              className="relative group"
            >
              {i < 2 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-emerald-500/30 to-transparent" aria-hidden="true" />
              )}

              <motion.div
                className="relative bg-gray-900/50 border border-gray-800 rounded-2xl p-6 sm:p-8 h-full transition-all"
                whileHover={{ scale: 1.02, borderColor: "rgba(16,185,129,0.2)" }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-5xl sm:text-6xl font-black text-emerald-500/10 absolute top-4 right-6 select-none" aria-hidden="true">
                  {step.num}
                </div>

                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
                  {i === 0 ? (
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  ) : i === 1 ? (
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  )}
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </SectionShell>
  );
}

function LivePreviewSection() {
  const { t } = useI18n();
  const { connected } = useBinanceMarket();

  return (
    <SectionShell className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title={t("landing.preview.title")}
          subtitle={t("landing.preview.subtitle")}
        />

        <MarketTicker />

        <div className="mt-6 px-2 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {t("landing.preview.scanning", { count: "80+" })} · <span className="text-gray-600">{connected ? t("landing.scanner.live") : "---"}</span>
          </span>
          <motion.span
            className="text-[10px] font-medium text-emerald-400 flex items-center gap-1.5"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {t("landing.preview.live")}
          </motion.span>
        </div>
      </div>
    </SectionShell>
  );
}

function FeaturesSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const features = [
    { icon: "M13 10V3L4 14h7v7l9-11h-7z", title: t("landing.features.realtime_title"), desc: t("landing.features.realtime_desc") },
    { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", title: t("landing.features.momentum_title"), desc: t("landing.features.momentum_desc") },
    { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", title: t("landing.features.multitf_title"), desc: t("landing.features.multitf_desc") },
    { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", title: t("landing.features.scores_title"), desc: t("landing.features.scores_desc") },
    { icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", title: t("landing.features.directions_title"), desc: t("landing.features.directions_desc") },
    { icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", title: t("landing.features.alerts_title"), desc: t("landing.features.alerts_desc") },
  ];

  return (
    <motion.section
      ref={ref}
      id="features"
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={fadeIn}
      className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-28"
    >
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title={t("landing.features.title")}
          subtitle={t("landing.features.subtitle")}
        />

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeUp}
              className="relative group"
            >
              <motion.div
                className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 sm:p-6 h-full transition-all"
                whileHover={{ scale: 1.02, borderColor: "rgba(16,185,129,0.2)" }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                  </svg>
                </div>

                <h3 className="text-base font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}

function ContactSection() {
  const { t } = useI18n();
  return (
    <SectionShell id="contact" className="py-20 sm:py-28">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t("landing.contact.title")}</h2>
          <p className="text-lg text-gray-400 mb-8">{t("landing.contact.subtitle")}</p>
        </motion.div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 sm:p-10 text-left">
          <ContactForm />
        </div>
      </div>
    </SectionShell>
  );
}

export default function LandingPage() {
  return (
    <>
      <SiteNav />
      <main>
        <HeroSection />
        <MarketScannerSection />
        <HowItWorksSection />
        <LivePreviewSection />
        <FeaturesSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
