import { SessionProvider } from "@/components/SessionProvider";
import { Footer } from "@/components/Footer";
import { I18nProvider } from "@/i18n/context";
import { ThemeProvider } from "@/lib/theme";
import "@fontsource/vazirmatn/300.css";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-theme-bg text-theme-text antialiased">
        <ThemeProvider>
          <I18nProvider>
            <SessionProvider>
              {children}
              <Footer />
            </SessionProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
