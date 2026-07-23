import { SessionProvider } from "@/components/SessionProvider";
import { CountdownBridge } from "@/components/CountdownBridge";
import { I18nProvider } from "@/i18n/context";
import { ThemeProvider } from "@/lib/theme";
import { TimeframeProvider } from "@/lib/timeframe";
import { QueryProvider } from "@/components/QueryProvider";
import { ToastContainer } from "@/components/OpportunityToast";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CryptoSense — Smart Crypto Market Analysis",
  description:
    "Professional cryptocurrency analysis platform. Real-time Long/Short signals powered by volume, trend, technicals & sentiment analysis.",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable}`}>
      <body className="min-h-screen bg-theme-bg text-theme-text antialiased">
        <QueryProvider>
          <ThemeProvider>
            <TimeframeProvider>
              <CountdownBridge>
                <I18nProvider>
                  <SessionProvider>
                    {children}
                    <ToastContainer />
                  </SessionProvider>
                </I18nProvider>
              </CountdownBridge>
            </TimeframeProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
